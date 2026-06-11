const { Op } = require("sequelize");
const moment = require("moment");
const models = require("../../models/mysql");

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

  let findOptions = {
    where,
    include: ["Proveedor", "Sucursal", "Usuario", INCLUDE_DETALLE()],
    order: [["createdAt", "DESC"]],
    distinct: true,
    subQuery: false,
  };

  if (hasPagination) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    findOptions.limit = limit;
    findOptions.offset = (page - 1) * limit;

    const { count, rows } = await models.Compra.findAndCountAll(findOptions);
    return {
      data: rows,
      meta: { total: count, totalPages: Math.ceil(count / limit), currentPage: page, limit },
    };
  }

  const { count, rows } = await models.Compra.findAndCountAll(findOptions);
  return { data: rows, meta: { total: count } };
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
      INCLUDE_DETALLE(),
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
 *   nombre, fecha, direccion, idproveedor, idusuario, idsucursal,
 *   detalles: [{ idprodPresenta, cantidad, costo }]
 * }
 */
const createCompraFtr = async (body) => {
  const transaction = await models.sequelize.transaction();

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

    // ✅ Crear compra
    const compra = await models.Compra.create(compraData, { transaction });

    // ✅ Crear detalles + actualizar stock + kardex
    for (const detalle of detalles) {
      const pp = await models.ProductoPresentacion.findByPk(detalle.idprodPresenta, {
        include: ["Producto"],
        transaction,
      });

      if (!pp) {
        throw new Error(`Presentación ${detalle.idprodPresenta} no existe`);
      }

      await models.CompraDetalle.create(
        {
          cantidad: detalle.cantidad,
          costo: detalle.costo,
          idcompra: compra._id,
          idprodPresenta: detalle.idprodPresenta,
        },
        { transaction }
      );

      const unidadesBase = Number(detalle.cantidad) * Number(pp.cantidad_base);

      const almacen = await models.Almacen.findOne({
        where: {
          codigoprod: pp.codigoprod,
          idsucursal: compra.idsucursal,
        },
        transaction,
      });

      let stockAnterior = 0;
      let stockNuevo = 0;

      if (almacen) {
        stockAnterior = Number(almacen.stock);
        stockNuevo = stockAnterior + unidadesBase;

        almacen.stock = stockNuevo;
        await almacen.save({ transaction });
      } else {
        stockAnterior = 0;
        stockNuevo = unidadesBase;

        await models.Almacen.create(
          {
            codigoprod: pp.codigoprod,
            idsucursal: compra.idsucursal,
            stock: stockNuevo,
            stock_minimo: Number(pp.Producto?.stock_minimo) || 0,
            fecha: new Date(),
          },
          { transaction }
        );
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
 * Anular compra: reversa de stock
 */
const deleteCompraFtr = async (id) => {
  const transaction = await models.sequelize.transaction();

  try {
    const compra = await models.Compra.findByPk(id);

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

    for (const detalle of detalles) {
      const pp = await models.ProductoPresentacion.findByPk(detalle.idprodPresenta, {
        transaction,
      });

      const unidadesARevertir = Number(detalle.cantidad) * Number(pp.cantidad_base);

      const almacen = await models.Almacen.findOne({
        where: {
          codigoprod: pp.codigoprod,
          idsucursal: compra.idsucursal,
        },
        transaction,
      });

      if (almacen) {
        const stockAnterior = Number(almacen.stock);
        const stockNuevo = stockAnterior - unidadesARevertir;

        if (stockNuevo < 0) {
          throw new Error("Stock negativo no permitido al anular compra");
        }

        almacen.stock = stockNuevo;
        await almacen.save({ transaction });

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
        }, { transaction });
      }
    }

    await compra.update({ estado: false }, { transaction });

    await transaction.commit();
    return true;

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
  nextCodeFtr,
};
