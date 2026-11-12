const { Op } = require("sequelize");
const models = require("../../models/mysql");

// Solo se aceptan estos campos del body (el modelo usa `_id` como PK y no debe pisarse)
const pickBody = (body = {}) => {
  const data = {};
  for (const key of ["nombre", "hex", "estado"]) {
    if (body[key] !== undefined) data[key] = body[key];
  }
  return data;
};

// UNIQUE (nombre) -> 409 legible en vez de 500
const handleUnique = (error) => {
  if (error.name === "SequelizeUniqueConstraintError") {
    const err = new Error("Ya existe un color con ese nombre");
    err.status = 409;
    return err;
  }
  return error;
};

const getColoresFtr = async (query) => {
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

    const { count, rows } = await models.Color.findAndCountAll(findOptions);
    return {
      data: rows,
      meta: { total: count, totalPages: Math.ceil(count / limit), currentPage: page, limit },
    };
  }

  const { count, rows } = await models.Color.findAndCountAll(findOptions);
  return { data: rows, meta: { total: count } };
};

const getColorFtr = async (id) => {
  const color = await models.Color.findByPk(id);
  if (!color) {
    const error = new Error("Color no encontrado");
    error.status = 404;
    throw error;
  }
  return color;
};

const createColorFtr = async (body) => {
  try {
    return await models.Color.create(pickBody(body));
  } catch (error) {
    throw handleUnique(error);
  }
};

const updateColorFtr = async (id, body) => {
  const color = await getColorFtr(id);
  try {
    await color.update(pickBody(body));
  } catch (error) {
    throw handleUnique(error);
  }
  return color;
};

const delColorFtr = async (id) => {
  const color = await getColorFtr(id);
  await color.update({ estado: 0 });
  return true;
};

module.exports = {
  getColoresFtr,
  getColorFtr,
  createColorFtr,
  updateColorFtr,
  delColorFtr
};
