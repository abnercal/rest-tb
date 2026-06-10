const { Op } = require("sequelize");
const models = require("../../models/mysql");

const getUnidadesFtr = async (query) => {
  const search = query.search || "";
  const hasPagination = query.page !== undefined || query.limit !== undefined;

  let where = {};
  if (search) {
    where[Op.or] = [
      { nombre: { [Op.like]: `%${search}%` } },
      { abreviatura: { [Op.like]: `%${search}%` } },
    ];
  }

  let findOptions = { where, order: [["nombre", "ASC"]] };

  if (hasPagination) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    findOptions.limit = limit;
    findOptions.offset = (page - 1) * limit;

    const { count, rows } = await models.UnidadMed.findAndCountAll(findOptions);
    return {
      data: rows,
      meta: { total: count, totalPages: Math.ceil(count / limit), currentPage: page, limit },
    };
  }

  const { count, rows } = await models.UnidadMed.findAndCountAll(findOptions);
  return { data: rows, meta: { total: count } };
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
