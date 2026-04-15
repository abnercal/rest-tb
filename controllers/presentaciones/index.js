const feature = require("./feature");
const { successResponse, errorResponse } = require("../../utils/handleError");

const getPresentacionesCtrl = async (req, res) => {
  try {
    const result = await feature.getPresentacionesFtr(req.query);
    return successResponse(res, "Lista de presentaciones", result.data, result.meta);
  } catch (error) {
    return errorResponse(res, error, "Error al obtener presentaciones");
  }
};

const getPresentacionCtrl = async (req, res) => {
  try {
    const result = await feature.getPresentacionFtr(req.params.id);
    return successResponse(res, "Presentación encontrada", result);
  } catch (error) {
    return errorResponse(res, error, "Error al obtener presentación");
  }
};

const createPresentacionCtrl = async (req, res) => {
  try {
    const data = await feature.createPresentacionFtr(req.body);
    return successResponse(res, "Presentación creada", data, null, 201);
  } catch (error) {
    return errorResponse(res, error, "Error al crear presentación");
  }
};

const updatePresentacionCtrl = async (req, res) => {
  try {
    const data = await feature.updatePresentacionFtr(req.params.id, req.body);
    return successResponse(res, "Presentación actualizada", data);
  } catch (error) {
    return errorResponse(res, error, "Error al actualizar presentación");
  }
};

const deletePresentacionCtrl = async (req, res) => {
  try {
    await feature.deletePresentacionFtr(req.params.id);
    return successResponse(res, "Presentación eliminada");
  } catch (error) {
    return errorResponse(res, error, "Error al eliminar presentación");
  }
};

module.exports = {
  getPresentacionesCtrl,
  getPresentacionCtrl,
  createPresentacionCtrl,
  updatePresentacionCtrl,
  deletePresentacionCtrl,
};
