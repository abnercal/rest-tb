const { Op } = require("sequelize");
const models = require("../../models/mysql");

const getCategoriasFtr = async (query) => {
  const { page = 1, limit = 20, search = "" } = query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let where = {};
  if (search) {
    where[Op.or] = [{ nombre: { [Op.like]: `%${search}%` } }];
  }

  const { count, rows } = await models.Categoria.findAndCountAll({
    where,
    limit: parseInt(limit),
    offset,
    order: [["nombre", "ASC"]],
  });

  return {
    data: rows,
    meta: {
      total: count,
      totalPages: Math.ceil(count / parseInt(limit)),
      currentPage: parseInt(page),
      limit: parseInt(limit),
    },
  };
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
