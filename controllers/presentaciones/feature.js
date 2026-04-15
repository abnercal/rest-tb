const { Op } = require("sequelize");
const models = require("../../models/mysql");

const getPresentacionesFtr = async (query) => {
  const { page = 1, limit = 20, search = "" } = query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let where = {};
  if (search) {
    where[Op.or] = [{ nombre: { [Op.like]: `%${search}%` } }];
  }

  const { count, rows } = await models.Presentacion.findAndCountAll({
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

const getPresentacionFtr = async (id) => {
  const presentacion = await models.Presentacion.findByPk(id);
  if (!presentacion) {
    const error = new Error("Presentación no encontrada");
    error.status = 404;
    throw error;
  }
  return presentacion;
};

const createPresentacionFtr = async (body) => {
  const transaction = await models.sequelize.transaction();
  try {
    const presentacion = await models.Presentacion.create(body, { transaction });
    await transaction.commit();
    return presentacion;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const updatePresentacionFtr = async (id, body) => {
  const transaction = await models.sequelize.transaction();
  try {
    const presentacion = await getPresentacionFtr(id);
    await presentacion.update(body, { transaction });
    await transaction.commit();
    return presentacion;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const deletePresentacionFtr = async (id) => {
  const presentacion = await getPresentacionFtr(id);
  await presentacion.update({ estado: 0 });
  return true;
};

module.exports = {
  getPresentacionesFtr,
  getPresentacionFtr,
  createPresentacionFtr,
  updatePresentacionFtr,
  deletePresentacionFtr,
};
