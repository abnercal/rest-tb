const feature  = require("./feature.js")
const { successResponse, errorResponse } = require("../../utils/handleError.js")

const getColoresCtrl = async (req, res) => {
  try {
    const result  = await feature.getColoresFtr(req.query);
    return successResponse(
      res,
      "Lista de colores",
      result.data,
      result.meta
    )
  } catch (error) {
    return errorResponse(res, error, "Error al obtener colores");
  }
};

const getColorCtrl = async (req, res) => {
  try {
    const result  = await feature.getColorFtr(req.params.id);
    return successResponse(
      res,
      "Color encontrado",
      result,
    )
  } catch (error) {
    return errorResponse(res, error, "Error al obtener color");
  }
};

const createColorCtrl = async (req, res) => {
  try {
    const data = await feature.createColorFtr(req.body);

    return successResponse(res, "Color creado", data, null, 201);

  } catch (error) {
    return errorResponse(res, error, "Error al crear color");
  }
};
const updateColorCtrl = async (req, res) => {
  try {
    const data = await feature.updateColorFtr(req.params.id, req.body);

    return successResponse(res, "Color actualizado", data);

  } catch (error) {
    return errorResponse(res, error, "Error al actualizar color");
  }
};
const delColorCtrl = async (req, res) => {
  try {
    await feature.delColorFtr(req.params.id)

    return successResponse(res, "Color eliminado");

  } catch (error) {
    return errorResponse(res, error, "Error al eliminar color");
  }
};

module.exports = {
  getColoresCtrl,
  getColorCtrl,
  createColorCtrl,
  updateColorCtrl,
  delColorCtrl,
};
