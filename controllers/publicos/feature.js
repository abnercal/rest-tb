const { Op } = require("sequelize");
const models = require("../../models/mysql");

// Solo se aceptan estos campos del body (el modelo usa `_id` como PK y no debe pisarse)
const pickBody = (body = {}) => {
  const data = {};
  for (const key of ["nombre", "estado"]) {
    if (body[key] !== undefined) data[key] = body[key];
  }
  return data;
};

// UNIQUE (nombre) -> 409 legible en vez de 500
const handleUnique = (error) => {
  if (error.name === "SequelizeUniqueConstraintError") {
    const err = new Error("Ya existe un público objetivo con ese nombre");
    err.status = 409;
    return err;
  }
  return error;
};

const getPublicosFtr = async (query) => {
  const search = query.search || "";
  const hasPagination = query.page !== undefined || query.limit !== undefined;

  let where = {};

  if (search) {
    where.nombre = { [Op.like]: `%${search}%` };
  }
  if (query.estado !== undefined) {
    where.estado = query.estado;
  }

  let findOptions = { where, order: [["nombre", "ASC"]] };

  if (hasPagination) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    findOptions.limit = limit;
    findOptions.offset = (page - 1) * limit;

    const { count, rows } = await models.PublicoObjetivo.findAndCountAll(findOptions);
    return {
      data: rows,
      meta: { total: count, totalPages: Math.ceil(count / limit), currentPage: page, limit },
    };
  }

  const { count, rows } = await models.PublicoObjetivo.findAndCountAll(findOptions);
  return { data: rows, meta: { total: count } };
};

const getPublicoFtr = async (id) => {
  const publico = await models.PublicoObjetivo.findByPk(id);
  if (!publico) {
    const error = new Error("Público objetivo no encontrado");
    error.status = 404;
    throw error;
  }
  return publico;
};

const createPublicoFtr = async (body) => {
  try {
    return await models.PublicoObjetivo.create(pickBody(body));
  } catch (error) {
    throw handleUnique(error);
  }
};

const updatePublicoFtr = async (id, body) => {
  const publico = await getPublicoFtr(id);
  try {
    await publico.update(pickBody(body));
  } catch (error) {
    throw handleUnique(error);
  }
  return publico;
};

const delPublicoFtr = async (id) => {
  const publico = await getPublicoFtr(id);
  await publico.update({ estado: 0 });
  return true;
};

module.exports = {
  getPublicosFtr,
  getPublicoFtr,
  createPublicoFtr,
  updatePublicoFtr,
  delPublicoFtr
};
