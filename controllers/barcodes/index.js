const feature = require("./feature.js");
const { successResponse, errorResponse } = require("../../utils/handleError.js");

const getBarcodesCtrl = async (req, res) => {
  try {
    const result = await feature.getBarcodesFtr(req.query);
    return successResponse(res, "Lista de códigos de barras", result.data, result.meta);
  } catch (error) {
    return errorResponse(res, error, "Error al obtener códigos de barras");
  }
};

const getBarcodeCtrl = async (req, res) => {
  try {
    const result = await feature.getBarcodeFtr(req.params.id);
    return successResponse(res, "Código de barras encontrado", result);
  } catch (error) {
    return errorResponse(res, error, "Error al obtener código de barras");
  }
};

const lookupBarcodeCtrl = async (req, res) => {
  try {
    const result = await feature.lookupBarcodeFtr(req.params.barcode);
    return successResponse(res, "Código de barras encontrado", result);
  } catch (error) {
    return errorResponse(res, error, "Error al buscar código de barras");
  }
};

const createBarcodeCtrl = async (req, res) => {
  try {
    const data = await feature.createBarcodeFtr(req.body);
    return successResponse(res, "Código de barras creado", data, null, 201);
  } catch (error) {
    return errorResponse(res, error, "Error al crear código de barras");
  }
};

const updateBarcodeCtrl = async (req, res) => {
  try {
    const data = await feature.updateBarcodeFtr(req.params.id, req.body);
    return successResponse(res, "Código de barras actualizado", data);
  } catch (error) {
    return errorResponse(res, error, "Error al actualizar código de barras");
  }
};

const deleteBarcodeCtrl = async (req, res) => {
  try {
    await feature.deleteBarcodeFtr(req.params.id);
    return successResponse(res, "Código de barras eliminado");
  } catch (error) {
    return errorResponse(res, error, "Error al eliminar código de barras");
  }
};

module.exports = {
  getBarcodesCtrl,
  getBarcodeCtrl,
  lookupBarcodeCtrl,
  createBarcodeCtrl,
  updateBarcodeCtrl,
  deleteBarcodeCtrl,
};
