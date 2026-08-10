const feature = require("./feature.js");
const { successResponse, errorResponse } = require("../../utils/handleError.js");

const getDescuentosCtrl = async (req, res) => {
  try {
    const result = await feature.getDescuentosFtr(req.query);
    return successResponse(res, "Lista de descuentos", result.data, result.meta);
  } catch (error) {
    return errorResponse(res, error, "Error al obtener descuentos");
  }
};

const getDescuentoCtrl = async (req, res) => {
  try {
    const result = await feature.getDescuentoFtr(req.params.id);
    return successResponse(res, "Descuento encontrado", result);
  } catch (error) {
    return errorResponse(res, error, "Error al obtener descuento");
  }
};

const createDescuentoCtrl = async (req, res) => {
  try {
    const data = await feature.createDescuentoFtr(req.body);
    return successResponse(res, "Descuento creado", data, null, 201);
  } catch (error) {
    return errorResponse(res, error, "Error al crear descuento");
  }
};

const updateDescuentoCtrl = async (req, res) => {
  try {
    const data = await feature.updateDescuentoFtr(req.params.id, req.body);
    return successResponse(res, "Descuento actualizado", data);
  } catch (error) {
    return errorResponse(res, error, "Error al actualizar descuento");
  }
};

const deleteDescuentoCtrl = async (req, res) => {
  try {
    await feature.deleteDescuentoFtr(req.params.id);
    return successResponse(res, "Descuento eliminado");
  } catch (error) {
    return errorResponse(res, error, "Error al eliminar descuento");
  }
};

module.exports = {
  getDescuentosCtrl,
  getDescuentoCtrl,
  createDescuentoCtrl,
  updateDescuentoCtrl,
  deleteDescuentoCtrl,
};
