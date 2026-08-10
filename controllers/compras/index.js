const feature = require("./feature");
const { successResponse,errorResponse } = require("../../utils/handleError");


const getComprasCtrl = async (req, res) => {
  try {
    const result = await feature.getComprasFtr(req.query);
    return successResponse(res, "Lista de compras", result.data, result.meta);
  } catch (error) {
    return errorResponse(res, error, "Error al obtener compras");
  }
};


const getCompraCtrl = async (req, res) => {
  try {
    const result = await feature.getCompraFtr(req.params.id);
    return successResponse(res, "Compra encontrada", result);
  } catch (error) {
    return errorResponse(res, error, "Error al obtener compra");
  }
};

const createCompraCtrl = async (req, res) => {
  try {
    const data = await feature.createCompraFtr(req.body);
    return successResponse(res, "Compra registrada", data, null, 201);
  } catch (error) {
    return errorResponse(res, error, "Error al registrar compra");
  }
};

const updateCompraCtrl = async (req, res) => {
  try {
    const data = await feature.updateCompraFtr(req.params.id, req.body);
    return successResponse(res, "Compra actualizada", data);
  } catch (error) {
    return errorResponse(res, error, "Error al actualizar compra");
  }
};

const deleteCompraCtrl = async (req, res) => {
  try {
    await feature.deleteCompraFtr(req.params.id);
    return successResponse(res, "Compra eliminada");
  } catch (error) {
    return errorResponse(res, error, "Error al eliminar compra");
  }
};

const registrarPagoCompraCtrl = async (req, res) => {
  try {
    const data = await feature.registrarPagoCompraFtr(req.params.id, req.body);
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
  getComprasCtrl,
  getCompraCtrl,
  createCompraCtrl,
  updateCompraCtrl,
  deleteCompraCtrl,
  registrarPagoCompraCtrl,
  nextCodeCtrl,
};

