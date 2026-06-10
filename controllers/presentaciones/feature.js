const { Op } = require("sequelize");
const models = require("../../models/mysql");

const getPresentacionesFtr = async (query) => {
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

    const { count, rows } = await models.Presentacion.findAndCountAll(findOptions);
    return {
      data: rows,
      meta: { total: count, totalPages: Math.ceil(count / limit), currentPage: page, limit },
    };
  }

  const { count, rows } = await models.Presentacion.findAndCountAll(findOptions);
  return { data: rows, meta: { total: count } };
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
