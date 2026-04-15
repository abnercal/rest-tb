const { Op } = require("sequelize");
const models = require("../../models/mysql");

const getUnidadesFtr = async (query) => {
  const { page = 1, limit = 20, search = "" } = query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let where = {};
  if (search) {
    where[Op.or] = [
      { nombre: { [Op.like]: `%${search}%` } },
      { abreviatura: { [Op.like]: `%${search}%` } },
    ];
  }

  const { count, rows } = await models.UnidadMed.findAndCountAll({
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

const getUnidadFtr = async (id) => {
  const unidad = await models.UnidadMed.findByPk(id);
  if (!unidad) {
    const error = new Error("Unidad de medida no encontrada");
    error.status = 404;
    throw error;
  }
  return unidad;
};

const createUnidadFtr = async (body) => {
  const transaction = await models.sequelize.transaction();
  try {
    const unidad = await models.UnidadMed.create(body, { transaction });
    await transaction.commit();
    return unidad;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const updateUnidadFtr = async (id, body) => {
  const transaction = await models.sequelize.transaction();
  try {
    const unidad = await getUnidadFtr(id);
    await unidad.update(body, { transaction });
    await transaction.commit();
    return unidad;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const deleteUnidadFtr = async (id) => {
  const unidad = await getUnidadFtr(id);
  await unidad.update({ estado: 0 });
  return true;
};

module.exports = {
  getUnidadesFtr,
  getUnidadFtr,
  createUnidadFtr,
  updateUnidadFtr,
  deleteUnidadFtr,
};
