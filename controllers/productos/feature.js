const { Op } = require("sequelize");
const models = require("../../models/mysql");

const INCLUDE_PRODUCTO = ["Marca", "Presentacion", "Categoria", "Unidad"];

const getProductosFtr = async (query) => {
  const { page = 1, limit = 20, search = "" } = query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let where = { estado: 1 };
  if (search) {
    where[Op.or] = [
      { nombre: { [Op.like]: `%${search}%` } },
      { descripcion: { [Op.like]: `%${search}%` } },
    ];
  }

  const { count, rows } = await models.Producto.findAndCountAll({
    where,
    include: INCLUDE_PRODUCTO,
    limit: parseInt(limit),
    offset,
    order: [["nombre", "ASC"]],
    distinct: true,
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

const getProductoFtr = async (id) => {
  const producto = await models.Producto.findOne({
    where: { codigoprod: id },
    include: INCLUDE_PRODUCTO,
  });
  if (!producto) {
    const error = new Error("Producto no encontrado");
    error.status = 404;
    throw error;
  }
  return producto;
};

const createProductoFtr = async (body) => {
  const transaction = await models.sequelize.transaction();
  try {
    const producto = await models.Producto.create(body, { transaction });
    await transaction.commit();
    return models.Producto.findOne({
      where: { codigoprod: producto.codigoprod },
      include: INCLUDE_PRODUCTO,
    });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const updateProductoFtr = async (id, body) => {
  const transaction = await models.sequelize.transaction();
  try {
    const producto = await getProductoFtr(id);
    await producto.update(body, { transaction });
    await transaction.commit();
    return models.Producto.findOne({
      where: { codigoprod: id },
      include: INCLUDE_PRODUCTO,
    });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const deleteProductoFtr = async (id) => {
  const producto = await getProductoFtr(id);
  await producto.update({ estado: 0 });
  return true;
};

module.exports = {
  getProductosFtr,
  getProductoFtr,
  createProductoFtr,
  updateProductoFtr,
  deleteProductoFtr,
};
