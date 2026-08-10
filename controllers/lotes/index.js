const feature = require("./feature.js");
const { successResponse, errorResponse } = require("../../utils/handleError.js");

const getLotesCtrl = async (req, res) => {
  try {
    const result = await feature.getLotesFtr(req.query);
    return successResponse(res, "Lista de lotes", result.data, result.meta);
  } catch (error) {
    return errorResponse(res, error, "Error al obtener lotes");
  }
};

const getLotesPorVencerCtrl = async (req, res) => {
  try {
    const result = await feature.getLotesPorVencerFtr(req.query);
    return successResponse(res, "Lotes por vencer", result);
  } catch (error) {
    return errorResponse(res, error, "Error al obtener lotes por vencer");
  }
};

module.exports = {
  getLotesCtrl,
  getLotesPorVencerCtrl,
};
