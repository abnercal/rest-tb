const { Op } = require("sequelize");
const models = require("../../models/mysql");


const getMarcasFtr = async (query) => {
  const search = query.search || "";
  const hasPagination = query.page !== undefined || query.limit !== undefined;

  let where = { /*estado: 1*/ };
  
  if (search) {
    where.nombre = { [Op.like]: `%${search}%` };
  }

  let findOptions = { where, order: [["nombre","ASC"]] };

  if (hasPagination) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    findOptions.limit = limit;
    findOptions.offset = (page - 1) * limit;

    const { count, rows } = await models.Marca.findAndCountAll(findOptions);
    return { 
      data: rows,
      meta: { total: count, totalPages: Math.ceil(count / limit), currentPage: page, limit },
    };
  }

  const { count, rows } = await models.Marca.findAndCountAll(findOptions);
  return { data: rows, meta: { total: count } };
};
const getMarcaFtr = async (id) => {
  const marca = await models.Marca.findByPk(id);
  if (!marca) {
    const error = new Error("Marca no encontrada");
    error.status = 404;
    throw error;
  }
  return marca;
};

const createMarcaFtr = async (body) => {
  return await models.Marca.create(body);
};

const updateMarcasFtr = async (id, body) => {
  const marca = await getMarcaFtr(id);
  await marca.update(body);
  return marca;
};
const delMarcaFtr = async (id) => {
  const marca = await getMarcaFtr(id);
  await marca.update({ estado: 0 });
  return true;
};

module.exports = {
  getMarcasFtr,
  getMarcaFtr,
  createMarcaFtr,
  updateMarcasFtr,
  delMarcaFtr
};