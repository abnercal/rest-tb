const { Op } = require("sequelize");
const moment = require("moment");
const models = require("../../models/mysql");
const { obtenerPrecioCorrecto } = require("../../helpers/precio-helper");

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

  let findOptions = {
    where,
    include: [
      { model: models.Cliente, as: "Cliente" },
      INCLUDE_DETALLE(),
    ],
    order: [["createdAt", "DESC"]],
    distinct: true,
    subQuery: false,
  };

  if (hasPagination) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    findOptions.limit = limit;
    findOptions.offset = (page - 1) * limit;

    const { count, rows } = await models.Orden.findAndCountAll(findOptions);
    return {
      data: rows,
      meta: { total: count, totalPages: Math.ceil(count / limit), currentPage: page, limit },
    };
  }

  const { count, rows } = await models.Orden.findAndCountAll(findOptions);
  return { data: rows, meta: { total: count } };
};

/**
 * Obtener venta por ID con detalles, pago y cliente
 */
const getVentaFtr = async (id) => {
  const orden = await models.Orden.findOne({
    where: { _id: id },
    include: [
      { model: models.Cliente, as: "Cliente" },
      INCLUDE_DETALLE(),
      { model: models.Pago, as: "Pago" },
    ],
  });

  if (!orden) {
    const error = new Error("Venta no encontrada");
    error.status = 404;
    throw error;
  }
  return orden;
};

/**
 * Crear venta (orden) con detalles, validar stock y registrar pago
 * Body esperado:
 * {
 *   nombre, fecha, direccion, idcliente, idusuario, idsucursal,
 *   detalles: [{ idprodPresenta, cantidad, precio }],
 *   pago: { idtipopago, estado }
 * }
 */
const createVentaFtr = async (body) => {
  const transaction = await models.sequelize.transaction();

  try {
    const { detalles = [], pago = {}, ...ordenData } = body;

    // Auto-generar referencia si no se envió
    if (!ordenData.referencia) {
      const { generarSiguienteCodigo } = require("../../helpers/generate-code");
      ordenData.referencia = await generarSiguienteCodigo("VENTA");
    }

    // Validar cliente
    const cliente = await models.Cliente.findByPk(ordenData.idcliente, { transaction });
    if (!cliente) {
      const error = new Error("El cliente no existe");
      error.status = 404;
      throw error;
    }

    let total = 0;

    // Validar presentaciones y stock
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

      const unidadesADescontar = Number(detalle.cantidad) * Number(pp.cantidad_base);

      const almacen = await models.Almacen.findOne({
        where: {
          codigoprod: pp.codigoprod,
          idsucursal: ordenData.idsucursal,
        },
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

      total += Number(detalle.cantidad) * Number(detalle.precio);
    }

    // Resolver tipo de cliente para validación de precios
    let idtipoCli = null;
    if (body.idcliente) {
      const cliente = await models.Cliente.findByPk(body.idcliente, { transaction });
      if (cliente) {
        idtipoCli = cliente.idtipoCli;
      }
    }

    // Validar precios de cada detalle contra el precio correcto
    const erroresPrecio = [];
    for (const detalle of detalles) {
      try {
        const precioCorrecto = await obtenerPrecioCorrecto(detalle.idprodPresenta, idtipoCli);
        if (Math.abs(Number(detalle.precio) - Number(precioCorrecto.precio)) > 0.01) {
          erroresPrecio.push({
            idprodPresenta: detalle.idprodPresenta,
            esperado: Number(precioCorrecto.precio),
            recibido: Number(detalle.precio),
          });
        }
      } catch (err) {
        if (err.code === "PRECIO_NO_DISPONIBLE") {
          erroresPrecio.push({
            idprodPresenta: detalle.idprodPresenta,
            error: "PRECIO_NO_DISPONIBLE",
            mensaje: "Producto sin precio disponible para esta presentación",
          });
        } else {
          throw err; // error inesperado, dejar que el catch de afuera lo maneje
        }
      }
    }

    if (erroresPrecio.length > 0) {
      const err = new Error("Precios incorrectos en la venta");
      err.status = 409;
      err.code = "PRECIO_INCORRECTO";
      err.detalles = erroresPrecio;
      throw err;
    }

    // Crear venta
    const ESTADO_CREADO = 1;
    const nuevaOrden = await models.Orden.create(
      {
        ...ordenData,
        total,
        fecha: ordenData.fecha || moment().format('YYYY-MM-DD HH:mm:ss'),
        idestado: ESTADO_CREADO,
      },
      { transaction }
    );

    // Crear detalles + actualizar stock + kardex
    for (const detalle of detalles) {
      const pp = await models.ProductoPresentacion.findByPk(detalle.idprodPresenta, {
        include: ["Producto"],
        transaction,
      });

      await models.OrdenDetalle.create(
        {
          cantidad: detalle.cantidad,
          precio: detalle.precio,
          idorden: nuevaOrden._id,
          idprodPresenta: detalle.idprodPresenta,
        },
        { transaction }
      );

      const unidadesADescontar = Number(detalle.cantidad) * Number(pp.cantidad_base);

      const almacen = await models.Almacen.findOne({
        where: {
          codigoprod: pp.codigoprod,
          idsucursal: ordenData.idsucursal,
        },
        transaction,
      });

      const stockAnterior = Number(almacen.stock);
      const stockNuevo = stockAnterior - unidadesADescontar;

      almacen.stock = stockNuevo;
      await almacen.save({ transaction });

      // KARDEX (SALIDA)
      await models.Kardex.create(
        {
          codigoprod: pp.codigoprod,
          idsucursal: ordenData.idsucursal,
          idusuario: ordenData.idusuario,
          tipo: "VENTA",
          cantidad: unidadesADescontar,
          stock_anterior: stockAnterior,
          stock_nuevo: stockNuevo,
          referencia: nuevaOrden._id,
          fecha: nuevaOrden.fecha,
        },
        { transaction }
      );
    }

    // Registrar pago
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

    await transaction.commit();

    return getVentaFtr(nuevaOrden._id);

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
 * Anular venta: reversa de stock
 */
const deleteVentaFtr = async (id) => {
  const transaction = await models.sequelize.transaction();

  try {
    const orden = await models.Orden.findByPk(id);
    if (!orden) throw new Error("Venta no encontrada");

    if (orden.idestado === 3) {
      throw new Error("La venta ya está anulada");
    }

    const detalles = await models.OrdenDetalle.findAll({
      where: { idorden: id },
      transaction,
    });

    for (const detalle of detalles) {
      const pp = await models.ProductoPresentacion.findByPk(detalle.idprodPresenta, {
        transaction,
      });

      const unidadesARevertir = Number(detalle.cantidad) * Number(pp.cantidad_base);

      const almacen = await models.Almacen.findOne({
        where: {
          codigoprod: pp.codigoprod,
          idsucursal: orden.idsucursal,
        },
        transaction,
      });

      const stockAnterior = Number(almacen.stock);
      const stockNuevo = stockAnterior + unidadesARevertir;

      almacen.stock = stockNuevo;
      await almacen.save({ transaction });

      // KARDEX REVERSA
      await models.Kardex.create(
        {
          codigoprod: pp.codigoprod,
          idsucursal: orden.idsucursal,
          idusuario: orden.idusuario,
          tipo: "ANULACION_VENTA",
          cantidad: unidadesARevertir,
          stock_anterior: stockAnterior,
          stock_nuevo: stockNuevo,
          referencia: id,
          fecha: orden.fecha,
        },
        { transaction }
      );
    }

    await orden.update({ idestado: 3 }, { transaction });

    await transaction.commit();
    return true;

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
  updateVentaFtr,
  deleteVentaFtr,
  nextCodeFtr,
};
