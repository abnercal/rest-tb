const feature  = require("./feature.js")
const { successResponse, errorResponse } = require("../../utils/handleError.js")

const getTiposClieCtrl = async (req, res) => {
  try {
    const result  = await feature.getTiposlCieFtr(req.query);
    return successResponse(
      res,
      "Lista de tipo clientes",
      result.data,
      result.meta
    )
  } catch (error) {
    return errorResponse(res, error, "Error al obtener listado");
  }
};

const getTipoClieCtrl = async (req, res) => {
  try {
    const result  = await feature.getTipoClieFtr(req.params.id);
    return successResponse(
      res,
      "Tipo cliente encontrado",
      result,
    )
  } catch (error) {
    return errorResponse(res, error, "Error al obtener listado");
  }
};



module.exports = {
  getTiposClieCtrl,
  getTipoClieCtrl,
};
