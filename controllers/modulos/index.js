const feature = require("./feature");
const { successResponse, errorResponse } = require("../../utils/handleError");

const getModulosCtrl = async (req, res) => {
  try {
    const result = await feature.getModulosFtr();
    return successResponse(res, "Lista de módulos", result);
  } catch (error) {
    return errorResponse(res, error, "Error al obtener módulos");
  }
};

const getModuloCtrl = async (req, res) => {
  try {
    const result = await feature.getModuloFtr(req.params.id);
    return successResponse(res, "Módulo encontrado", result);
  } catch (error) {
    return errorResponse(res, error, "Error al obtener módulo");
  }
};

const updateModuloCtrl = async (req, res) => {
  try {
    const data = await feature.updateModuloFtr(req.params.id, req.body);
    return successResponse(res, "Módulo actualizado", data);
  } catch (error) {
    return errorResponse(res, error, "Error al actualizar módulo");
  }
};

module.exports = {
  getModulosCtrl,
  getModuloCtrl,
  updateModuloCtrl,
};
