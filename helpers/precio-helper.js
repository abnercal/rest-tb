/**
 * Helper de consulta de precio correcto para una presentación + tipo de cliente.
 *
 * La lógica de resolución sigue este orden:
 * 1. Sin idtipoCli → devuelve precio_venta como fallback
 * 2. Con idtipoCli → busca precio específico vigente en la tabla precios
 * 3. Si no hay precio específico → devuelve precio_venta como fallback
 * 4. Si la presentación no existe → error 404 PRECIO_NO_DISPONIBLE
 */
const { Op } = require("sequelize");
const models = require("../models/mysql");

async function obtenerPrecioCorrecto(idprodPresenta, idtipoCli) {
  const pp = await models.ProductoPresentacion.findByPk(idprodPresenta);
  if (!pp) {
    const err = new Error("Presentación no encontrada");
    err.status = 404;
    err.code = "PRECIO_NO_DISPONIBLE";
    throw err;
  }

  // Si no hay tipo de cliente, devolver precio_venta
  if (idtipoCli == null) {
    return { precio: Number(pp.precio_venta) || 0, fuente: "precio_venta", tipoprecio: null };
  }

  // Buscar precio específico para esta presentación + tipo de cliente
  const now = new Date();
  const precioEsp = await models.Precio.findOne({
    where: {
      idprodPresenta,
      idtipoCli,
      [Op.and]: [
        { [Op.or]: [{ fechaefecto: { [Op.lte]: now } }, { fechaefecto: null }] },
        { [Op.or]: [{ fechafin: { [Op.gte]: now } }, { fechafin: null }] },
      ],
    },
    order: [["idprecios", "DESC"]],
  });

  if (precioEsp) {
    return {
      precio: Number(precioEsp.precio),
      tipoprecio: precioEsp.tipoprecio,
      fechaefecto: precioEsp.fechaefecto,
      fechafin: precioEsp.fechafin,
      fuente: "precio_especifico",
    };
  }

  // Fallback a precio_venta
  return { precio: Number(pp.precio_venta) || 0, fuente: "precio_venta", tipoprecio: null };
}

module.exports = { obtenerPrecioCorrecto };
