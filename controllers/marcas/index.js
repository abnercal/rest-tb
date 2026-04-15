const feature  = require("./feature.js")
const { successResponse, errorResponse } = require("../../utils/handleError.js")

const getMarcasCtrl = async (req, res) => {
  try {
    const result  = await feature.getMarcasFtr(req.query);
    return successResponse(
      res,
      "Lista de marcas",
      result.data,
      result.meta
    )
  } catch (error) {
    return errorResponse(res, error, "Error al obtener marcas");
  }
};

const getMarcaCtrl = async (req, res) => {
  try {
    const result  = await feature.getMarcaFtr(req.params.id);
    return successResponse(
      res,
      "Marca encontrada",
      result,
    )
  } catch (error) {
    return errorResponse(res, error, "Error al obtener marcas");
  }
};

const createMarcasCtrl = async (req, res) => {
  try {
    const data = await feature.createMarcaFtr(req.body);

    return successResponse(res, "Marca creada", data, null, 201);

  } catch (error) {
    return errorResponse(res, error, "Error al crear marca");
  }
};
const updateMarcasCtrl = async (req, res) => {
  try {
    const data = await feature.updateMarcasFtr(req.params.id, req.body);

    return successResponse(res, "Marca actualizada", data);

  } catch (error) {
    return errorResponse(res, error, "Error al actualizar marca");
  }
};
const delMarcasCtrl = async (req, res) => {
  try {
    await feature.delMarcaFtr(req.params.id)

    return successResponse(res, "Marca eliminada");

  } catch (error) {
    return errorResponse(res, error, "Error al eliminar marca");
  }
};

module.exports = {
  getMarcasCtrl,
  getMarcaCtrl,
  createMarcasCtrl,
  updateMarcasCtrl,
  delMarcasCtrl,
};
