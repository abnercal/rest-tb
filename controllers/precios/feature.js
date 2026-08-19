const { Op } = require("sequelize");
const models = require("../../models/mysql");
const { obtenerPrecioCorrecto } = require("../../helpers/precio-helper");

// ─── CRUD ────────────────────────────────────────────────────────────────────

const getPreciosFtr = async (query) => {
  const { idprodPresenta } = query;
  const hasPagination = query.page !== undefined || query.limit !== undefined;

  let where = {};

  if (idprodPresenta) {
    where.idprodPresenta = idprodPresenta;
  }

  let findOptions = {
    where,
    include: [{ model: models.TipoCliente, as: "TipoCliente" }],
    order: [["idprecios", "DESC"]],
  };

  if (hasPagination) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    findOptions.limit = limit;
    findOptions.offset = (page - 1) * limit;

    const { count, rows } = await models.Precio.findAndCountAll(findOptions);
    return {
      data: rows,
      meta: { total: count, totalPages: Math.ceil(count / limit), currentPage: page, limit },
    };
  }

  const { count, rows } = await models.Precio.findAndCountAll(findOptions);
  return { data: rows, meta: { total: count } };
};

const getPrecioFtr = async (id) => {
  const precio = await models.Precio.findByPk(id, {
    include: [{ model: models.TipoCliente, as: "TipoCliente" }],
  });
  if (!precio) {
    const error = new Error("Precio no encontrado");
    error.status = 404;
    throw error;
  }
  return precio;
};

const createPrecioFtr = async (body) => {
  // Validar que ProductoPresentacion existe
  const pp = await models.ProductoPresentacion.findByPk(body.idprodPresenta);
  if (!pp) {
    const error = new Error("Producto presentación no encontrado");
    error.status = 404;
    throw error;
  }

  // Validar que TipoCliente existe
  const tc = await models.TipoCliente.findByPk(body.idtipoCli);
  if (!tc) {
    const error = new Error("Tipo de cliente no encontrado");
    error.status = 404;
    throw error;
  }

  return await models.Precio.create(body);
};

const updatePrecioFtr = async (id, body) => {
  const precio = await getPrecioFtr(id);
  await precio.update(body);
  return precio;
};

const deletePrecioFtr = async (id) => {
  const precio = await getPrecioFtr(id);
  await precio.update({ estado: 0 });
  return true;
};

// ─── Endpoint de consulta rápida (by-presentacion) ──────────────────────────

const getPrecioByPresentacionFtr = async (idprodPresenta, idtipoCli) => {
  return await obtenerPrecioCorrecto(idprodPresenta, idtipoCli);
};

// ─── Precios por producto (busca todas las presentaciones del producto) ────

const getPreciosByProductoFtr = async (codigoprod) => {
  // Obtener todas las presentaciones del producto
  const presentaciones = await models.ProductoPresentacion.findAll({
    where: { codigoprod },
    attributes: ["idprodPresenta"],
  });

  if (!presentaciones.length) return [];

  const idsPresenta = presentaciones.map((p) => p.idprodPresenta);

  // Buscar precios para esas presentaciones
  const precios = await models.Precio.findAll({
    where: { idprodPresenta: { [Op.in]: idsPresenta } },
    include: [
      { model: models.TipoCliente, as: "TipoCliente" },
      {
        model: models.ProductoPresentacion,
        as: "ProductoPresentacion",
        include: [{ model: models.Presentacion, as: "Presentacion" }],
      },
    ],
    order: [["idprecios", "DESC"]],
  });

  return precios;
};

module.exports = {
  getPreciosFtr,
  getPrecioFtr,
  createPrecioFtr,
  updatePrecioFtr,
  deletePrecioFtr,
  getPrecioByPresentacionFtr,
  getPreciosByProductoFtr,
};
