const db = require("../../models/mysql");
const { successResponse, errorResponse } = require("../../utils/handleError");

const getTiposPagoCtrl = async (req, res) => {
  try {
    const tipos = await db.TipoPago.findAll({ where: { estado: 1 } });
    return successResponse(res, "Lista de tipos de pago", tipos);
  } catch (error) {
    return errorResponse(res, error, "Error al obtener tipos de pago");
  }
};

module.exports = { getTiposPagoCtrl };
