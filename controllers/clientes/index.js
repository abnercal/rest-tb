const feature = require('./feature');
const { handleHttpError } = require("../../utils/manejoError");

/**
 * Obtener todos los clientes
 * @param {Object} req - Objeto de solicitud HTTP
 * @param {Object} res - Objeto de respuesta HTTP
 */
const getClientes = async (req, res) => {
  try {
    const clientes = await feature.getClientes(req.query);
    res.status(200).json(clientes);
  } catch (error) {
    handleHttpError(res, error, "Error al obtener los clientes", 500);
  }
};

/**
 * Obtener un cliente por su ID
 * @param {Object} req - Objeto de solicitud HTTP
 * @param {Object} res - Objeto de respuesta HTTP
 */
const getClienteById = async (req, res) => {
  try {
    const { id } = req.params;
    const cliente = await feature.getClienteById(id);
    res.status(200).json(cliente);
  } catch (error) {
    handleHttpError(res, error, "Error al obtener el cliente", 500);
  }
};

/**
 * Crear un nuevo cliente
 * @param {Object} req - Objeto de solicitud HTTP
 * @param {Object} res - Objeto de respuesta HTTP
 */
const crearCliente = async (req, res) => {
  try {
    const nuevoCliente = await feature.createCliente(req.body);
    res.status(201).json(nuevoCliente);
  } catch (error) {
    handleHttpError(res, error, "Error al crear el cliente", 500);
  }
};

/**
 * Actualizar un cliente existente
 * @param {Object} req - Objeto de solicitud HTTP
 * @param {Object} res - Objeto de respuesta HTTP
 */
const updateCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const clienteActualizado = await feature.updateCliente(id, req.body);
    res.status(200).json(clienteActualizado);
  } catch (error) {
    handleHttpError(res, error, "Error al actualizar el cliente", 500);
  }
};

/**
 * Eliminar un cliente
 * @param {Object} req - Objeto de solicitud HTTP
 * @param {Object} res - Objeto de respuesta HTTP
 */
const deleteCliente = async (req, res) => {
  try {
    const { id } = req.params;
    await feature.deleteCliente(id);
    res.status(204).send(); // No Content
  } catch (error) {
    handleHttpError(res, error, "Error al eliminar el cliente", 500);
  }
};

module.exports = {
  getClientes,
  getClienteById,
  crearCliente,
  updateCliente,
  deleteCliente,
};