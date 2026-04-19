const feature = require("./feature");
const { successResponse, errorResponse } = require("../../utils/handleError");

const getVentasCtrl = async (req, res) => {
  try {
    const result = await feature.getVentasFtr(req.query);
    return successResponse(res, "Lista de ventas", result.data, result.meta);
  } catch (error) {
    return errorResponse(res, error, "Error al obtener ventas");
  }
};

const getVentaCtrl = async (req, res) => {
  try {
    const result = await feature.getVentaFtr(req.params.id);
    return successResponse(res, "Venta encontrada", result);
  } catch (error) {
    return errorResponse(res, error, "Error al obtener venta");
  }
};

const createVentaCtrl = async (req, res) => {
  try {
    const data = await feature.createVentaFtr(req.body);
    return successResponse(res, "Venta registrada", data, null, 201);
  } catch (error) {
    return errorResponse(res, error, "Error al registrar venta");
  }
};

const updateVentaCtrl = async (req, res) => {
  try {
    const data = await feature.updateVentaFtr(req.params.id, req.body);
    return successResponse(res, "Venta actualizada", data);
  } catch (error) {
    return errorResponse(res, error, "Error al actualizar venta");
  }
};

const deleteVentaCtrl = async (req, res) => {
  try {
    await feature.deleteVentaFtr(req.params.id);
    return successResponse(res, "Venta eliminada");
  } catch (error) {
    return errorResponse(res, error, "Error al eliminar venta");
  }
};

module.exports = {
  getVentasCtrl,
  getVentaCtrl,
  createVentaCtrl,
  updateVentaCtrl,
  deleteVentaCtrl,
};
