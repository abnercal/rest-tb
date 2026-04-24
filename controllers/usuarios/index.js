const feature = require("./feature");
const { successResponse, errorResponse } = require("../../utils/handleError");

/**
 * Obtener todos los usuarios
 */
const getUsuariosCtrl = async (req, res) => {
  try {
    const result = await feature.getUsuariosFtr(req, req.query);
    return successResponse(res, "Lista de usuarios", result.data, result.meta);
  } catch (error) {
    errorResponse(res, error, "Error al obtener los usuarios");
  }
};

/**
 * Obtener usuario por ID
 */
const getUsuarioCtrl = async (req, res) => {
  try {
    const { id } = req.params;
    const usuario = await feature.getUsuarioFtr(req, id);
    res.status(200).json(usuario);
  } catch (error) {
    errorResponse(res, error, "Error al obtener el usuario");
  }
};

/**
 * Crear usuario
 */
const createUsuarioCtrl = async (req, res) => {
  try {
    const data = await feature.createUsuarioFtr(req, req.body, req.file);
    return successResponse(res, "Usuario creado", data, null, 201);
  } catch (error) {
    return errorResponse(res, error, "Error al crear usuario");
  }
};

/**
 * Actualizar usuario
 */
const updateUsuarioCtrl = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await feature.updateUsuarioFtr(req, id, req.body, req.file);
    return successResponse(res, "Usuario actualizado", data);
  } catch (error) {
    return errorResponse(res, error, "Error al actualizar usuario");
  }
};

/**
 * Eliminar usuario
 */
const deleteUsuarioCtrl = async (req, res) => {
  try {
    const { id } = req.params;
    await feature.deleteUsuarioFtr(id);
    return successResponse(res, "Usuario eliminado");
  } catch (error) {
    return errorResponse(res, error, "Error al eliminar usuario");
  }
};

module.exports = {
  getUsuariosCtrl,
  getUsuarioCtrl,
  createUsuarioCtrl,
  updateUsuarioCtrl,
  deleteUsuarioCtrl,
};