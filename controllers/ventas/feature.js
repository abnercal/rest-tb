const { Op } = require("sequelize");
const moment = require("moment");
const models = require("../../models/mysql");
const { obtenerPrecioCorrecto } = require("../../helpers/precio-helper");
const { ESTADOS_ORDEN, getEstadoOrdenId, getEstadoOrdenNombre } = require("../../helpers/estado-orden-helper");
const { registrarCambioEstado, TIPOS_REGISTRO } = require("../../helpers/bitacora-helper");

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
  ],
});

/**
 * Listar órdenes/ventas con paginación y búsqueda
 */
const getVentasFtr = async (query) => {
  const search = query.search || "";
  const hasPagination = query.page !== undefined || query.limit !== undefined;

  let where = {};

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
const getVentaFtr = async (id) => {
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
 * Reutilizado tanto por `createVentaFtr` (venta confirmada) como por
 * `convertirCotizacionFtr` (cotización que se convierte en venta).
 */
async function _descontarStockYRegistrarKardex({ pp, cantidad, idsucursal, idusuario, idorden, fecha, transaction }) {
  const unidadesADescontar = Number(cantidad) * Number(pp.cantidad_base);

  const almacen = await models.Almacen.findOne({
    where: { codigoprod: pp.codigoprod, idsucursal },
    transaction,
  });

  if (!almacen) {
    const error = new Error(`No hay stock registrado para: ${pp.Producto?.nombre}`);
    error.status = 409;
    error.code = "STOCK_INSUFICIENTE";
    throw error;
  }

  // stockCorriente se usa solo para el bookkeeping stock_anterior/stock_nuevo del kardex;
  // Almacen.stock se persiste una sola vez al final con el valor final.
  let stockCorriente = Number(almacen.stock);

  if (pp.Producto?.controla_vencimiento) {
    const lotes = await models.Lote.findAll({
      where: {
        codigoprod: pp.codigoprod,
        idsucursal,
        estado: 1,
        cantidad_disponible: { [Op.gt]: 0 },
      },
      order: [["fecha_vencimiento", "ASC"]],
      transaction,
    });

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
        },
        { transaction }
      );

      stockCorriente = stockNuevo;
      remaining -= tomar;
    }

    // Red de seguridad: Almacen y Lotes podrían teóricamente haberse desincronizado.
    if (remaining > 0) {
      const error = new Error(`Stock insuficiente en lotes para: ${pp.Producto?.nombre}`);
      error.status = 409;
      error.code = "STOCK_INSUFICIENTE";
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
 *   detalles: [{ idprodPresenta, cantidad }],
 *   pago: { idtipopago, estado }
 * }
 */
const createVentaFtr = async (body) => {
  const transaction = await models.sequelize.transaction();

  try {
    const { detalles = [], pago = {}, esCotizacion = false, idTipoCliVenta, ...ordenData } = body;

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

      const precioResuelto = await obtenerPrecioCorrecto(detalle.idprodPresenta, idtipoCli, detalle.cantidad);
      detalle.precio = precioResuelto.precio;

      total += Number(detalle.cantidad) * Number(detalle.precio);
      detallesResueltos.push({ detalle, pp });
    }

    // Validar stock solo si NO es cotización — una cotización no compromete inventario
    if (!esCotizacion) {
      for (const { detalle, pp } of detallesResueltos) {
        const unidadesADescontar = Number(detalle.cantidad) * Number(pp.cantidad_base);

        const almacen = await models.Almacen.findOne({
          where: { codigoprod: pp.codigoprod, idsucursal: ordenData.idsucursal },
          transaction,
        });

        if (!almacen || Number(almacen.stock) < unidadesADescontar) {
          const error = new Error(`Stock insuficiente para: ${pp.Producto?.nombre}`);
          error.status = 409;
          error.code = "STOCK_INSUFICIENTE";
          error.detalles = [{
            idprodPresenta: detalle.idprodPresenta,
            producto: pp.Producto?.nombre,
            stockActual: Number(almacen?.stock || 0),
            requerido: unidadesADescontar
          }];
          throw error;
        }
      }
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
    for (const { detalle, pp } of detallesResueltos) {
      await models.OrdenDetalle.create(
        {
          cantidad: detalle.cantidad,
          precio: detalle.precio,
          idorden: nuevaOrden._id,
          idprodPresenta: detalle.idprodPresenta,
        },
        { transaction }
      );

      if (!esCotizacion) {
        await _descontarStockYRegistrarKardex({
          pp,
          cantidad: detalle.cantidad,
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

    return getVentaFtr(nuevaOrden._id);

  } catch (error) {
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
const convertirCotizacionFtr = async (id, body = {}, idusuarioAccion = null) => {
  const transaction = await models.sequelize.transaction();

  try {
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

      const precioResuelto = await obtenerPrecioCorrecto(detalle.idprodPresenta, idtipoCli, detalle.cantidad);
      detalle.precio = precioResuelto.precio;
      await detalle.save({ transaction });

      total += Number(detalle.cantidad) * Number(detalle.precio);
      detallesResueltos.push({ detalle, pp });
    }

    // Validar stock (misma regla que createVentaFtr)
    for (const { detalle, pp } of detallesResueltos) {
      const unidadesADescontar = Number(detalle.cantidad) * Number(pp.cantidad_base);

      const almacen = await models.Almacen.findOne({
        where: { codigoprod: pp.codigoprod, idsucursal: orden.idsucursal },
        transaction,
      });

      if (!almacen || Number(almacen.stock) < unidadesADescontar) {
        const error = new Error(`Stock insuficiente para: ${pp.Producto?.nombre}`);
        error.status = 409;
        error.code = "STOCK_INSUFICIENTE";
        error.detalles = [{
          idprodPresenta: detalle.idprodPresenta,
          producto: pp.Producto?.nombre,
          stockActual: Number(almacen?.stock || 0),
          requerido: unidadesADescontar
        }];
        throw error;
      }
    }

    // Descontar stock + kardex + lotes (misma lógica que una venta confirmada)
    for (const { detalle, pp } of detallesResueltos) {
      await _descontarStockYRegistrarKardex({
        pp,
        cantidad: detalle.cantidad,
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
const updateVentaFtr = async (id, body) => {
  const transaction = await models.sequelize.transaction();
  try {
    const orden = await models.Orden.findByPk(id);
    if (!orden) {
      const error = new Error("Venta no encontrada");
      error.status = 404;
      throw error;
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
const deleteVentaFtr = async (id, idusuarioAccion = null) => {
  const transaction = await models.sequelize.transaction();

  try {
    const orden = await models.Orden.findByPk(id, { transaction });
    if (!orden) throw new Error("Venta no encontrada");

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

    for (const k of kardexVenta) {
      const almacen = await models.Almacen.findOne({
        where: { codigoprod: k.codigoprod, idsucursal: k.idsucursal },
        transaction,
      });

      const stockAnterior = Number(almacen.stock);
      const stockNuevo = stockAnterior + Number(k.cantidad);

      almacen.stock = stockNuevo;
      await almacen.save({ transaction });

      if (k.idlote) {
        const lote = await models.Lote.findByPk(k.idlote, { transaction });
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

    await transaction.commit();
    return true;

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
const marcarEntregadaFtr = async (id, idusuarioAccion = null) => {
  const transaction = await models.sequelize.transaction();
  try {
    const orden = await models.Orden.findByPk(id, { transaction });
    if (!orden) {
      const error = new Error("Venta no encontrada");
      error.status = 404;
      throw error;
    }

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
const registrarPagoFtr = async (idorden, body = {}) => {
  const transaction = await models.sequelize.transaction();
  try {
    const orden = await models.Orden.findByPk(idorden, { transaction });
    if (!orden) {
      const error = new Error("Venta no encontrada");
      error.status = 404;
      throw error;
    }

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
