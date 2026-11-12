const { Op } = require("sequelize");
const moment = require("moment");
const models = require("../../models/mysql");
const { obtenerPrecioCorrecto } = require("../../helpers/precio-helper");
const { ESTADOS_ORDEN, getEstadoOrdenId, getEstadoOrdenNombre } = require("../../helpers/estado-orden-helper");
const { registrarCambioEstado, TIPOS_REGISTRO } = require("../../helpers/bitacora-helper");
const { sucursalScope, assertMismaSucursal, esSuperadmin } = require("../../utils/scope");
const { assertInvarianteLotes } = require("../../helpers/stock-helper");
const {
  validarCoherenciaVariante,
  compararClaveStock,
  whereStock,
  bloquearStock,
  validarVariantesSinLock,
  etiquetaDeStock,
  reintentarSiDeadlock,
  obtenerOCrearAlmacenBloqueado,
  advertenciasDeReversa,
  agruparMovimientos,
  errorDeNegocio,
} = require("../../helpers/variante-helper");

// Clave de stock (codigoprod, idvariante) de una línea ya resuelta.
const claveLinea = (l) => ({ codigoprod: l.pp.codigoprod, idvariante: l.idvariante });

/**
 * Helper: include de detalle con presentación
 */
const INCLUDE_DETALLE = () => ({
  model: models.OrdenDetalle,
  as: "Detalles",
  include: [
    {
      association: "ProductoPresentacion",
      include: ["Producto", "Presentacion"],
    },
    {
      // Variante (talla/color) de la línea; null en productos sin variantes.
      association: "Variante",
      attributes: ["idvariante", "sku", "estado"],
      required: false,
      include: [
        { association: "Talla", attributes: ["_id", "nombre", "tipo"], required: false },
        { association: "Color", attributes: ["_id", "nombre", "hex"], required: false },
      ],
    },
  ],
});

/**
 * Listar órdenes/ventas con paginación y búsqueda
 */
const getVentasFtr = async (query, user) => {
  const search = query.search || "";
  const hasPagination = query.page !== undefined || query.limit !== undefined;

  // Alcance por sucursal: no-superadmin solo ve las ventas de su sucursal.
  let where = { ...sucursalScope(user) };

  if (search) {
    const parsedDate = moment(search, "YYYY-MM-DD", true);
    if (parsedDate.isValid()) {
      where[Op.or] = [
        { fecha: { [Op.between]: [parsedDate.startOf("day").toDate(), parsedDate.endOf("day").toDate()] } },
        { "$Cliente.nombres$": { [Op.like]: `%${search}%` } },
      ];
    } else {
      where[Op.or] = [
        { nombre: { [Op.like]: `%${search}%` } },
        { "$Cliente.nombres$": { [Op.like]: `%${search}%` } },
      ];
    }
  }

  const FULL_INCLUDE = [
    { model: models.Cliente, as: "Cliente" },
    { model: models.EstadoOrden, as: "Estado" },
    INCLUDE_DETALLE(),
  ];

  if (!hasPagination) {
    const { count, rows } = await models.Orden.findAndCountAll({
      where,
      include: FULL_INCLUDE,
      order: [["createdAt", "DESC"]],
      distinct: true,
      subQuery: false,
    });
    return { data: rows, meta: { total: count } };
  }

  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 20;

  // Paso 1: resolver qué IDs de orden entran en esta página, SIN el include
  // hasMany (Detalles) de por medio. Con un hasMany en el include, LIMIT se
  // aplica sobre las filas del JOIN (una por cada detalle), no sobre órdenes
  // distintas: una orden con varios ítems "consume" varias posiciones del
  // limit y terminan devolviéndose menos órdenes de las pedidas por página.
  const { count, rows: idRows } = await models.Orden.findAndCountAll({
    where,
    attributes: ["_id"],
    include: [{ model: models.Cliente, as: "Cliente", attributes: [] }],
    order: [["createdAt", "DESC"]],
    distinct: true,
    subQuery: false,
    limit,
    offset: (page - 1) * limit,
  });

  const totalPages = Math.ceil(count / limit);
  if (idRows.length === 0) {
    return { data: [], meta: { total: count, totalPages, currentPage: page, limit } };
  }

  // Paso 2: traer esas órdenes completas (con Detalles) para los IDs de esta página
  const ids = idRows.map((r) => r._id);
  const rows = await models.Orden.findAll({
    where: { _id: { [Op.in]: ids } },
    include: FULL_INCLUDE,
    order: [["createdAt", "DESC"]],
  });

  return { data: rows, meta: { total: count, totalPages, currentPage: page, limit } };
};

/**
 * Obtener venta por ID con detalles, pago(s) y cliente.
 * Incluye tanto el `Pago` singular (compatibilidad con código existente)
 * como el `Pagos` plural (abonos/pagos parciales), y calcula `saldoPendiente`.
 */
const getVentaFtr = async (id, user) => {
  const orden = await models.Orden.findOne({
    where: { _id: id },
    include: [
      { model: models.Cliente, as: "Cliente" },
      { model: models.EstadoOrden, as: "Estado" },
      INCLUDE_DETALLE(),
      { model: models.Pago, as: "Pago" },
      { model: models.Pago, as: "Pagos" },
    ],
  });

  if (!orden) {
    const error = new Error("Venta no encontrada");
    error.status = 404;
    throw error;
  }

  // Alcance por sucursal. `user` solo llega desde el controller (getVentaCtrl);
  // las llamadas internas post-escritura no lo pasan y saltean el chequeo.
  assertMismaSucursal(orden, user);

  const ordenPlain = orden.toJSON();
  const totalPagado = (ordenPlain.Pagos || []).reduce(
    (acc, p) => acc + Number(p.importe || 0),
    0
  );
  ordenPlain.saldoPendiente = Number(ordenPlain.total || 0) - totalPagado;

  return ordenPlain;
};

/**
 * Descuenta stock de Almacen y registra Kardex para un detalle de venta.
 *
 * Si el producto controla vencimiento, consume Lotes en orden FEFO
 * (First-Expired-First-Out) y escribe UN registro de Kardex por lote
 * consumido (con `idlote` seteado). Si no controla vencimiento, escribe
 * un único registro de Kardex (idlote: null), igual que antes.
 *
 * En ambos casos `Almacen.stock` se actualiza UNA sola vez con el total
 * de unidades descontadas — sigue siendo la única fuente de verdad para
 * el stock agregado; los Lotes son solo el desglose de qué lote lo cubrió.
 *
 * La clave de stock es (idsucursal, codigoprod, idvariante): `idvariante` null =
 * producto sin variantes (se consulta con IS NULL, nunca se omite el filtro).
 * Los locks de producto/variante ya los tomó el caller (`bloquearStock`) en el
 * orden del protocolo (ver helpers/variante-helper.js).
 *
 * Reutilizado tanto por `createVentaFtr` (venta confirmada) como por
 * `convertirCotizacionFtr` (cotización que se convierte en venta).
 */
async function _descontarStockYRegistrarKardex({ pp, cantidad, idvariante = null, idsucursal, idusuario, idorden, fecha, transaction }) {
  const unidadesADescontar = Number(cantidad) * Number(pp.cantidad_base);

  // Detalle de error: idvariante/variante solo se agregan para productos con variantes
  // (la forma para productos sin variantes no cambia).
  const detalleError = async (stockActual) => ({
    idprodPresenta: pp.idprodPresenta,
    producto: pp.Producto?.nombre,
    ...(idvariante !== null && {
      idvariante,
      variante: await etiquetaDeStock(pp.Producto?.nombre, idvariante, transaction),
    }),
    stockActual,
    requerido: unidadesADescontar,
  });

  // Lock pesimista (SELECT ... FOR UPDATE): la fila de Almacen queda bloqueada
  // hasta el commit/rollback. Dos ventas simultáneas del mismo producto se
  // serializan acá — la segunda espera y recién entonces lee el stock ya
  // actualizado, así solo una puede vender la última unidad.
  const almacen = await models.Almacen.findOne({
    where: whereStock({ codigoprod: pp.codigoprod, idsucursal, idvariante }),
    lock: transaction.LOCK.UPDATE,
    transaction,
  });

  if (!almacen) {
    const nombreItem = await etiquetaDeStock(pp.Producto?.nombre, idvariante, transaction);
    const error = new Error(`No hay stock registrado para: ${nombreItem} (se necesitan ${unidadesADescontar})`);
    error.status = 409;
    error.code = "STOCK_INSUFICIENTE";
    error.detalles = [await detalleError(0)];
    throw error;
  }

  // Validación de suficiencia BAJO lock. Antes vivía en un loop previo sin lock,
  // lo que dejaba una ventana de carrera entre validar y descontar.
  if (Number(almacen.stock) < unidadesADescontar) {
    // El mensaje lleva los números (no solo el producto) para que cualquier
    // caller que solo lea `message` (Postman, logs, otro cliente) tenga la
    // info completa sin depender de `detalles` — el frontend igual arma su
    // propia redacción a partir de `detalles`, esto es la red de seguridad.
    const nombreItem = await etiquetaDeStock(pp.Producto?.nombre, idvariante, transaction);
    const error = new Error(
      `Stock insuficiente para: ${nombreItem} (hay ${Number(almacen.stock)}, se necesitan ${unidadesADescontar})`
    );
    error.status = 409;
    error.code = "STOCK_INSUFICIENTE";
    error.detalles = [await detalleError(Number(almacen.stock))];
    throw error;
  }

  // stockCorriente se usa solo para el bookkeeping stock_anterior/stock_nuevo del kardex;
  // Almacen.stock se persiste una sola vez al final con el valor final.
  let stockCorriente = Number(almacen.stock);

  if (pp.Producto?.controla_vencimiento) {
    // Sin filtro cantidad_disponible > 0: se traen TODOS los lotes activos para
    // poder verificar la invariante Almacen.stock == suma de lotes. El loop FEFO
    // más abajo ya saltea los que tienen 0 (o menos) con `if (tomar <= 0) continue`.
    const lotes = await models.Lote.findAll({
      where: { ...whereStock({ codigoprod: pp.codigoprod, idsucursal, idvariante }), estado: 1 },
      order: [["fecha_vencimiento", "ASC"]],
      lock: transaction.LOCK.UPDATE,
      transaction,
    });

    // Invariante: para productos con lote, Almacen.stock debe cuadrar con la
    // suma de lotes. Si no, el inventario está roto → abortar (no vender de más).
    assertInvarianteLotes(await etiquetaDeStock(pp.Producto?.nombre, idvariante, transaction), almacen.stock, lotes);

    let remaining = unidadesADescontar;

    for (const lote of lotes) {
      if (remaining <= 0) break;

      const tomar = Math.min(Number(lote.cantidad_disponible), remaining);
      if (tomar <= 0) continue;

      lote.cantidad_disponible = Number(lote.cantidad_disponible) - tomar;
      await lote.save({ transaction });

      const stockNuevo = stockCorriente - tomar;

      await models.Kardex.create(
        {
          codigoprod: pp.codigoprod,
          idsucursal,
          idusuario,
          tipo: "VENTA",
          cantidad: tomar,
          stock_anterior: stockCorriente,
          stock_nuevo: stockNuevo,
          referencia: idorden,
          fecha,
          idlote: lote.idlote,
          idprodPresenta: pp.idprodPresenta,
          idvariante,
        },
        { transaction }
      );

      stockCorriente = stockNuevo;
      remaining -= tomar;
    }

    // Red de seguridad: Almacen y Lotes podrían teóricamente haberse desincronizado.
    if (remaining > 0) {
      const nombreItem = await etiquetaDeStock(pp.Producto?.nombre, idvariante, transaction);
      const error = new Error(
        `Stock insuficiente en lotes para: ${nombreItem} (faltan ${remaining} de ${unidadesADescontar} requeridas)`
      );
      error.status = 409;
      error.code = "STOCK_INSUFICIENTE";
      error.detalles = [await detalleError(unidadesADescontar - remaining)];
      throw error;
    }
  } else {
    const stockNuevo = stockCorriente - unidadesADescontar;

    await models.Kardex.create(
      {
        codigoprod: pp.codigoprod,
        idsucursal,
        idusuario,
        tipo: "VENTA",
        cantidad: unidadesADescontar,
        stock_anterior: stockCorriente,
        stock_nuevo: stockNuevo,
        referencia: idorden,
        fecha,
        idlote: null,
        idprodPresenta: pp.idprodPresenta,
        idvariante,
      },
      { transaction }
    );

    stockCorriente = stockNuevo;
  }

  almacen.stock = stockCorriente;
  await almacen.save({ transaction });
}

/**
 * Crear venta (orden) con detalles.
 *
 * - `esCotizacion: true` → crea una Cotización: NO toca Almacen.stock, NO
 *   crea Kardex, NO consume Lotes, y NO crea Pago (una cotización no tiene
 *   pago todavía).
 * - `esCotizacion: false` (default) → venta confirmada: valida stock,
 *   descuenta Almacen/Lotes, registra Kardex y crea el Pago inicial.
 *
 * El precio SIEMPRE lo resuelve el servidor vía `obtenerPrecioCorrecto`
 * — el `precio` que venga en el body, si viene, se ignora y se sobrescribe.
 *
 * Body esperado:
 * {
 *   nombre, fecha, direccion, idcliente, idusuario, idsucursal,
 *   esCotizacion: boolean,
 *   detalles: [{ idprodPresenta, cantidad, idvariante? }],
 *   pago: { idtipopago, estado }
 * }
 *
 * `idvariante` (talla/color): OBLIGATORIO si el producto tiene_variantes
 * (400 VARIANTE_REQUERIDA), PROHIBIDO si no (400 VARIANTE_NO_PERMITIDA); debe ser
 * una variante activa de ESE producto (400 VARIANTE_INVALIDA). El stock, los
 * lotes, el kardex y el detalle de la orden usan la clave (producto, variante).
 */
const createVentaFtr = (body, user) => reintentarSiDeadlock(() => _createVentaFtr(body, user));

// Un intento = una transacción propia. Si falla por deadlock (1213) / lock timeout (1205) y NO
// llegó a hacer commit, createVentaFtr lo reintenta con una transacción nueva (máx. 2 veces).
const _createVentaFtr = async (body, user) => {
  const transaction = await models.sequelize.transaction();
  let confirmada = false;

  try {
    const { detalles = [], pago = {}, esCotizacion = false, idTipoCliVenta, ...ordenData } = body;

    // Alcance por sucursal: un usuario no-superadmin siempre registra en SU
    // sucursal; el idsucursal que venga en el body se ignora. El superadmin
    // sí puede especificar la sucursal destino en el body.
    const scope = sucursalScope(user);
    if (scope.idsucursal !== undefined) ordenData.idsucursal = scope.idsucursal;

    // Auto-generar referencia si no se envió
    if (!ordenData.referencia) {
      const { generarSiguienteCodigo } = require("../../helpers/generate-code");
      ordenData.referencia = await generarSiguienteCodigo("VENTA");
    }

    // Si no se envía cliente (venta mostrador/anónima), usar el cliente genérico
    // "Consumidor Final" (nit "CF", sembrado en el seed) en vez de rechazar la venta.
    // Es el mismo criterio que usa SAT/Guatemala para ventas al público sin NIT real.
    if (!ordenData.idcliente) {
      const clienteMostrador = await models.Cliente.findOne({ where: { nit: "CF" }, transaction });
      if (!clienteMostrador) {
        const error = new Error(
          'No se encontró el cliente genérico "Consumidor Final" (nit "CF"). Verificá el seed de clientes.'
        );
        error.status = 500;
        error.code = "CLIENTE_MOSTRADOR_NO_CONFIGURADO";
        throw error;
      }
      ordenData.idcliente = clienteMostrador._id;
    }

    // Validar cliente y resolver tipo de cliente UNA sola vez (antes se duplicaba)
    const cliente = await models.Cliente.findByPk(ordenData.idcliente, { transaction });
    if (!cliente) {
      const error = new Error("El cliente no existe");
      error.status = 404;
      throw error;
    }

    // idTipoCliVenta permite fijar el tipo de precio (mayorista/minorista/otro) para
    // ESTA venta puntual, independiente del idtipoCli registrado en el cliente — el
    // POS lo usa para vender "como mayorista" sin obligar a buscar/crear un cliente
    // específico. Si no se envía, se usa el tipo de cliente real (comportamiento actual).
    const idtipoCli = idTipoCliVenta ?? cliente.idtipoCli;

    // Resolver el estado destino por nombre (sin magic numbers)
    const idestado = await getEstadoOrdenId(
      esCotizacion ? ESTADOS_ORDEN.COTIZACION : ESTADOS_ORDEN.CONFIRMADA
    );

    // Resolver presentación + precio correcto para cada detalle (el servidor decide el precio, siempre)
    let total = 0;
    const detallesResueltos = [];
    for (const detalle of detalles) {
      const pp = await models.ProductoPresentacion.findByPk(detalle.idprodPresenta, {
        include: ["Producto"],
        transaction,
      });

      if (!pp) {
        const error = new Error(`Presentación ${detalle.idprodPresenta} no existe`);
        error.status = 404;
        throw error;
      }

      // Variante: coherencia con el producto (REQUERIDA / NO_PERMITIDA) antes de tocar nada.
      // `idvariante` queda normalizado: null (sin variante) o número, nunca undefined.
      const idvariante = validarCoherenciaVariante(pp.Producto, detalle.idvariante);

      // El precio de la variante (si tiene uno propio) pisa al genérico; sin variante => comportamiento de siempre.
      const precioResuelto = await obtenerPrecioCorrecto(detalle.idprodPresenta, idtipoCli, detalle.cantidad, idvariante);
      detalle.precio = precioResuelto.precio;

      total += Number(detalle.cantidad) * Number(detalle.precio);
      detallesResueltos.push({ detalle, pp, idvariante });
    }

    // La validación de stock vive dentro de `_descontarStockYRegistrarKardex`,
    // bajo lock de fila, para no dejar una ventana de carrera entre validar y
    // descontar. Se ordena por (codigoprod, idvariante con NULL primero) para que
    // todas las ventas tomen los locks en el mismo orden y no se produzcan
    // deadlocks entre transacciones.
    detallesResueltos.sort((a, b) => compararClaveStock(claveLinea(a), claveLinea(b)));

    // Locks de producto/variante en el orden del protocolo (helpers/variante-helper.js) y
    // validación de que cada variante exista, sea del producto y esté ACTIVA. Va antes de
    // crear nada. Una cotización no mueve stock: se valida igual, pero sin locks.
    if (esCotizacion) {
      await validarVariantesSinLock(detallesResueltos.map(claveLinea), transaction);
    } else {
      await bloquearStock(detallesResueltos.map(claveLinea), { validar: true, transaction });
    }

    // Crear la orden (cotización o venta confirmada)
    const nuevaOrden = await models.Orden.create(
      {
        ...ordenData,
        total,
        fecha: ordenData.fecha || moment().format('YYYY-MM-DD HH:mm:ss'),
        idestado,
      },
      { transaction }
    );

    await registrarCambioEstado(
      {
        tiporeg: TIPOS_REGISTRO.ORDEN,
        idregistro: nuevaOrden._id,
        estadoAnterior: null,
        estadoNuevo: esCotizacion ? ESTADOS_ORDEN.COTIZACION : ESTADOS_ORDEN.CONFIRMADA,
        codigoemp: ordenData.idusuario,
        accion: esCotizacion ? "Cotización creada" : "Venta creada",
      },
      transaction
    );

    // Crear detalles (siempre); descontar stock/kardex/lotes solo si NO es cotización
    for (const { detalle, pp, idvariante } of detallesResueltos) {
      await models.OrdenDetalle.create(
        {
          cantidad: detalle.cantidad,
          precio: detalle.precio,
          idorden: nuevaOrden._id,
          idprodPresenta: detalle.idprodPresenta,
          idvariante,
        },
        { transaction }
      );

      if (!esCotizacion) {
        await _descontarStockYRegistrarKardex({
          pp,
          cantidad: detalle.cantidad,
          idvariante,
          idsucursal: ordenData.idsucursal,
          idusuario: ordenData.idusuario,
          idorden: nuevaOrden._id,
          fecha: nuevaOrden.fecha,
          transaction,
        });
      }
    }

    // Registrar pago inicial solo si NO es cotización
    if (!esCotizacion) {
      await models.Pago.create(
        {
          estado: pago.estado || "Pendiente",
          importe: total,
          idorden: nuevaOrden._id,
          idtipopago: pago.idtipopago || 3,
          fecha_pago: new Date(),
        },
        { transaction }
      );
    }

    await transaction.commit();
    confirmada = true;

    return getVentaFtr(nuevaOrden._id);

  } catch (error) {
    if (confirmada) error.transaccionConfirmada = true; // nunca reintentar tras el commit
    await transaction.rollback();
    throw error;
  }
};

/**
 * Convierte una Cotización en una venta Confirmada: re-resuelve precios,
 * valida y descuenta stock (misma lógica que createVentaFtr), y actualiza
 * el estado a Confirmada.
 *
 * Decisión: se RE-RESUELVE el precio (no se congela el precio cotizado).
 * El momento que compromete inventario real es el que importa para el
 * negocio — una cotización es indicativa, no vinculante — y los precios o
 * descuentos pueden haber cambiado entre la cotización y la conversión.
 */
const convertirCotizacionFtr = async (id, body = {}, user = null) => {
  const transaction = await models.sequelize.transaction();
  const idusuarioAccion = user?.id ?? null;

  try {
    // Lock de la FILA DE LA ORDEN antes que cualquier lock de stock (orden -> producto S ->
    // variante X -> almacen X -> lote): dos conversiones simultáneas de la misma cotización (o una
    // conversión contra una anulación) se serializan acá, y la segunda relee el estado ya cambiado.
    // Va SOLA (sin include): un FOR UPDATE con JOIN bloquearía también cliente/detalles/producto.
    const ordenBloqueada = await models.Orden.findOne({ where: { _id: id }, lock: transaction.LOCK.UPDATE, transaction });
    if (!ordenBloqueada) {
      const error = new Error("Venta no encontrada");
      error.status = 404;
      throw error;
    }

    const orden = await models.Orden.findOne({
      where: { _id: id },
      include: [
        { model: models.Cliente, as: "Cliente" },
        {
          model: models.OrdenDetalle,
          as: "Detalles",
          include: [{ association: "ProductoPresentacion", include: ["Producto"] }],
        },
      ],
      transaction,
    });

    if (!orden) {
      const error = new Error("Venta no encontrada");
      error.status = 404;
      throw error;
    }

    assertMismaSucursal(orden, user);

    const idCotizacion = await getEstadoOrdenId(ESTADOS_ORDEN.COTIZACION);
    const idConfirmada = await getEstadoOrdenId(ESTADOS_ORDEN.CONFIRMADA);

    if (orden.idestado !== idCotizacion) {
      const error = new Error("Solo se puede convertir una orden en estado Cotización");
      error.status = 409;
      error.code = "ORDEN_NO_ES_COTIZACION";
      throw error;
    }

    const idtipoCli = orden.Cliente?.idtipoCli ?? null;

    // Re-resolver precio de cada detalle (ver nota de decisión arriba)
    let total = 0;
    const detallesResueltos = [];
    for (const detalle of orden.Detalles) {
      const pp = detalle.ProductoPresentacion;

      // La variante vino con el detalle de la cotización (puede ser null en cotizaciones
      // previas a las variantes). Se re-valida: desde la cotización el producto pudo
      // pasar a manejar variantes, o la variante pudo deshabilitarse (conversión = venta
      // NUEVA, exige variante activa).
      const idvariante = validarCoherenciaVariante(pp.Producto, detalle.idvariante);

      // Se re-precia con la variante guardada en el detalle de la cotización (orden_detalle.idvariante).
      const precioResuelto = await obtenerPrecioCorrecto(detalle.idprodPresenta, idtipoCli, detalle.cantidad, idvariante);
      detalle.precio = precioResuelto.precio;
      await detalle.save({ transaction });

      total += Number(detalle.cantidad) * Number(detalle.precio);
      detallesResueltos.push({ detalle, pp, idvariante });
    }

    // Validación de stock: dentro de `_descontarStockYRegistrarKardex`, bajo lock.
    // Orden por (codigoprod, idvariante) para tomar los locks siempre en el mismo orden.
    detallesResueltos.sort((a, b) => compararClaveStock(claveLinea(a), claveLinea(b)));
    await bloquearStock(detallesResueltos.map(claveLinea), { validar: true, transaction });

    // Descontar stock + kardex + lotes (misma lógica que una venta confirmada)
    for (const { detalle, pp, idvariante } of detallesResueltos) {
      await _descontarStockYRegistrarKardex({
        pp,
        cantidad: detalle.cantidad,
        idvariante,
        idsucursal: orden.idsucursal,
        idusuario: orden.idusuario,
        idorden: orden._id,
        fecha: new Date(),
        transaction,
      });
    }

    // fecha_conversion marca que esta orden pasó por Cotización — habilita
    // la acción "marcar entregada" en el frontend, que no aplica a una venta
    // creada directo (POS), porque ahí el despacho ya fue inmediato.
    await orden.update({ idestado: idConfirmada, total, fecha_conversion: new Date() }, { transaction });

    await registrarCambioEstado(
      {
        tiporeg: TIPOS_REGISTRO.ORDEN,
        idregistro: orden._id,
        estadoAnterior: ESTADOS_ORDEN.COTIZACION,
        estadoNuevo: ESTADOS_ORDEN.CONFIRMADA,
        codigoemp: idusuarioAccion ?? orden.idusuario,
        accion: "Cotización convertida a venta",
      },
      transaction
    );

    if (body.pago) {
      await models.Pago.create(
        {
          estado: body.pago.estado || "Pendiente",
          importe: body.pago.importe ?? total,
          idorden: orden._id,
          idtipopago: body.pago.idtipopago || 3,
          fecha_pago: new Date(),
        },
        { transaction }
      );
    }

    await transaction.commit();

    return getVentaFtr(orden._id);

  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * Actualizar encabezado de orden (sin modificar detalles ni stock)
 */
const updateVentaFtr = async (id, body, user) => {
  const transaction = await models.sequelize.transaction();
  try {
    // Fila bloqueada (FOR UPDATE): el chequeo de idestado de abajo se hace contra el estado
    // vigente, no contra uno que una anulación/conversión concurrente ya cambió.
    const orden = await models.Orden.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!orden) {
      const error = new Error("Venta no encontrada");
      error.status = 404;
      throw error;
    }

    assertMismaSucursal(orden, user);
    // Nadie salvo superadmin puede mover una venta de sucursal.
    if (!esSuperadmin(user)) delete body.idsucursal;

    // idestado: cambiar el estado por acá se saltea la lógica de stock (Cotización->Confirmada
    // no descuenta, Confirmada->Anulada/Cotización no reversa, Anulada->Confirmada no vuelve a
    // descontar). Solo Confirmada <-> Entregada es neutro para el stock. El resto va por sus
    // endpoints (POST /:id/convertir, DELETE /:id). Enviar el MISMO idestado es un no-op válido
    // (el front suele reenviar el objeto completo) y se descarta para no pisar el estado.
    if (body.idestado !== undefined) {
      if (Number(body.idestado) === Number(orden.idestado)) {
        delete body.idestado;
      } else {
        const idConfirmada = await getEstadoOrdenId(ESTADOS_ORDEN.CONFIRMADA);
        const idEntregada = await getEstadoOrdenId(ESTADOS_ORDEN.ENTREGADA);
        const neutros = [Number(idConfirmada), Number(idEntregada)];
        if (!neutros.includes(Number(orden.idestado)) || !neutros.includes(Number(body.idestado))) {
          throw errorDeNegocio(
            400,
            "El estado de una venta no se puede cambiar por este endpoint (afecta el stock): " +
              "use POST /ventas/:id/convertir para convertir una cotización o POST /ventas/anular/:id para anular",
            "ESTADO_NO_EDITABLE_POR_UPDATE",
          );
        }
      }
    }

    await orden.update(body, { transaction });
    await transaction.commit();
    return getVentaFtr(id);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * Anular venta.
 *
 * - Si la orden está en Cotización, se anula SIN reversar stock (una
 *   cotización nunca lo tocó).
 * - Si la orden es una venta confirmada/entregada, se reversa leyendo los
 *   registros de Kardex reales que la venta generó (tipo VENTA, referencia
 *   = id de la orden) — esto garantiza reversar exactamente lo que se tomó,
 *   y de exactamente qué lotes salió.
 */
const deleteVentaFtr = async (id, user = null) => {
  const transaction = await models.sequelize.transaction();
  const idusuarioAccion = user?.id ?? null;

  try {
    // Fila de la orden BLOQUEADA antes de cualquier lock de stock (orden -> producto S -> variante X
    // -> almacen X -> lote): dos anulaciones simultáneas se serializan acá y la segunda ve el
    // estado Anulada y falla ("La venta ya está anulada"), en vez de reversar el stock dos veces.
    const orden = await models.Orden.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!orden) throw new Error("Venta no encontrada");

    assertMismaSucursal(orden, user);

    const idAnulada = await getEstadoOrdenId(ESTADOS_ORDEN.ANULADA);
    const idCotizacion = await getEstadoOrdenId(ESTADOS_ORDEN.COTIZACION);

    if (orden.idestado === idAnulada) {
      throw new Error("La venta ya está anulada");
    }

    // Nombre del estado actual (Cotizacion/Confirmada/Entregada) ANTES de
    // sobreescribirlo — lo necesitamos para el estado_anterior de la bitácora.
    const nombreEstadoActual = await getEstadoOrdenNombre(orden.idestado);

    if (orden.idestado === idCotizacion) {
      // Una cotización nunca tocó el inventario: anular sin reversar stock
      await orden.update({ idestado: idAnulada }, { transaction });
      await registrarCambioEstado(
        {
          tiporeg: TIPOS_REGISTRO.ORDEN,
          idregistro: orden._id,
          estadoAnterior: nombreEstadoActual,
          estadoNuevo: ESTADOS_ORDEN.ANULADA,
          codigoemp: idusuarioAccion ?? orden.idusuario,
          accion: "Cotización anulada",
        },
        transaction
      );
      await transaction.commit();
      return true;
    }

    const kardexVenta = await models.Kardex.findAll({
      where: { referencia: id, tipo: "VENTA" },
      transaction,
    });

    // Orden determinista (codigoprod, idvariante con NULL primero) y locks de
    // producto/variante primero (protocolo de helpers/variante-helper.js). Reversar NO
    // exige variante activa: una venta ya registrada se puede anular aunque su variante
    // se haya deshabilitado después (la clave sale del idvariante guardado en el Kardex).
    kardexVenta.sort(compararClaveStock);
    const locks = {};
    await bloquearStock(kardexVenta, { validar: false, transaction, detalle: locks });
    const movimientos = [];

    for (const k of kardexVenta) {
      // Insert-primero + lock (mismo helper que las compras): si la fila de Almacen no existiera
      // (borrada/nunca creada) NO se aborta con un TypeError: el kardex prueba que ese stock existió,
      // así que se crea en 0 y se le restituye lo vendido. Con la fila existente el INSERT es un no-op.
      const { almacen } = await obtenerOCrearAlmacenBloqueado({
        codigoprod: k.codigoprod,
        idsucursal: k.idsucursal,
        idvariante: k.idvariante,
        valoresNuevos: { stock: 0, stock_minimo: 0, fecha: new Date() },
        transaction,
      });

      const stockAnterior = Number(almacen.stock);
      const stockNuevo = stockAnterior + Number(k.cantidad);
      movimientos.push({ codigoprod: k.codigoprod, idvariante: k.idvariante ?? null, cantidad: k.cantidad, stockFinal: stockNuevo });

      almacen.stock = stockNuevo;
      await almacen.save({ transaction });

      if (k.idlote) {
        const lote = await models.Lote.findByPk(k.idlote, { lock: transaction.LOCK.UPDATE, transaction });
        if (lote) {
          lote.cantidad_disponible = Number(lote.cantidad_disponible) + Number(k.cantidad);
          await lote.save({ transaction });
        }
      }

      // KARDEX REVERSA
      await models.Kardex.create(
        {
          codigoprod: k.codigoprod,
          idsucursal: k.idsucursal,
          idusuario: orden.idusuario,
          tipo: "ANULACION_VENTA",
          cantidad: k.cantidad,
          stock_anterior: stockAnterior,
          stock_nuevo: stockNuevo,
          referencia: id,
          fecha: new Date(),
          idlote: k.idlote,
          idprodPresenta: k.idprodPresenta,
          idvariante: k.idvariante ?? null,
        },
        { transaction }
      );
    }

    await orden.update({ idestado: idAnulada }, { transaction });

    await registrarCambioEstado(
      {
        tiporeg: TIPOS_REGISTRO.ORDEN,
        idregistro: orden._id,
        estadoAnterior: nombreEstadoActual,
        estadoNuevo: ESTADOS_ORDEN.ANULADA,
        codigoemp: idusuarioAccion ?? orden.idusuario,
        accion: "Venta anulada",
      },
      transaction
    );

    // Advertencias (aditivas): la reversa siempre se permite, pero si el stock restituido cae en una
    // clave que ya no es vendible se avisa. Se evalúa con lo leído bajo los locks de arriba.
    const advertencias = advertenciasDeReversa(agruparMovimientos(movimientos), locks, "restituyeron");

    await transaction.commit();
    return advertencias.length ? { advertencias } : true;

  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * Marca una venta Confirmada como Entregada. Solo tiene sentido para órdenes
 * que pasaron por Cotización (tienen fecha_conversion) — una venta creada
 * directo (POS) ya fue despachada en el momento de la creación, así que el
 * frontend no ofrece esta acción para esas, pero el backend no lo bloquea:
 * es una decisión de UI, no una regla de negocio dura.
 */
const marcarEntregadaFtr = async (id, user = null) => {
  const transaction = await models.sequelize.transaction();
  const idusuarioAccion = user?.id ?? null;
  try {
    // Fila bloqueada (FOR UPDATE): serializa contra anular/convertir, que ya la bloquean.
    // Sin lock, una anulación concurrente podía ser pisada con Entregada y reversar dos veces.
    const orden = await models.Orden.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!orden) {
      const error = new Error("Venta no encontrada");
      error.status = 404;
      throw error;
    }

    assertMismaSucursal(orden, user);

    const idConfirmada = await getEstadoOrdenId(ESTADOS_ORDEN.CONFIRMADA);
    if (orden.idestado !== idConfirmada) {
      const error = new Error("Solo se puede marcar como entregada una venta Confirmada");
      error.status = 409;
      error.code = "ORDEN_NO_ES_CONFIRMADA";
      throw error;
    }

    const idEntregada = await getEstadoOrdenId(ESTADOS_ORDEN.ENTREGADA);
    await orden.update({ idestado: idEntregada }, { transaction });

    await registrarCambioEstado(
      {
        tiporeg: TIPOS_REGISTRO.ORDEN,
        idregistro: orden._id,
        estadoAnterior: ESTADOS_ORDEN.CONFIRMADA,
        estadoNuevo: ESTADOS_ORDEN.ENTREGADA,
        codigoemp: idusuarioAccion ?? orden.idusuario,
        accion: "Venta marcada como entregada",
      },
      transaction
    );

    await transaction.commit();
    return getVentaFtr(id);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * Registrar un pago (abono) sobre una venta existente. Soporta pagos
 * parciales — la orden puede tener múltiples registros de Pago; el saldo
 * pendiente (cuentas por cobrar) se deriva sumándolos en `getVentaFtr`.
 */
const registrarPagoFtr = async (idorden, body = {}, user = null) => {
  const transaction = await models.sequelize.transaction();
  try {
    const orden = await models.Orden.findByPk(idorden, { transaction });
    if (!orden) {
      const error = new Error("Venta no encontrada");
      error.status = 404;
      throw error;
    }

    assertMismaSucursal(orden, user);

    const pago = await models.Pago.create(
      {
        idorden,
        importe: body.importe,
        idtipopago: body.idtipopago,
        estado: body.estado || "Pendiente",
        fecha_pago: body.fecha_pago || new Date(),
      },
      { transaction }
    );

    await transaction.commit();
    return pago;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * Obtener el siguiente código de venta disponible
 */
const nextCodeFtr = async () => {
  const { generarSiguienteCodigo } = require("../../helpers/generate-code");
  return { codigo: await generarSiguienteCodigo("VENTA") };
};

module.exports = {
  getVentasFtr,
  getVentaFtr,
  createVentaFtr,
  convertirCotizacionFtr,
  updateVentaFtr,
  deleteVentaFtr,
  marcarEntregadaFtr,
  registrarPagoFtr,
  nextCodeFtr,
};
