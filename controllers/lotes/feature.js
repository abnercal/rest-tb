const { Op } = require("sequelize");
const moment = require("moment");
const models = require("../../models/mysql");

/**
 * Listar lotes con filtros opcionales: idsucursal, codigoprod, estado.
 */
const getLotesFtr = async (query = {}) => {
  const { idsucursal, codigoprod, estado } = query;
  const hasPagination = query.page !== undefined || query.limit !== undefined;

  let where = {};
  if (idsucursal !== undefined) where.idsucursal = idsucursal;
  if (codigoprod !== undefined) where.codigoprod = codigoprod;
  if (estado !== undefined) where.estado = estado;

  let findOptions = {
    where,
    include: [
      { model: models.Producto, as: "Producto" },
      { model: models.Sucursal, as: "Sucursal" },
    ],
    order: [["fecha_vencimiento", "ASC"]],
  };

  if (hasPagination) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    findOptions.limit = limit;
    findOptions.offset = (page - 1) * limit;

    const { count, rows } = await models.Lote.findAndCountAll(findOptions);
    return {
      data: rows,
      meta: { total: count, totalPages: Math.ceil(count / limit), currentPage: page, limit },
    };
  }

  const { count, rows } = await models.Lote.findAndCountAll(findOptions);
  return { data: rows, meta: { total: count } };
};

/**
 * Reporte de "productos por vencer": lotes con `cantidad_disponible > 0`,
 * `estado = 1`, cuya `fecha_vencimiento` cae entre hoy y hoy + `dias`
 * (default 30), ordenados por fecha de vencimiento ascendente.
 */
const getLotesPorVencerFtr = async (query = {}) => {
  const dias = query.dias !== undefined ? parseInt(query.dias) : 30;

  const hoy = moment().format("YYYY-MM-DD");
  const limite = moment().add(dias, "days").format("YYYY-MM-DD");

  const lotes = await models.Lote.findAll({
    where: {
      fecha_vencimiento: { [Op.between]: [hoy, limite] },
      cantidad_disponible: { [Op.gt]: 0 },
      estado: 1,
    },
    order: [["fecha_vencimiento", "ASC"]],
    include: [
      { model: models.Producto, as: "Producto" },
      { model: models.Sucursal, as: "Sucursal" },
    ],
  });

  return lotes;
};

module.exports = {
  getLotesFtr,
  getLotesPorVencerFtr,
};
