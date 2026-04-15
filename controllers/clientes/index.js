const feature = require('./feature');
const { successResponse, errorResponse } = require("../../utils/handleError");

/**
 * Obtener todos los clientes
 * @param {Object} req - Objeto de solicitud HTTP
 * @param {Object} res - Objeto de respuesta HTTP
 */
const getClientesCtrl = async (req, res) => {
  try {
    const result = await feature.getClientesFtr(req.query);
    return successResponse(res, "Lista de clientes", result.data, result.meta);
  } catch (error) {
    return errorResponse(res, error, "Error al obtener clientes");
  }
};

/**
 * Obtener un cliente por su ID
 * @param {Object} req - Objeto de solicitud HTTP
 * @param {Object} res - Objeto de respuesta HTTP
 */
const getClienteCtrl = async (req, res) => {
  try {
    const result = await feature.getClienteFtr(req.params.id);
    return successResponse(res, "Cliente encontrado", result);
  } catch (error) {
    return errorResponse(res, error, "Error al obtener cliente");
  }
};

/**
 * Crear un nuevo cliente
 * @param {Object} req - Objeto de solicitud HTTP
 * @param {Object} res - Objeto de respuesta HTTP
 */
const createClienteCtrl = async (req, res) => {
  try {
    const data = await feature.createClienteFtr(req.body);
    return successResponse(res, "Cliente creado", data, null, 201);
  } catch (error) {
    return errorResponse(res, error, "Error al crear cliente");
  }
};

/**
 * Actualizar un cliente existente
 * @param {Object} req - Objeto de solicitud HTTP
 * @param {Object} res - Objeto de respuesta HTTP
 */
const updateClienteCtrl = async (req, res) => {
  try {
    const data = await feature.updateClienteFtr(req.params.id, req.body);
    return successResponse(res, "Cliente actualizado", data);
  } catch (error) {
    return errorResponse(res, error, "Error al actualizar cliente");
  }
};

/**
 * Eliminar un cliente
 * @param {Object} req - Objeto de solicitud HTTP
 * @param {Object} res - Objeto de respuesta HTTP
 */
const deleteClienteCtrl = async (req, res) => {
  try {
    await feature.deleteClienteFtr(req.params.id);
    return successResponse(res, "Cliente eliminado");
  } catch (error) {
    return errorResponse(res, error, "Error al eliminar cliente");
  }
};

module.exports = {
  getClientesCtrl,
  getClienteCtrl,
  createClienteCtrl,
  updateClienteCtrl,
  deleteClienteCtrl,
};