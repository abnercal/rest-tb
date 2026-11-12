const feature  = require("./feature.js")
const { successResponse, errorResponse } = require("../../utils/handleError.js")

const getTallasCtrl = async (req, res) => {
  try {
    const result  = await feature.getTallasFtr(req.query);
    return successResponse(
      res,
      "Lista de tallas",
      result.data,
      result.meta
    )
  } catch (error) {
    return errorResponse(res, error, "Error al obtener tallas");
  }
};

const getTallaCtrl = async (req, res) => {
  try {
    const result  = await feature.getTallaFtr(req.params.id);
    return successResponse(
      res,
      "Talla encontrada",
      result,
    )
  } catch (error) {
    return errorResponse(res, error, "Error al obtener talla");
  }
};

const createTallaCtrl = async (req, res) => {
  try {
    const data = await feature.createTallaFtr(req.body);

    return successResponse(res, "Talla creada", data, null, 201);

  } catch (error) {
    return errorResponse(res, error, "Error al crear talla");
  }
};
const updateTallaCtrl = async (req, res) => {
  try {
    const data = await feature.updateTallaFtr(req.params.id, req.body);

    return successResponse(res, "Talla actualizada", data);

  } catch (error) {
    return errorResponse(res, error, "Error al actualizar talla");
  }
};
const delTallaCtrl = async (req, res) => {
  try {
    await feature.delTallaFtr(req.params.id)

    return successResponse(res, "Talla eliminada");

  } catch (error) {
    return errorResponse(res, error, "Error al eliminar talla");
  }
};

module.exports = {
  getTallasCtrl,
  getTallaCtrl,
  createTallaCtrl,
  updateTallaCtrl,
  delTallaCtrl,
};
