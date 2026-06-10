const { Op } = require("sequelize");
const models = require("../../models/mysql");

const getCategoriasFtr = async (query) => {
  const search = query.search || "";
  const hasPagination = query.page !== undefined || query.limit !== undefined;

  let where = {};
  if (search) {
    where[Op.or] = [{ nombre: { [Op.like]: `%${search}%` } }];
  }

  let findOptions = { where, order: [["nombre", "ASC"]] };

  if (hasPagination) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    findOptions.limit = limit;
    findOptions.offset = (page - 1) * limit;

    const { count, rows } = await models.Categoria.findAndCountAll(findOptions);
    return {
      data: rows,
      meta: { total: count, totalPages: Math.ceil(count / limit), currentPage: page, limit },
    };
  }

  const { count, rows } = await models.Categoria.findAndCountAll(findOptions);
  return { data: rows, meta: { total: count } };
};

const getCategoriaFtr = async (id) => {
  const categoria = await models.Categoria.findByPk(id);
  if (!categoria) {
    const error = new Error("Categoría no encontrada");
    error.status = 404;
    throw error;
  }
  return categoria;
};

const createCategoriaFtr = async (body) => {
  const transaction = await models.sequelize.transaction();
  try {
    const categoria = await models.Categoria.create(body, { transaction });
    await transaction.commit();
    return categoria;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const updateCategoriaFtr = async (id, body) => {
  const transaction = await models.sequelize.transaction();
  try {
    const categoria = await getCategoriaFtr(id);
    await categoria.update(body, { transaction });
    await transaction.commit();
    return categoria;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const deleteCategoriaFtr = async (id) => {
  const categoria = await getCategoriaFtr(id);
  await categoria.update({ estado: 0 });
  return true;
};

module.exports = {
  getCategoriasFtr,
  getCategoriaFtr,
  createCategoriaFtr,
  updateCategoriaFtr,
  deleteCategoriaFtr,
};
