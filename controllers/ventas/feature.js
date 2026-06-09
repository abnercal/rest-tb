const { Op } = require("sequelize");
const moment = require("moment");
const models = require("../../models/mysql");

/**
 * Listar órdenes/ventas con paginación y búsqueda
 */
const getVentasFtr = async (query) => {
  const { page = 1, limit = 10, search = "" } = query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

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

  const { count, rows } = await models.Orden.findAndCountAll({
    where,
    include: [
      { model: models.Cliente, as: "Cliente" },
      {
        model: models.OrdenDetalle,
        as: "Detalles",
        include: [{ model: models.Producto }],
      },
    ],
    limit: parseInt(limit),
    offset,
    order: [["createdAt", "DESC"]],
    distinct: true,
    subQuery: false,
  });

  return {
    data: rows,
    meta: {
      total: count,
      totalPages: Math.ceil(count / parseInt(limit)),
      currentPage: parseInt(page),
      limit: parseInt(limit),
    },
  };
};

/**
 * Obtener venta por ID con detalles, pago y cliente
 */
const getVentaFtr = async (id) => {
  const orden = await models.Orden.findOne({
    where: { _id: id },
    include: [
      { model: models.Cliente, as: "Cliente" },
      {
        model: models.OrdenDetalle,
        as: "Detalles",
        include: [{ model: models.Producto, as: "Producto" }],
      },
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
 *   detalles: [{ codigoprod, cantidad, precio }],
 *   pago: { idtipopago, estado }
 * }
 */
const createVentaFtr = async (body) => {
  const transaction = await models.sequelize.transaction();

  try {
    const { detalles = [], pago = {}, ...ordenData } = body;

    // Validar cliente
    const cliente = await models.Cliente.findByPk(ordenData.idcliente, { transaction });
    if (!cliente) {
      const error = new Error("El cliente no existe");
      error.status = 404;
      throw error;
    }

    let total = 0;

    // Validar productos y stock
    for (const detalle of detalles) {
      const producto = await models.Producto.findOne({
        where: { codigoprod: detalle.codigoprod },
        transaction,
      });

      if (!producto) {
        const error = new Error(`Producto ${detalle.codigoprod} no existe`);
        error.status = 404;
        throw error;
      }

      const almacen = await models.Almacen.findOne({
        where: {
          codigoprod: detalle.codigoprod,
          idsucursal: ordenData.idsucursal,
        },
        transaction,
      });

      if (!almacen || Number(almacen.stock) < Number(detalle.cantidad)) {
        const error = new Error(`Stock insuficiente para: ${producto.nombre}`);
        error.status = 409;
        throw error;
      }

      total += Number(detalle.cantidad) * Number(detalle.precio);
    }

    // Crear venta
    const ESTADO_CREADO = 1;
    const nuevaOrden = await models.Orden.create(
      {
        ...ordenData,
        total,
        fecha: new Date(),
        idestado: ESTADO_CREADO
      },
      { transaction }
    );

    // Crear detalles + actualizar stock + kardex
    for (const detalle of detalles) {
      await models.OrdenDetalle.create(
        {
          cantidad: detalle.cantidad,
          precio: detalle.precio,
          idorden: nuevaOrden._id,
          codigoprod: detalle.codigoprod,
        },
        { transaction }
      );

      const almacen = await models.Almacen.findOne({
        where: {
          codigoprod: detalle.codigoprod,
          idsucursal: ordenData.idsucursal,
        },
        transaction,
      });

      const stockAnterior = Number(almacen.stock);
      const stockNuevo = stockAnterior - Number(detalle.cantidad);

      almacen.stock = stockNuevo;
      await almacen.save({ transaction });

      // KARDEX (SALIDA)
      await models.Kardex.create(
        {
          codigoprod: detalle.codigoprod,
          idsucursal: ordenData.idsucursal,
          idusuario: ordenData.idusuario,
          tipo: "VENTA",
          cantidad: detalle.cantidad,
          stock_anterior: stockAnterior,
          stock_nuevo: stockNuevo,
          referencia: nuevaOrden._id,
          fecha: new Date(),
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
        idtipopago: 3 || null,
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
 * Soft delete: estado = 0
 */
const deleteVentaFtr = async (id) => {
  const transaction = await models.sequelize.transaction();

  try {
    const orden = await models.Orden.findByPk(id);
    if (!orden) throw new Error("Venta no encontrada");

    // VALIDAR SI YA ESTÁ ANULADA
    if (orden.idestado === 3) {
      throw new Error("La venta ya está anulada");
    }

    const detalles = await models.OrdenDetalle.findAll({
      where: { idorden: id },
      transaction,
    });

    for (const detalle of detalles) {
      const almacen = await models.Almacen.findOne({
        where: {
          codigoprod: detalle.codigoprod,
          idsucursal: orden.idsucursal,
        },
        transaction,
      });

      const stockAnterior = Number(almacen.stock);
      const stockNuevo = stockAnterior + Number(detalle.cantidad);

      almacen.stock = stockNuevo;
      await almacen.save({ transaction });

      // KARDEX REVERSA
      await models.Kardex.create(
        {
          codigoprod: detalle.codigoprod,
          idsucursal: orden.idsucursal,
          idusuario: orden.idusuario,
          tipo: "ANULACION_VENTA",
          cantidad: detalle.cantidad,
          stock_anterior: stockAnterior,
          stock_nuevo: stockNuevo,
          referencia: id,
          fecha: new Date(),
        },
        { transaction }
      );
    }

    // AQUÍ EL CAMBIO IMPORTANTE
    await orden.update({ idestado: 3 }, { transaction });

    await transaction.commit();
    return true;

  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

module.exports = {
  getVentasFtr,
  getVentaFtr,
  createVentaFtr,
  updateVentaFtr,
  deleteVentaFtr,
};
