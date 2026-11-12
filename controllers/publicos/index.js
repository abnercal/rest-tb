const feature  = require("./feature.js")
const { successResponse, errorResponse } = require("../../utils/handleError.js")

const getPublicosCtrl = async (req, res) => {
  try {
    const result  = await feature.getPublicosFtr(req.query);
    return successResponse(
      res,
      "Lista de públicos objetivo",
      result.data,
      result.meta
    )
  } catch (error) {
    return errorResponse(res, error, "Error al obtener públicos objetivo");
  }
};

const getPublicoCtrl = async (req, res) => {
  try {
    const result  = await feature.getPublicoFtr(req.params.id);
    return successResponse(
      res,
      "Público objetivo encontrado",
      result,
    )
  } catch (error) {
    return errorResponse(res, error, "Error al obtener público objetivo");
  }
};

const createPublicoCtrl = async (req, res) => {
  try {
    const data = await feature.createPublicoFtr(req.body);

    return successResponse(res, "Público objetivo creado", data, null, 201);

  } catch (error) {
    return errorResponse(res, error, "Error al crear público objetivo");
  }
};
const updatePublicoCtrl = async (req, res) => {
  try {
    const data = await feature.updatePublicoFtr(req.params.id, req.body);

    return successResponse(res, "Público objetivo actualizado", data);

  } catch (error) {
    return errorResponse(res, error, "Error al actualizar público objetivo");
  }
};
const delPublicoCtrl = async (req, res) => {
  try {
    await feature.delPublicoFtr(req.params.id)

    return successResponse(res, "Público objetivo eliminado");

  } catch (error) {
    return errorResponse(res, error, "Error al eliminar público objetivo");
  }
};

module.exports = {
  getPublicosCtrl,
  getPublicoCtrl,
  createPublicoCtrl,
  updatePublicoCtrl,
  delPublicoCtrl,
};
