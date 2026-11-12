const { Op } = require("sequelize");
const moment = require("moment");
const models = require("../../models/mysql");
const { registrarCambioEstado, TIPOS_REGISTRO } = require("../../helpers/bitacora-helper");
const {
  validarCoherenciaVariante,
  compararClaveStock,
  whereStock,
  bloquearStock,
  obtenerOCrearAlmacenBloqueado,
  reintentarSiDeadlock,
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
  model: models.CompraDetalle,
  as: "Detalles",
  include: [
    {
      association: "ProductoPresentacion",
      include: ["Producto", "Presentacion"],
    },
  ],
});

/**
 * Listar compras con paginación y búsqueda por fecha o proveedor
 */
const getComprasFtr = async (query) => {
  const search = query.search || "";
  const hasPagination = query.page !== undefined || query.limit !== undefined;

  let where = { estado: true };

  if (search) {
    const parsedDate = moment(search, "YYYY-MM-DD", true);
    if (parsedDate.isValid()) {
      where[Op.or] = [
        { fecha: { [Op.between]: [parsedDate.startOf("day").toDate(), parsedDate.endOf("day").toDate()] } },
        { "$Proveedor.nombre$": { [Op.like]: `%${search}%` } },
      ];
    } else {
      where[Op.or] = [
        { nombre: { [Op.like]: `%${search}%` } },
        { "$Proveedor.nombre$": { [Op.like]: `%${search}%` } },
      ];
    }
  }

  const FULL_INCLUDE = ["Proveedor", "Sucursal", "Usuario", INCLUDE_DETALLE()];

  if (!hasPagination) {
    const { count, rows } = await models.Compra.findAndCountAll({
      where,
      include: FULL_INCLUDE,
      order: [["createdAt", "DESC"]],
      distinct: true,
      subQuery: false,
    });
    return { data: rows, meta: { total: count } };
  }

  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 10;

  // Paso 1: resolver qué IDs de compra entran en esta página, SIN el include
  // hasMany (Detalles) de por medio. Con un hasMany en el include, LIMIT se
  // aplica sobre las filas del JOIN (una por cada detalle), no sobre compras
  // distintas: una compra con varios ítems "consume" varias posiciones del
  // limit y terminan devolviéndose menos compras de las pedidas por página.
  const { count, rows: idRows } = await models.Compra.findAndCountAll({
    where,
    attributes: ["_id"],
    include: [{ model: models.Proveedor, as: "Proveedor", attributes: [] }],
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

  // Paso 2: traer esas compras completas (con Detalles) para los IDs de esta página
  const ids = idRows.map((r) => r._id);
  const rows = await models.Compra.findAll({
    where: { _id: { [Op.in]: ids } },
    include: FULL_INCLUDE,
    order: [["createdAt", "DESC"]],
  });

  return { data: rows, meta: { total: count, totalPages, currentPage: page, limit } };
};

/**
 * Obtener compra por ID con detalles y pago(s). Calcula `saldoPendiente`
 * (cuentas por pagar) sumando los PagoCompra existentes.
 */
const getCompraFtr = async (id) => {
  const compra = await models.Compra.findOne({
    where: { _id: id },
    include: [
      { model: models.Proveedor, as: "Proveedor" },
      { model: models.Sucursal, as: "Sucursal" },
      { model: models.Usuario, as: "Usuario", attributes: { exclude: ["password"] } },
      INCLUDE_DETALLE(),
      { model: models.PagoCompra, as: "Pagos" },
    ],
  });

  if (!compra) {
    const error = new Error("Compra no encontrada");
    error.status = 404;
    throw error;
  }

  const compraPlain = compra.toJSON();
  const totalPagado = (compraPlain.Pagos || []).reduce(
    (acc, p) => acc + Number(p.importe || 0),
    0
  );
  compraPlain.saldoPendiente = Number(compraPlain.total || 0) - totalPagado;

  return compraPlain;
};

/**
 * Crear compra + detalles + actualizar stock en almacén (+ Lote si el
 * producto controla vencimiento) + registrar pago inicial de la compra.
 * Body esperado:
 * {
 *   nombre, fecha, direccion, idproveedor, idusuario, idsucursal,
 *   detalles: [{ idprodPresenta, cantidad, costo, fecha_vencimiento?, idvariante? }],
 *   pago: { idtipopago, estado }
 * }
 *
 * `idvariante` (talla/color): OBLIGATORIO si el producto tiene_variantes
 * (400 VARIANTE_REQUERIDA), PROHIBIDO si no (400 VARIANTE_NO_PERMITIDA); debe ser
 * una variante ACTIVA de ESE producto (400 VARIANTE_INVALIDA). El detalle, el lote,
 * el stock (Almacen) y el kardex llevan la variante.
 */
const createCompraFtr = (body) => reintentarSiDeadlock(() => _createCompraFtr(body));

// Un intento = una transacción propia. Si falla por deadlock (1213) / lock timeout (1205) y NO
// llegó a hacer commit, createCompraFtr lo reintenta con una transacción nueva (máx. 2 veces).
const _createCompraFtr = async (body) => {
  const transaction = await models.sequelize.transaction();
  let confirmada = false;

  try {
    const { detalles = [], ...compraData } = body;

    // Auto-generar código si no se envió nombre
    if (!compraData.nombre) {
      const { generarSiguienteCodigo } = require("../../helpers/generate-code");
      compraData.nombre = await generarSiguienteCodigo("COMPRA");
    }

    // ✅ VALIDACIONES
    if (!compraData.idsucursal) {
      throw new Error("La compra debe tener una sucursal");
    }

    if (!compraData.idusuario) {
      throw new Error("La compra debe tener un usuario");
    }

    if (!detalles.length) {
      throw new Error("La compra debe tener al menos un detalle");
    }

    for (const d of detalles) {
      if (!d.idprodPresenta || !d.cantidad || !d.costo) {
        throw new Error("Detalle incompleto");
      }
    }

    // ✅ Calcular total en backend
    const totalCalculado = detalles.reduce((acc, d) => {
      return acc + (Number(d.cantidad) * Number(d.costo));
    }, 0);

    compraData.total = totalCalculado;
    // Una compra nueva siempre nace activa: con estado=false movería stock pero no se podría anular.
    delete compraData.estado;

    // ✅ Crear compra
    const compra = await models.Compra.create(compraData, { transaction });

    await registrarCambioEstado(
      {
        tiporeg: TIPOS_REGISTRO.COMPRA,
        idregistro: compra._id,
        estadoAnterior: null,
        estadoNuevo: "Activa",
        codigoemp: compraData.idusuario,
        accion: "Compra creada",
      },
      transaction
    );

    // Paso 1: resolver la presentación de cada detalle y validar, SIN mutar nada.
    const detallesResueltos = [];
    for (const detalle of detalles) {
      const pp = await models.ProductoPresentacion.findByPk(detalle.idprodPresenta, {
        include: ["Producto"],
        transaction,
      });

      if (!pp) {
        throw new Error(`Presentación ${detalle.idprodPresenta} no existe`);
      }

      const controlaVencimiento = !!pp.Producto?.controla_vencimiento;

      if (controlaVencimiento && !detalle.fecha_vencimiento) {
        const error = new Error(
          `El producto "${pp.Producto?.nombre}" controla vencimiento: fecha_vencimiento es obligatoria`
        );
        error.status = 400;
        error.code = "FECHA_VENCIMIENTO_REQUERIDA";
        throw error;
      }

      // Variante: coherencia con el producto (REQUERIDA / NO_PERMITIDA). `idvariante`
      // queda normalizado: null (sin variante) o número, nunca undefined.
      const idvariante = validarCoherenciaVariante(pp.Producto, detalle.idvariante);

      detallesResueltos.push({ detalle, pp, controlaVencimiento, idvariante });
    }

    // Orden estable por (codigoprod, idvariante con NULL primero): todas las
    // compras/ventas toman los locks en el mismo orden y no se producen deadlocks
    // entre transacciones.
    detallesResueltos.sort((a, b) => compararClaveStock(claveLinea(a), claveLinea(b)));

    // Locks de producto (compartido) y de variante (exclusivo) ANTES de agregar stock, y
    // validación con datos frescos de que la variante exista, sea del producto y esté
    // ACTIVA. Es lo que cierra la carrera con "deshabilitar variante / cambiar
    // tiene_variantes / eliminar producto" (controllers/productos/feature.js): esas
    // operaciones toman el lock exclusivo del producto, así que o esperan a que esta
    // compra termine (y entonces ven el stock nuevo y responden 409) o esta compra espera
    // a que terminen (y entonces ve la variante ya deshabilitada y responde 400).
    await bloquearStock(detallesResueltos.map(claveLinea), { validar: true, transaction });

    // Paso 2: crear detalles + Lote (si aplica) + actualizar stock + kardex
    for (const { detalle, pp, controlaVencimiento, idvariante } of detallesResueltos) {
      const compraDetalle = await models.CompraDetalle.create(
        {
          cantidad: detalle.cantidad,
          costo: detalle.costo,
          idcompra: compra._id,
          idprodPresenta: detalle.idprodPresenta,
          idvariante,
        },
        { transaction }
      );

      const unidadesBase = Number(detalle.cantidad) * Number(pp.cantidad_base);

      // Lote opt-in por producto (controla_vencimiento)
      let idlote = null;
      if (controlaVencimiento) {
        const lote = await models.Lote.create(
          {
            codigoprod: pp.codigoprod,
            idsucursal: compra.idsucursal,
            idcompra_detalle: compraDetalle._id,
            cantidad_inicial: unidadesBase,
            cantidad_disponible: unidadesBase,
            fecha_ingreso: new Date(),
            fecha_vencimiento: detalle.fecha_vencimiento,
            estado: 1,
            idvariante,
          },
          { transaction }
        );
        idlote = lote.idlote;
      }

      // Lock pesimista sobre la fila de Almacen de la clave (sucursal, producto, variante)
      // (misma protección que en ventas): serializa el read-modify-write del stock contra
      // ventas/compras concurrentes. Si la fila aún no existe se crea; si otra transacción
      // la crea justo antes (UNIQUE sobre idvariante_key), se vuelve a leer con lock.
      const { almacen, creado } = await obtenerOCrearAlmacenBloqueado({
        codigoprod: pp.codigoprod,
        idsucursal: compra.idsucursal,
        idvariante,
        valoresNuevos: {
          stock: unidadesBase,
          stock_minimo: Number(pp.Producto?.stock_minimo) || 0,
          fecha: new Date(),
        },
        transaction,
      });

      let stockAnterior = 0;
      let stockNuevo = unidadesBase;

      if (!creado) {
        stockAnterior = Number(almacen.stock);
        stockNuevo = stockAnterior + unidadesBase;

        almacen.stock = stockNuevo;
        await almacen.save({ transaction });
      }

      // REGISTRO EN KARDEX
      await models.Kardex.create(
        {
          codigoprod: pp.codigoprod,
          idsucursal: compra.idsucursal,
          idusuario: compra.idusuario,
          tipo: "COMPRA",
          cantidad: unidadesBase,
          stock_anterior: stockAnterior,
          stock_nuevo: stockNuevo,
          referencia: compra._id,
          fecha: new Date(),
          idlote,
          idprodPresenta: detalle.idprodPresenta,
          idvariante,
        },
        { transaction }
      );
    }

    // Registrar pago inicial de la compra (mirror del Pago automático en ventas)
    await models.PagoCompra.create(
      {
        idcompra: compra._id,
        importe: totalCalculado,
        idtipopago: body.pago?.idtipopago || 3,
        estado: body.pago?.estado || "Pendiente",
        fecha_pago: new Date(),
      },
      { transaction }
    );

    await transaction.commit();
    confirmada = true;

    return getCompraFtr(compra._id);

  } catch (error) {
    if (confirmada) error.transaccionConfirmada = true; // nunca reintentar tras el commit
    await transaction.rollback();
    throw error;
  }
};

/**
 * Actualizar encabezado de compra (sin modificar detalles ni stock)
 */
const updateCompraFtr = async (id, body) => {
  const transaction = await models.sequelize.transaction();
  try {
    // Fila bloqueada (FOR UPDATE): el chequeo de "estado" de abajo se hace contra el estado vigente.
    const compra = await models.Compra.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!compra) {
      const error = new Error("Compra no encontrada");
      error.status = 404;
      throw error;
    }

    // estado: poner false equivale a anular SIN reversar el stock, y poner true sobre una compra
    // anulada la "revive" SIN volver a sumarlo: ambos rompen el stock. La anulación va por
    // DELETE /compras/:id. Enviar el MISMO estado es un no-op válido (el front reenvía el objeto
    // completo) y se descarta para no pisar el estado.
    if (body.estado !== undefined) {
      const TRUE = [true, 1, "true", "1", "yes"];
      const FALSE = [false, 0, "false", "0", "no"];
      const pedido = TRUE.includes(body.estado) ? true : FALSE.includes(body.estado) ? false : null;
      if (pedido !== null && pedido === Boolean(compra.estado)) {
        delete body.estado;
      } else {
        throw errorDeNegocio(
          400,
          "El estado de una compra no se puede cambiar por este endpoint (afecta el stock): use POST /compras/anular/:id para anularla",
          "ESTADO_NO_EDITABLE_POR_UPDATE",
        );
      }
    }

    // La sucursal y el total quedan fijos desde la creación: la anulación reversa el stock
    // en compra.idsucursal, así que moverla dejaría el stock en una sucursal y reversarlo en otra.
    delete body.idsucursal;
    delete body.total;

    await compra.update(body, { transaction });
    await transaction.commit();
    return getCompraFtr(id);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * Anular compra: reversa de stock y, si el detalle generó un Lote, revierte
 * también `cantidad_disponible` de ese Lote — a menos que ya haya sido
 * parcialmente consumido por una venta, en cuyo caso no se puede anular.
 */
const deleteCompraFtr = async (id, idusuarioAccion = null) => {
  const transaction = await models.sequelize.transaction();

  try {
    // Fila de la compra BLOQUEADA (y dentro de la transacción) antes de cualquier lock de stock
    // (compra -> producto S -> variante X -> almacen X -> lote): dos anulaciones simultáneas se
    // serializan acá y la segunda ve estado=false y falla, en vez de reversar el stock dos veces.
    const compra = await models.Compra.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });

    if (!compra) {
      throw new Error("Compra no encontrada");
    }

    if (!compra.estado) {
      throw new Error("La compra ya está anulada");
    }

    const detalles = await models.CompraDetalle.findAll({
      where: { idcompra: id },
      transaction,
    });

    // Resolver la presentación de cada detalle y ordenar por codigoprod, para
    // tomar los locks de Lote/Almacen en el mismo orden que el resto de
    // transacciones y no producir deadlocks.
    const detallesResueltos = [];
    for (const detalle of detalles) {
      const pp = await models.ProductoPresentacion.findByPk(detalle.idprodPresenta, {
        transaction,
      });
      // La variante sale del detalle guardado (no del request): se reversa exactamente
      // la clave de stock que la compra afectó.
      detallesResueltos.push({ detalle, pp, idvariante: detalle.idvariante ?? null });
    }
    detallesResueltos.sort((a, b) => compararClaveStock(claveLinea(a), claveLinea(b)));

    // Locks de producto/variante primero (protocolo de helpers/variante-helper.js).
    // Reversar NO exige variante activa: una compra ya registrada se puede anular aunque
    // su variante se haya deshabilitado después.
    const locks = {};
    await bloquearStock(detallesResueltos.map(claveLinea), { validar: false, transaction, detalle: locks });
    const movimientos = [];

    for (const { detalle, pp, idvariante } of detallesResueltos) {
      const unidadesARevertir = Number(detalle.cantidad) * Number(pp.cantidad_base);

      // Almacen ANTES que Lote: mismo orden que las ventas (almacen -> lotes). Con el orden
      // inverso, una venta (almacen y luego lotes) y esta anulación (lote y luego almacen)
      // se bloquean mutuamente; en productos sin variante no hay mutex de variante que lo evite.
      const almacen = await models.Almacen.findOne({
        where: whereStock({ codigoprod: pp.codigoprod, idsucursal: compra.idsucursal, idvariante }),
        lock: transaction.LOCK.UPDATE,
        transaction,
      });

      const lote = await models.Lote.findOne({
        where: { idcompra_detalle: detalle._id },
        lock: transaction.LOCK.UPDATE,
        transaction,
      });

      if (lote) {
        if (Number(lote.cantidad_disponible) < unidadesARevertir) {
          const error = new Error(
            "No se puede anular: parte de este lote ya fue consumida por una venta"
          );
          error.status = 409;
          error.code = "LOTE_PARCIALMENTE_CONSUMIDO";
          throw error;
        }
        lote.cantidad_disponible = Number(lote.cantidad_disponible) - unidadesARevertir;
        await lote.save({ transaction });
      }

      if (almacen) {
        const stockAnterior = Number(almacen.stock);
        const stockNuevo = stockAnterior - unidadesARevertir;

        if (stockNuevo < 0) {
          throw new Error("Stock negativo no permitido al anular compra");
        }

        almacen.stock = stockNuevo;
        await almacen.save({ transaction });
        movimientos.push({ codigoprod: pp.codigoprod, idvariante, cantidad: unidadesARevertir, stockFinal: stockNuevo });

        await models.Kardex.create({
          codigoprod: pp.codigoprod,
          idsucursal: compra.idsucursal,
          idusuario: compra.idusuario,
          tipo: "ANULACION_COMPRA",
          cantidad: unidadesARevertir,
          stock_anterior: stockAnterior,
          stock_nuevo: stockNuevo,
          referencia: id,
          fecha: new Date(),
          idlote: lote ? lote.idlote : null,
          idprodPresenta: detalle.idprodPresenta,
          idvariante,
        }, { transaction });
      }
    }

    await compra.update({ estado: false }, { transaction });

    await registrarCambioEstado(
      {
        tiporeg: TIPOS_REGISTRO.COMPRA,
        idregistro: compra._id,
        estadoAnterior: "Activa",
        estadoNuevo: "Anulada",
        codigoemp: idusuarioAccion ?? compra.idusuario,
        accion: "Compra anulada",
      },
      transaction
    );

    // Advertencias (aditivas): la reversa siempre se permite, pero si el stock descontado afecta una
    // clave que ya no es vendible se avisa. Se evalúa con lo leído bajo los locks de arriba.
    const advertencias = advertenciasDeReversa(agruparMovimientos(movimientos), locks, "descontaron");

    await transaction.commit();
    return advertencias.length ? { advertencias } : true;

  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * Registrar un pago (abono) sobre una compra existente. Soporta pagos
 * parciales a proveedores — el saldo pendiente (cuentas por pagar) se
 * deriva sumando los PagoCompra en `getCompraFtr`.
 */
const registrarPagoCompraFtr = async (idcompra, body = {}) => {
  const transaction = await models.sequelize.transaction();
  try {
    const compra = await models.Compra.findByPk(idcompra, { transaction });
    if (!compra) {
      const error = new Error("Compra no encontrada");
      error.status = 404;
      throw error;
    }

    const pago = await models.PagoCompra.create(
      {
        idcompra,
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
 * Obtener el siguiente código de compra disponible
 */
const nextCodeFtr = async () => {
  const { generarSiguienteCodigo } = require("../../helpers/generate-code");
  return { codigo: await generarSiguienteCodigo("COMPRA") };
};

module.exports = {
  getComprasFtr,
  getCompraFtr,
  createCompraFtr,
  updateCompraFtr,
  deleteCompraFtr,
  registrarPagoCompraFtr,
  nextCodeFtr,
};
