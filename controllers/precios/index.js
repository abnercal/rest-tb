const feature = require("./feature.js");
const { successResponse, errorResponse } = require("../../utils/handleError.js");

const getPreciosCtrl = async (req, res) => {
  try {
    const result = await feature.getPreciosFtr(req.query);
    return successResponse(res, "Lista de precios", result.data, result.meta);
  } catch (error) {
    return errorResponse(res, error, "Error al obtener precios");
  }
};

const getPrecioCtrl = async (req, res) => {
  try {
    const result = await feature.getPrecioFtr(req.params.id);
    return successResponse(res, "Precio encontrado", result);
  } catch (error) {
    return errorResponse(res, error, "Error al obtener precio");
  }
};

const createPrecioCtrl = async (req, res) => {
  try {
    const data = await feature.createPrecioFtr(req.body);
    return successResponse(res, "Precio creado", data, null, 201);
  } catch (error) {
    return errorResponse(res, error, "Error al crear precio");
  }
};

const updatePrecioCtrl = async (req, res) => {
  try {
    const data = await feature.updatePrecioFtr(req.params.id, req.body);
    return successResponse(res, "Precio actualizado", data);
  } catch (error) {
    return errorResponse(res, error, "Error al actualizar precio");
  }
};

const deletePrecioCtrl = async (req, res) => {
  try {
    await feature.deletePrecioFtr(req.params.id);
    return successResponse(res, "Precio eliminado");
  } catch (error) {
    return errorResponse(res, error, "Error al eliminar precio");
  }
};

// ─── Consulta rápida ─────────────────────────────────────────────────────────

const getPrecioByPresentacionCtrl = async (req, res) => {
  try {
    const { idtipoCli } = req.query;
    const result = await feature.getPrecioByPresentacionFtr(
      req.params.idprodPresenta,
      idtipoCli
    );
    return successResponse(res, "Precio obtenido", result);
  } catch (error) {
    return errorResponse(res, error, "Error al obtener precio");
  }
};

// ─── Precios por producto ─────────────────────────────────────────────────────

const getPreciosByProductoCtrl = async (req, res) => {
  try {
    const result = await feature.getPreciosByProductoFtr(req.params.codigoprod);
    return successResponse(res, "Precios del producto", result);
  } catch (error) {
    return errorResponse(res, error, "Error al obtener precios del producto");
  }
};

module.exports = {
  getPreciosCtrl,
  getPrecioCtrl,
  createPrecioCtrl,
  updatePrecioCtrl,
  deletePrecioCtrl,
  getPrecioByPresentacionCtrl,
  getPreciosByProductoCtrl,
};
