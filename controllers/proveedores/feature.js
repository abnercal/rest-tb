const { Op } = require("sequelize");
const models = require("../../models/mysql");

const getProveedoresFtr = async (query) => {
  const search = query.search || "";
  const hasPagination = query.page !== undefined || query.limit !== undefined;

  let where = { estado: 1 };
  if (search) {
    where[Op.or] = [
      { nombre: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } },
      { telefono: { [Op.like]: `%${search}%` } },
    ];
  }

  let findOptions = { where, order: [["nombre", "ASC"]] };

  if (hasPagination) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    findOptions.limit = limit;
    findOptions.offset = (page - 1) * limit;

    const { count, rows } = await models.Proveedor.findAndCountAll(findOptions);
    return {
      data: rows,
      meta: { total: count, totalPages: Math.ceil(count / limit), currentPage: page, limit },
    };
  }

  const { count, rows } = await models.Proveedor.findAndCountAll(findOptions);
  return { data: rows, meta: { total: count } };
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
