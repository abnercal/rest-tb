/**
 * Helper de consulta de precio correcto para una presentación + tipo de cliente.
 *
 * La lógica de resolución sigue este orden:
 * 1. Sin idtipoCli → devuelve precio_venta como fallback
 * 2. Con idtipoCli → busca precio específico vigente en la tabla precios
 * 3. Si no hay precio específico → devuelve precio_venta como fallback
 * 4. Si la presentación no existe → error 404 PRECIO_NO_DISPONIBLE
 *
 * Sobre el precio base resuelto arriba, se aplica (si existe) un descuento
 * activo de la tabla `descuentos` que aplique para la cantidad solicitada.
 */
const { Op } = require("sequelize");
const models = require("../models/mysql");

async function obtenerPrecioCorrecto(idprodPresenta, idtipoCli, cantidad = 1) {
  const pp = await models.ProductoPresentacion.findByPk(idprodPresenta);
  if (!pp) {
    const err = new Error("Presentación no encontrada");
    err.status = 404;
    err.code = "PRECIO_NO_DISPONIBLE";
    throw err;
  }

  let precioResuelto;

  // Si no hay tipo de cliente, devolver precio_venta
  if (idtipoCli == null) {
    precioResuelto = { precio: Number(pp.precio_venta) || 0, fuente: "precio_venta", tipoprecio: null };
  } else {
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

    precioResuelto = precioEsp
      ? {
          precio: Number(precioEsp.precio),
          tipoprecio: precioEsp.tipoprecio,
          fechaefecto: precioEsp.fechaefecto,
          fechafin: precioEsp.fechafin,
          fuente: "precio_especifico",
        }
      // Fallback a precio_venta
      : { precio: Number(pp.precio_venta) || 0, fuente: "precio_venta", tipoprecio: null };
  }

  // Buscar un descuento activo aplicable a la cantidad solicitada
  const now = new Date();
  const descuento = await models.Descuento.findOne({
    where: {
      idprodPresenta,
      estado: 1,
      [Op.or]: [{ minimo: { [Op.lte]: cantidad } }, { minimo: null }],
      [Op.and]: [
        { [Op.or]: [{ fechaIni: { [Op.lte]: now } }, { fechaIni: null }] },
        { [Op.or]: [{ fechaFin: { [Op.gte]: now } }, { fechaFin: null }] },
      ],
    },
    order: [["minimo", "DESC"]], // preferir el descuento con el mayor minimo que califique
  });

  let precioFinal = precioResuelto.precio;
  let descuentoAplicado = null;
  if (descuento) {
    const valor = Number(descuento.valorDescuento);
    precioFinal = descuento.tipo_descuento === "porcentaje"
      ? precioResuelto.precio * (1 - valor / 100)
      : Math.max(0, precioResuelto.precio - valor);
    descuentoAplicado = { iddescuentos: descuento.iddescuentos, tipo_descuento: descuento.tipo_descuento, valor };
  }

  return { ...precioResuelto, precio: precioFinal, descuentoAplicado };
}

module.exports = { obtenerPrecioCorrecto };
