const { Op } = require("sequelize");
const models = require("../../models/mysql");

const getSucursalesFtr = async (query) => {
  const { page = 1, limit = 20, search = "" } = query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let where = { estado: 1 };
  if (search) {
    where[Op.or] = [
      { nombre: { [Op.like]: `%${search}%` } },
      { direccion: { [Op.like]: `%${search}%` } },
    ];
  }

  const { count, rows } = await models.Sucursal.findAndCountAll({
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
