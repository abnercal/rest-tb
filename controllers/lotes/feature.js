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
 * Reporte de "productos por vencer": lotes con `cantidad_disponible > 0` y
 * `estado = 1`, cuya `fecha_vencimiento` es <= hoy + `dias` (default 30).
 * Incluye también los ya vencidos que siguen con stock disponible.
 * Devuelve la data aplanada con `dias_restantes` y `urgencia` calculados,
 * más un `meta` con el total y el desglose por urgencia.
 */
const getLotesPorVencerFtr = async (query = {}) => {
  const dias = query.dias !== undefined ? parseInt(query.dias) : 30;

  const hoy = moment().startOf("day");
  const limite = moment().add(dias, "days").format("YYYY-MM-DD");

  const lotes = await models.Lote.findAll({
    where: {
      fecha_vencimiento: { [Op.lte]: limite },
      cantidad_disponible: { [Op.gt]: 0 },
      estado: 1,
    },
    order: [["fecha_vencimiento", "ASC"]],
    include: [
      {
        model: models.Producto,
        as: "Producto",
        include: [{ association: "Marca" }, { association: "Unidad" }],
      },
      { model: models.Sucursal, as: "Sucursal" },
    ],
  });

  const data = lotes.map((l) => {
    const p = l.Producto;
    const diasRestantes = moment(l.fecha_vencimiento, "YYYY-MM-DD")
      .startOf("day")
      .diff(hoy, "days");

    let urgencia = "proximo";
    if (diasRestantes < 0) urgencia = "vencido";
    else if (diasRestantes <= 7) urgencia = "critico";

    return {
      idlote: l.idlote,
      codigoprod: l.codigoprod,
      producto: p?.nombre || "",
      marca: p?.Marca?.nombre || "",
      unidad: p?.Unidad?.nombre || "",
      idsucursal: l.idsucursal,
      sucursal: l.Sucursal?.nombre || "",
      cantidad_inicial: Number(l.cantidad_inicial) || 0,
      cantidad_disponible: Number(l.cantidad_disponible) || 0,
      fecha_ingreso: l.fecha_ingreso,
      fecha_vencimiento: l.fecha_vencimiento,
      dias_restantes: diasRestantes,
      urgencia,
    };
  });

  const resumen = data.reduce(
    (acc, d) => {
      acc[d.urgencia] += 1;
      return acc;
    },
    { vencido: 0, critico: 0, proximo: 0 }
  );

  return { data, meta: { total: data.length, dias, ...resumen } };
};

module.exports = {
  getLotesFtr,
  getLotesPorVencerFtr,
};
