const { Op } = require("sequelize");
const models = require("../../models/mysql");

const getSucursalesFtr = async (query) => {
  const search = query.search || "";
  const hasPagination = query.page !== undefined || query.limit !== undefined;

  let where = { estado: 1 };
  if (search) {
    where[Op.or] = [
      { nombre: { [Op.like]: `%${search}%` } },
      { direccion: { [Op.like]: `%${search}%` } },
    ];
  }

  let findOptions = { where, order: [["nombre", "ASC"]] };

  if (hasPagination) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    findOptions.limit = limit;
    findOptions.offset = (page - 1) * limit;

    const { count, rows } = await models.Sucursal.findAndCountAll(findOptions);
    return {
      data: rows,
      meta: { total: count, totalPages: Math.ceil(count / limit), currentPage: page, limit },
    };
  }

  const { count, rows } = await models.Sucursal.findAndCountAll(findOptions);
  return { data: rows, meta: { total: count } };
};

const getSucursalFtr = async (id) => {
  const sucursal = await models.Sucursal.findByPk(id);
  if (!sucursal) {
    const error = new Error("Sucursal no encontrada");
    error.status = 404;
    throw error;
  }
  return sucursal;
};

const createSucursalFtr = async (body) => {
  const transaction = await models.sequelize.transaction();
  try {
    const sucursal = await models.Sucursal.create(body, { transaction });
    await transaction.commit();
    return sucursal;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const updateSucursalFtr = async (id, body) => {
  const transaction = await models.sequelize.transaction();
  try {
    const sucursal = await getSucursalFtr(id);
    await sucursal.update(body, { transaction });
    await transaction.commit();
    return sucursal;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const deleteSucursalFtr = async (id) => {
  const sucursal = await getSucursalFtr(id);
  await sucursal.update({ estado: 0 });
  return true;
};

module.exports = {
  getSucursalesFtr,
  getSucursalFtr,
  createSucursalFtr,
  updateSucursalFtr,
  deleteSucursalFtr,
};
