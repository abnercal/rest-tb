const { Op } = require("sequelize");
const models = require("../../models/mysql");

const getClientesFtr = async (query) => {
  const search = query.search || "";
  const hasPagination = query.page !== undefined || query.limit !== undefined;

  let where = { estado: 1 };
  if (search) {
    where[Op.or] = [
      { nombres: { [Op.like]: `%${search}%` } },
      { apellidos: { [Op.like]: `%${search}%` } },
      { nit: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } },
    ];
  }

  let findOptions = {
    where,
    order: [["nombres", "ASC"]],
    include: [{ model: models.TipoCliente, as: "tipoClie" }],
  };

  if (hasPagination) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    findOptions.limit = limit;
    findOptions.offset = (page - 1) * limit;

    const { count, rows } = await models.Cliente.findAndCountAll(findOptions);
    return {
      data: rows,
      meta: { total: count, totalPages: Math.ceil(count / limit), currentPage: page, limit },
    };
  }

  const { count, rows } = await models.Cliente.findAndCountAll(findOptions);
  return { data: rows, meta: { total: count } };
};

const getClienteFtr = async (id) => {
  const cliente = await models.Cliente.findByPk(id);
  if (!cliente) {
    const error = new Error("Cliente no encontrado");
    error.status = 404;
    throw error;
  }
  return cliente;
};

const createClienteFtr = async (body) => {
  const transaction = await models.sequelize.transaction();
  try {
    // Validar NIT duplicado
    const existeNit = await models.Cliente.findOne({
      where: { nit: body.nit },
      transaction,
    });
    if (existeNit) {
      const error = new Error("El NIT ya está registrado");
      error.status = 409;
      throw error;
    }

    const cliente = await models.Cliente.create(body, { transaction });
    await transaction.commit();
    return cliente;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const updateClienteFtr = async (id, body) => {
  const transaction = await models.sequelize.transaction();
  try {
    const cliente = await getClienteFtr(id);
    await cliente.update(body, { transaction });
    await transaction.commit();
    return cliente;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

// Soft delete: estado = 0
const deleteClienteFtr = async (id) => {
  const cliente = await getClienteFtr(id);
  await cliente.update({ estado: 0 });
  return true;
};

module.exports = {
  getClientesFtr,
  getClienteFtr,
  createClienteFtr,
  updateClienteFtr,
  deleteClienteFtr,
};
