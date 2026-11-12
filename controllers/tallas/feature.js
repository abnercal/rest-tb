const { Op } = require("sequelize");
const models = require("../../models/mysql");

// Solo se aceptan estos campos del body (el modelo usa `_id` como PK y no debe pisarse)
const pickBody = (body = {}) => {
  const data = {};
  for (const key of ["nombre", "tipo", "orden", "estado"]) {
    if (body[key] !== undefined) data[key] = body[key];
  }
  return data;
};

// UNIQUE (nombre, tipo) -> 409 legible en vez de 500
const handleUnique = (error) => {
  if (error.name === "SequelizeUniqueConstraintError") {
    const err = new Error("Ya existe una talla con ese nombre y tipo");
    err.status = 409;
    return err;
  }
  return error;
};

const getTallasFtr = async (query) => {
  const search = query.search || "";
  const hasPagination = query.page !== undefined || query.limit !== undefined;

  let where = {};

  if (search) {
    where.nombre = { [Op.like]: `%${search}%` };
  }
  if (query.tipo) {
    where.tipo = query.tipo;
  }
  if (query.estado !== undefined) {
    where.estado = query.estado;
  }

  let findOptions = { where, order: [["tipo", "ASC"], ["orden", "ASC"], ["nombre", "ASC"]] };

  if (hasPagination) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    findOptions.limit = limit;
    findOptions.offset = (page - 1) * limit;

    const { count, rows } = await models.Talla.findAndCountAll(findOptions);
    return {
      data: rows,
      meta: { total: count, totalPages: Math.ceil(count / limit), currentPage: page, limit },
    };
  }

  const { count, rows } = await models.Talla.findAndCountAll(findOptions);
  return { data: rows, meta: { total: count } };
};

const getTallaFtr = async (id) => {
  const talla = await models.Talla.findByPk(id);
  if (!talla) {
    const error = new Error("Talla no encontrada");
    error.status = 404;
    throw error;
  }
  return talla;
};

const createTallaFtr = async (body) => {
  try {
    return await models.Talla.create(pickBody(body));
  } catch (error) {
    throw handleUnique(error);
  }
};

const updateTallaFtr = async (id, body) => {
  const talla = await getTallaFtr(id);
  try {
    await talla.update(pickBody(body));
  } catch (error) {
    throw handleUnique(error);
  }
  return talla;
};

const delTallaFtr = async (id) => {
  const talla = await getTallaFtr(id);
  await talla.update({ estado: 0 });
  return true;
};

module.exports = {
  getTallasFtr,
  getTallaFtr,
  createTallaFtr,
  updateTallaFtr,
  delTallaFtr
};
