const { Op } = require("sequelize");
const models = require("../../models/mysql");

const getPermisosFtr = async (query) => {
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

    const { count, rows } = await models.Permiso.findAndCountAll(findOptions);
    return {
      data: rows,
      meta: { total: count, totalPages: Math.ceil(count / limit), currentPage: page, limit },
    };
  }

  const { count, rows } = await models.Permiso.findAndCountAll(findOptions);
  return { data: rows, meta: { total: count } };
};

const getPermisoFtr = async (id) => {
  const permiso = await models.Permiso.findByPk(id);

  if (!permiso) {
    const error = new Error("Permiso no encontrado");
    error.status = 404;
    throw error;
  }

  return permiso;
};

const createPermisoFtr = async (body) => {
  const transaction = await models.sequelize.transaction();

  try {
    const permiso = await models.Permiso.create(body, { transaction });
    await transaction.commit();
    return permiso;
  } catch (error) {
    await transaction.rollback();

    if (error.name === "SequelizeUniqueConstraintError") {
      const err = new Error("El nombre del permiso ya existe");
      err.status = 409;
      throw err;
    }

    throw error;
  }
};

const updatePermisoFtr = async (id, body) => {
  const transaction = await models.sequelize.transaction();

  try {
    const permiso = await models.Permiso.findByPk(id);

    if (!permiso) {
      const error = new Error("Permiso no encontrado");
      error.status = 404;
      throw error;
    }

    await permiso.update(body, { transaction });
    await transaction.commit();
    return permiso;
  } catch (error) {
    await transaction.rollback();

    if (error.name === "SequelizeUniqueConstraintError") {
      const err = new Error("El nombre del permiso ya existe");
      err.status = 409;
      throw err;
    }

    throw error;
  }
};

const deletePermisoFtr = async (id) => {
  const permiso = await models.Permiso.findByPk(id);

  if (!permiso) {
    const error = new Error("Permiso no encontrado");
    error.status = 404;
    throw error;
  }

  await permiso.destroy();
  return true;
};

module.exports = {
  getPermisosFtr,
  getPermisoFtr,
  createPermisoFtr,
  updatePermisoFtr,
  deletePermisoFtr,
};
