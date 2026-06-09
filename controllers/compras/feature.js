const { Op } = require("sequelize");
const moment = require("moment");
const models = require("../../models/mysql");

/**
 * Listar compras con paginación y búsqueda por fecha o proveedor
 */
const getComprasFtr = async (query) => {
  const { page = 1, limit = 10, search = "" } = query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

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

  const { count, rows } = await models.Compra.findAndCountAll({
    where,
    include: [
      "Proveedor", "Sucursal", "Usuario",
      {
        model: models.CompraDetalle,
        as: "Detalles",
        include: [{ model: models.Producto, as: "Producto" }],
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
 * Obtener compra por ID con detalles
 */
const getCompraFtr = async (id) => {
  const compra = await models.Compra.findOne({
    where: { _id: id },
    include: [
      { model: models.Proveedor, as: "Proveedor" },
      { model: models.Sucursal, as: "Sucursal" },
      { model: models.Usuario, as: "Usuario", attributes: { exclude: ["password"] } },
      {
        model: models.CompraDetalle,
        as: "Detalles",
        include: [{ model: models.Producto, as: "Producto" }],
      },
    ],
  });

  if (!compra) {
    const error = new Error("Compra no encontrada");
    error.status = 404;
    throw error;
  }
  return compra;
};

/**
 * Crear compra + detalles + actualizar stock en almacén
 * Body esperado:
 * {
 *   nombre, fecha, direccion, idproveedor, idusuario, idsucursal, total_compra,
 *   detalles: [{ codigoprod, idsucursal, cantidad, costo }]
 * }
 */
const createCompraFtr = async (body) => {
  const transaction = await models.sequelize.transaction();

  try {
    const { detalles = [], ...compraData } = body;

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
      if (!d.codigoprod || !d.cantidad || !d.costo) {
        throw new Error("Detalle incompleto");
      }
    }

    // ✅ (PRO) Calcular total en backend
    const totalCalculado = detalles.reduce((acc, d) => {
      return acc + (Number(d.cantidad) * Number(d.costo));
    }, 0);

    compraData.total = totalCalculado;

    // ✅ Crear compra
    const compra = await models.Compra.create(compraData, { transaction });

    // ✅ Crear detalles
    const detallesConId = detalles.map((d) => ({
      codigoprod: d.codigoprod,
      cantidad: d.cantidad,
      costo: d.costo,
      idcompra: compra._id,
    }));

    await models.CompraDetalle.bulkCreate(detallesConId, { transaction });

    // ✅ Actualizar stock + registrar kardex
    for (const detalle of detalles) {
      const almacen = await models.Almacen.findOne({
        where: {
          codigoprod: detalle.codigoprod,
          idsucursal: compra.idsucursal,
        },
        transaction,
      });

      let stockAnterior = 0;
      let stockNuevo = 0;

      if (almacen) {
        stockAnterior = Number(almacen.stock);
        stockNuevo = stockAnterior + Number(detalle.cantidad);

        almacen.stock = stockNuevo;
        await almacen.save({ transaction });
      } else {
        stockAnterior = 0;
        stockNuevo = Number(detalle.cantidad);

        await models.Almacen.create(
          {
            codigoprod: detalle.codigoprod,
            idsucursal: compra.idsucursal,
            stock: stockNuevo,
            fecha: new Date(),
          },
          { transaction }
        );
      }

      // REGISTRO EN KARDEX
      await models.Kardex.create(
        {
          codigoprod: detalle.codigoprod,
          idsucursal: compra.idsucursal,
          idusuario: compra.idusuario,
          tipo: "COMPRA",
          cantidad: detalle.cantidad,
          stock_anterior: stockAnterior,
          stock_nuevo: stockNuevo,
          referencia: compra._id,
          fecha: new Date(),
        },
        { transaction }
      );
    }

    await transaction.commit();

    return getCompraFtr(compra._id);

  } catch (error) {
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
    const compra = await models.Compra.findByPk(id);
    if (!compra) {
      const error = new Error("Compra no encontrada");
      error.status = 404;
      throw error;
    }
    await compra.update(body, { transaction });
    await transaction.commit();
    return getCompraFtr(id);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * Soft delete: estado = false
 */
const deleteCompraFtr = async (id) => {
  const transaction = await models.sequelize.transaction();

  try {
    const compra = await models.Compra.findByPk(id);

    if (!compra) {
      const error = new Error("Compra no encontrada");
      error.status = 404;
      throw error;
    }

    if (!compra.estado) {
      throw new Error("La compra ya está anulada");
    }

    // Obtener detalles de la compra
    const detalles = await models.CompraDetalle.findAll({
      where: { idcompra: id },
      transaction,
    });

    // Revertir stock + kardex
    for (const detalle of detalles) {
      const almacen = await models.Almacen.findOne({
        where: {
          codigoprod: detalle.codigoprod,
          idsucursal: compra.idsucursal,
        },
        transaction,
      });

      if (almacen) {
        const stockAnterior = Number(almacen.stock);
        const stockNuevo = stockAnterior - Number(detalle.cantidad);

        if (stockNuevo < 0) {
          throw new Error("Stock negativo no permitido al anular compra");
        }

        almacen.stock = stockNuevo;
        await almacen.save({ transaction });

        // registrar reversa en kardex
        await models.Kardex.create({
          codigoprod: detalle.codigoprod,
          idsucursal: compra.idsucursal,
          idusuario: compra.idusuario,
          tipo: "ANULACION_COMPRA",
          cantidad: detalle.cantidad,
          stock_anterior: stockAnterior,
          stock_nuevo: stockNuevo,
          referencia: id,
          fecha: new Date(),
        }, { transaction });
      }
    }

    // Marcar compra como anulada
    await compra.update({ estado: false }, { transaction });

    await transaction.commit();

    return true;

  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

module.exports = {
  getComprasFtr,
  getCompraFtr,
  createCompraFtr,
  updateCompraFtr,
  deleteCompraFtr,
};
