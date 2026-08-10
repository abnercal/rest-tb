const models = require("../../models/mysql");

// ─── CRUD ────────────────────────────────────────────────────────────────────

const getDescuentosFtr = async (query = {}) => {
  const { idprodPresenta } = query;
  const hasPagination = query.page !== undefined || query.limit !== undefined;

  let where = {};
  if (idprodPresenta) {
    where.idprodPresenta = idprodPresenta;
  }

  let findOptions = {
    where,
    include: [{ association: "ProductoPresentacion", include: ["Producto", "Presentacion"] }],
    order: [["iddescuentos", "DESC"]],
  };

  if (hasPagination) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    findOptions.limit = limit;
    findOptions.offset = (page - 1) * limit;

    const { count, rows } = await models.Descuento.findAndCountAll(findOptions);
    return {
      data: rows,
      meta: { total: count, totalPages: Math.ceil(count / limit), currentPage: page, limit },
    };
  }

  const { count, rows } = await models.Descuento.findAndCountAll(findOptions);
  return { data: rows, meta: { total: count } };
};

const getDescuentoFtr = async (id) => {
  const descuento = await models.Descuento.findByPk(id, {
    include: [{ association: "ProductoPresentacion", include: ["Producto", "Presentacion"] }],
  });
  if (!descuento) {
    const error = new Error("Descuento no encontrado");
    error.status = 404;
    throw error;
  }
  return descuento;
};

const createDescuentoFtr = async (body) => {
  // Validar que ProductoPresentacion existe
  const pp = await models.ProductoPresentacion.findByPk(body.idprodPresenta);
  if (!pp) {
    const error = new Error("Producto presentación no encontrado");
    error.status = 404;
    throw error;
  }

  return await models.Descuento.create(body);
};

const updateDescuentoFtr = async (id, body) => {
  const descuento = await getDescuentoFtr(id);
  await descuento.update(body);
  return descuento;
};

// Soft-delete vía estado (no se hace destroy físico)
const deleteDescuentoFtr = async (id) => {
  const descuento = await getDescuentoFtr(id);
  await descuento.update({ estado: 0 });
  return true;
};

module.exports = {
  getDescuentosFtr,
  getDescuentoFtr,
  createDescuentoFtr,
  updateDescuentoFtr,
  deleteDescuentoFtr,
};
