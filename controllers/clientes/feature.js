const models = require("../../models/mysql/index");

/**
 * Obtener todos los clientes
 * @param {Object} query - Parámetros de consulta (paginación, filtros, etc.)
 * @returns {Array} - Lista de clientes
 */
const getClientes = async (query = {}) => {
  try {
    const { page = 1, limit = 10, search = "" } = query;
    const offset = (page - 1) * limit;

    let whereCondition = {};
    if (search) {
      whereCondition = {
        [models.Sequelize.Op.or]: [
          { nombres: { [models.Sequelize.Op.like]: `%${search}%` } },
          { apellidos: { [models.Sequelize.Op.like]: `%${search}%` } },
          { email: { [models.Sequelize.Op.like]: `%${search}%` } },
        ],
      };
    }

    const clientes = await models.Cliente.findAll({
      where: whereCondition,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["codigo", "ASC"]], // Ordenar por código de cliente
    });

    const totalClientes = await models.Cliente.count({ where: whereCondition });

    return {
      clientes,
      total: totalClientes,
      totalPages: Math.ceil(totalClientes / limit),
      currentPage: parseInt(page),
    };
  } catch (error) {
    throw new Error(`Error al obtener los clientes: ${error.message}`);
  }
};

/**
 * Obtener un cliente por su ID
 * @param {String} id - ID del cliente
 * @returns {Object} - Cliente encontrado
 */
const getClienteById = async (id) => {
  try {
    const cliente = await models.Cliente.findOne({
      where: { nit: id }, // Buscar por el campo "codigo"
    });
    if (!cliente) {
      throw new Error('Cliente no encontrado');
    }
    return cliente;
  } catch (error) {
    throw new Error(`Error al obtener el cliente: ${error.message}`);
  }
};

/**
 * Crear un nuevo cliente
 * @param {Object} data - Datos del cliente
 * @returns {Object} - Cliente creado
 */
const createCliente = async (data) => {
  try {
    const nuevoCliente = await models.Cliente.create(data);
    return nuevoCliente;
  } catch (error) {
    throw new Error(`Error al crear el cliente: ${error.message}`);
  }
};

/**
 * Actualizar un cliente existente
 * @param {String} id - ID del cliente
 * @param {Object} data - Datos actualizados del cliente
 * @returns {Object} - Cliente actualizado
 */
const updateCliente = async (id, data) => {
  try {
    const cliente = await models.Cliente.findByPk(id);
    if (!cliente) {
      throw new Error('Cliente no encontrado');
    }
    const clienteActualizado = await cliente.update(data);
    return clienteActualizado;
  } catch (error) {
    throw new Error(`Error al actualizar el cliente: ${error.message}`);
  }
};

/**
 * Eliminar un cliente
 * @param {String} id - ID del cliente
 */
const deleteCliente = async (id) => {
  try {
    const cliente = await models.Cliente.findByPk(id);
    if (!cliente) {
      throw new Error('Cliente no encontrado');
    }
    await cliente.destroy();
  } catch (error) {
    throw new Error(`Error al eliminar el cliente: ${error.message}`);
  }
};

module.exports = {
  getClientes,
  getClienteById,
  createCliente,
  updateCliente,
  deleteCliente,
};