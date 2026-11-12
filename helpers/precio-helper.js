/**
 * Helper de consulta de precio correcto para una presentación + tipo de cliente.
 *
 * La lógica de resolución sigue este orden:
 * 1. Sin idtipoCli → devuelve precio_venta como fallback
 * 2. Con idtipoCli → busca precio específico vigente y habilitado (estado=1) en precios
 * 3. Si no hay precio específico (o está deshabilitado) → devuelve precio_venta como fallback
 * 4. Si la presentación no existe → error 404 PRECIO_NO_DISPONIBLE
 *
 * Variantes (talla/color): con `idvariante` el orden pasa a ser
 *   precio(presentación + tipoCli + ESA variante)
 *     → precio(presentación + tipoCli, genérico: idvariante NULL)
 *     → precio_venta
 * Un precio por variante es opcional y pisa al genérico solo para esa variante.
 * Sin `idvariante` (null/undefined) el comportamiento es exactamente el anterior y
 * la consulta filtra SIEMPRE `idvariante IS NULL`: una fila de variante jamás se
 * filtra a una consulta sin variante ni a la de otra variante.
 *
 * Sobre el precio base resuelto arriba, se aplica (si existe) un descuento
 * activo de la tabla `descuentos` que aplique para la cantidad solicitada
 * (los descuentos no distinguen variantes).
 */
const { Op } = require("sequelize");
const models = require("../models/mysql");
const { normalizarIdVariante } = require("./variante-helper");

async function obtenerPrecioCorrecto(idprodPresenta, idtipoCli, cantidad = 1, idvariante = null) {
  // null/undefined => sin variante; cualquier otra cosa debe ser un ID estricto (400 VARIANTE_INVALIDA).
  const idvar = normalizarIdVariante(idvariante);
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
    // `idvariante` va SIEMPRE explícito (null => IS NULL, n => = n): nunca se omite el filtro.
    const buscarPrecio = (idvarFila) => models.Precio.findOne({
      where: {
        idprodPresenta,
        idtipoCli,
        idvariante: idvarFila,
        estado: 1,
        [Op.and]: [
          { [Op.or]: [{ fechaefecto: { [Op.lte]: now } }, { fechaefecto: null }] },
          { [Op.or]: [{ fechafin: { [Op.gte]: now } }, { fechafin: null }] },
        ],
      },
      order: [["idprecios", "DESC"]],
      // Con variante: el precio propio solo vale si la variante está HABILITADA (INNER JOIN, sin consulta
      // extra): una variante deshabilitada cae al precio genérico. Sin variante, la consulta es la de siempre.
      ...(idvarFila !== null
        ? { include: [{ association: "Variante", attributes: [], where: { estado: 1 }, required: true }] }
        : {}),
    });

    // 1) precio propio de la variante (solo si la línea tiene variante); 2) precio genérico
    const precioVariante = idvar !== null ? await buscarPrecio(idvar) : null;
    const precioEsp = precioVariante || (await buscarPrecio(null));

    precioResuelto = precioEsp
      ? {
          precio: Number(precioEsp.precio),
          tipoprecio: precioEsp.tipoprecio,
          fechaefecto: precioEsp.fechaefecto,
          fechafin: precioEsp.fechafin,
          // "precio_variante" (+ idvariante) solo aparece cuando ganó una fila propia de la variante
          fuente: precioVariante ? "precio_variante" : "precio_especifico",
          ...(precioVariante ? { idvariante: idvar } : {}),
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
