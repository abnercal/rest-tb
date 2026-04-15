const { Op } = require("sequelize");
const models = require("../../models/mysql");

const getProveedoresFtr = async (query) => {
  const { page = 1, limit = 20, search = "" } = query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let where = { estado: 1 };
  if (search) {
    where[Op.or] = [
      { nombre: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } },
      { telefono: { [Op.like]: `%${search}%` } },
    ];
  }

  const { count, rows } = await models.Proveedor.findAndCountAll({
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

const getProveedorFtr = async (id) => {
  const proveedor = await models.Proveedor.findByPk(id);
  if (!proveedor) {
    const error = new Error("Proveedor no encontrado");
    error.status = 404;
    throw error;
  }
  return proveedor;
};

const createProveedorFtr = async (body) => {
  const transaction = await models.sequelize.transaction();
  try {
    const proveedor = await models.Proveedor.create(body, { transaction });
    await transaction.commit();
    return proveedor;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const updateProveedorFtr = async (id, body) => {
  const transaction = await models.sequelize.transaction();
  try {
    const proveedor = await getProveedorFtr(id);
    await proveedor.update(body, { transaction });
    await transaction.commit();
    return proveedor;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const deleteProveedorFtr = async (id) => {
  const proveedor = await getProveedorFtr(id);
  await proveedor.update({ estado: 0 });
  return true;
};

module.exports = {
  getProveedoresFtr,
  getProveedorFtr,
  createProveedorFtr,
  updateProveedorFtr,
  deleteProveedorFtr,
};
