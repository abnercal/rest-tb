const feature = require("./feature");
const { successResponse, errorResponse } = require("../../utils/handleError");

const getProductosCtrl = async (req, res) => {
  try {
    const result = await feature.getProductosFtr(req, req.query);
    return successResponse(res, "Lista de productos", result.data, result.meta);
  } catch (error) {
    return errorResponse(res, error, "Error al obtener productos");
  }
};

const getProductoCtrl = async (req, res) => {
  try {
    const result = await feature.getProductoFtr(req, req.params.id, req.query);
    return successResponse(res, "Producto encontrado", result);
  } catch (error) {
    return errorResponse(res, error, "Error al obtener producto");
  }
};

const createProductoCtrl = async (req, res) => {
  try {
    const data = await feature.createProductoFtr(req, req.body, req.file);
    return successResponse(res, "Producto creado", data, null, 201);
  } catch (error) {
    return errorResponse(res, error, "Error al crear producto");
  }
};

const updateProductoCtrl = async (req, res) => {
  try {
    const data = await feature.updateProductoFtr(req, req.params.id, req.body, req.file);
    return successResponse(res, "Producto actualizado", data);
  } catch (error) {
    return errorResponse(res, error, "Error al actualizar producto");
  }
};

const deleteProductoCtrl = async (req, res) => {
  try {
    await feature.deleteProductoFtr(req, req.params.id);
    return successResponse(res, "Producto eliminado");
  } catch (error) {
    return errorResponse(res, error, "Error al eliminar producto");
  }
};

module.exports = {
  getProductosCtrl,
  getProductoCtrl,
  createProductoCtrl,
  updateProductoCtrl,
  deleteProductoCtrl,
};
