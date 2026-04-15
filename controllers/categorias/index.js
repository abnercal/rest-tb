const feature = require("./feature");
const { successResponse, errorResponse } = require("../../utils/handleError");

const getCategoriasCtrl = async (req, res) => {
  try {
    const result = await feature.getCategoriasFtr(req.query);
    return successResponse(res, "Lista de categorías", result.data, result.meta);
  } catch (error) {
    return errorResponse(res, error, "Error al obtener categorías");
  }
};

const getCategoriaCtrl = async (req, res) => {
  try {
    const result = await feature.getCategoriaFtr(req.params.id);
    return successResponse(res, "Categoría encontrada", result);
  } catch (error) {
    return errorResponse(res, error, "Error al obtener categoría");
  }
};

const createCategoriaCtrl = async (req, res) => {
  try {
    const data = await feature.createCategoriaFtr(req.body);
    return successResponse(res, "Categoría creada", data, null, 201);
  } catch (error) {
    return errorResponse(res, error, "Error al crear categoría");
  }
};

const updateCategoriaCtrl = async (req, res) => {
  try {
    const data = await feature.updateCategoriaFtr(req.params.id, req.body);
    return successResponse(res, "Categoría actualizada", data);
  } catch (error) {
    return errorResponse(res, error, "Error al actualizar categoría");
  }
};

const deleteCategoriaCtrl = async (req, res) => {
  try {
    await feature.deleteCategoriaFtr(req.params.id);
    return successResponse(res, "Categoría eliminada");
  } catch (error) {
    return errorResponse(res, error, "Error al eliminar categoría");
  }
};

module.exports = {
  getCategoriasCtrl,
  getCategoriaCtrl,
  createCategoriaCtrl,
  updateCategoriaCtrl,
  deleteCategoriaCtrl,
};
