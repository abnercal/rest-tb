const feature = require("./feature");
const { successResponse, errorResponse } = require("../../utils/handleError");

const getVentasCtrl = async (req, res) => {
  try {
    const result = await feature.getVentasFtr(req.query, req.user);
    return successResponse(res, "Lista de ventas", result.data, result.meta);
  } catch (error) {
    return errorResponse(res, error, "Error al obtener ventas");
  }
};

const getVentaCtrl = async (req, res) => {
  try {
    const result = await feature.getVentaFtr(req.params.id, req.user);
    return successResponse(res, "Venta encontrada", result);
  } catch (error) {
    return errorResponse(res, error, "Error al obtener venta");
  }
};

const createVentaCtrl = async (req, res) => {
  try {
    const data = await feature.createVentaFtr(req.body, req.user);
    return successResponse(res, "Venta registrada", data, null, 201);
  } catch (error) {
    return errorResponse(res, error, "Error al registrar venta");
  }
};

const updateVentaCtrl = async (req, res) => {
  try {
    const data = await feature.updateVentaFtr(req.params.id, req.body, req.user);
    return successResponse(res, "Venta actualizada", data);
  } catch (error) {
    return errorResponse(res, error, "Error al actualizar venta");
  }
};

const deleteVentaCtrl = async (req, res) => {
  try {
    await feature.deleteVentaFtr(req.params.id, req.user);
    return successResponse(res, "Venta eliminada");
  } catch (error) {
    return errorResponse(res, error, "Error al eliminar venta");
  }
};

const convertirCotizacionCtrl = async (req, res) => {
  try {
    const data = await feature.convertirCotizacionFtr(req.params.id, req.body, req.user);
    return successResponse(res, "Cotización convertida a venta", data);
  } catch (error) {
    return errorResponse(res, error, "Error al convertir cotización");
  }
};

const marcarEntregadaCtrl = async (req, res) => {
  try {
    const data = await feature.marcarEntregadaFtr(req.params.id, req.user);
    return successResponse(res, "Venta marcada como entregada", data);
  } catch (error) {
    return errorResponse(res, error, "Error al marcar venta como entregada");
  }
};

const registrarPagoCtrl = async (req, res) => {
  try {
    const data = await feature.registrarPagoFtr(req.params.id, req.body, req.user);
    return successResponse(res, "Pago registrado", data, null, 201);
  } catch (error) {
    return errorResponse(res, error, "Error al registrar pago");
  }
};

const nextCodeCtrl = async (req, res) => {
  try {
    const result = await feature.nextCodeFtr();
    return successResponse(res, "Siguiente código", result);
  } catch (error) {
    return errorResponse(res, error, "Error al generar código");
  }
};

module.exports = {
  getVentasCtrl,
  getVentaCtrl,
  createVentaCtrl,
  updateVentaCtrl,
  deleteVentaCtrl,
  convertirCotizacionCtrl,
  marcarEntregadaCtrl,
  registrarPagoCtrl,
  nextCodeCtrl,
};
