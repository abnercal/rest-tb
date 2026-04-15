const feature = require("./feature");
const { successResponse, errorResponse } = require("../../utils/handleError");

const getUnidadesCtrl = async (req, res) => {
  try {
    const result = await feature.getUnidadesFtr(req.query);
    return successResponse(res, "Lista de unidades de medida", result.data, result.meta);
  } catch (error) {
    return errorResponse(res, error, "Error al obtener unidades");
  }
};

const getUnidadCtrl = async (req, res) => {
  try {
    const result = await feature.getUnidadFtr(req.params.id);
    return successResponse(res, "Unidad encontrada", result);
  } catch (error) {
    return errorResponse(res, error, "Error al obtener unidad");
  }
};

const createUnidadCtrl = async (req, res) => {
  try {
    const data = await feature.createUnidadFtr(req.body);
    return successResponse(res, "Unidad creada", data, null, 201);
  } catch (error) {
    return errorResponse(res, error, "Error al crear unidad");
  }
};

const updateUnidadCtrl = async (req, res) => {
  try {
    const data = await feature.updateUnidadFtr(req.params.id, req.body);
    return successResponse(res, "Unidad actualizada", data);
  } catch (error) {
    return errorResponse(res, error, "Error al actualizar unidad");
  }
};

const deleteUnidadCtrl = async (req, res) => {
  try {
    await feature.deleteUnidadFtr(req.params.id);
    return successResponse(res, "Unidad eliminada");
  } catch (error) {
    return errorResponse(res, error, "Error al eliminar unidad");
  }
};

module.exports = {
  getUnidadesCtrl,
  getUnidadCtrl,
  createUnidadCtrl,
  updateUnidadCtrl,
  deleteUnidadCtrl,
};
