const feature = require("./feature");
const { successResponse, errorResponse } = require("../../utils/handleError");

const getRolesCtrl = async (req, res) => {
  try {
    const result = await feature.getRolesFtr(req.query);
    return successResponse(res, "Lista de roles", result.data, result.meta);
  } catch (error) {
    return errorResponse(res, error, "Error al obtener roles");
  }
};

const getRolCtrl = async (req, res) => {
  try {
    const result = await feature.getRolFtr(req.params.id);
    return successResponse(res, "Rol encontrado", result);
  } catch (error) {
    return errorResponse(res, error, "Error al obtener rol");
  }
};

const createRolCtrl = async (req, res) => {
  try {
    const data = await feature.createRolFtr(req.body);
    return successResponse(res, "Rol creado", data, null, 201);
  } catch (error) {
    return errorResponse(res, error, "Error al crear rol");
  }
};

const updateRolCtrl = async (req, res) => {
  try {
    const data = await feature.updateRolFtr(req.params.id, req.body);
    return successResponse(res, "Rol actualizado", data);
  } catch (error) {
    return errorResponse(res, error, "Error al actualizar rol");
  }
};

const deleteRolCtrl = async (req, res) => {
  try {
    await feature.deleteRolFtr(req.params.id);
    return successResponse(res, "Rol eliminado");
  } catch (error) {
    return errorResponse(res, error, "Error al eliminar rol");
  }
};

module.exports = {
  getRolesCtrl,
  getRolCtrl,
  createRolCtrl,
  updateRolCtrl,
  deleteRolCtrl,
};
