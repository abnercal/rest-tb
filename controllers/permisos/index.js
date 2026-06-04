const feature = require("./feature");
const { successResponse, errorResponse } = require("../../utils/handleError");

const getPermisosCtrl = async (req, res) => {
  try {
    const result = await feature.getPermisosFtr(req.query);
    return successResponse(res, "Lista de permisos", result.data, result.meta);
  } catch (error) {
    return errorResponse(res, error, "Error al obtener permisos");
  }
};

const getPermisoCtrl = async (req, res) => {
  try {
    const result = await feature.getPermisoFtr(req.params.id);
    return successResponse(res, "Permiso encontrado", result);
  } catch (error) {
    return errorResponse(res, error, "Error al obtener permiso");
  }
};

const createPermisoCtrl = async (req, res) => {
  try {
    const data = await feature.createPermisoFtr(req.body);
    return successResponse(res, "Permiso creado", data, null, 201);
  } catch (error) {
    return errorResponse(res, error, "Error al crear permiso");
  }
};

const updatePermisoCtrl = async (req, res) => {
  try {
    const data = await feature.updatePermisoFtr(req.params.id, req.body);
    return successResponse(res, "Permiso actualizado", data);
  } catch (error) {
    return errorResponse(res, error, "Error al actualizar permiso");
  }
};

const deletePermisoCtrl = async (req, res) => {
  try {
    await feature.deletePermisoFtr(req.params.id);
    return successResponse(res, "Permiso eliminado");
  } catch (error) {
    return errorResponse(res, error, "Error al eliminar permiso");
  }
};

module.exports = {
  getPermisosCtrl,
  getPermisoCtrl,
  createPermisoCtrl,
  updatePermisoCtrl,
  deletePermisoCtrl,
};
