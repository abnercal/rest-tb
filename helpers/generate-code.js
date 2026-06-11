/**
 * Generador de códigos automáticos para ventas y compras.
 *
 * Formato: {PREFIJO}{YYYYMMDD}{CORRELATIVO}
 *   - ORD2026061000001  (Ventas)
 *   - COM2026061000001  (Compras)
 *
 * El correlativo es de 5 dígitos, se reinicia cada día.
 */
const { Op } = require("sequelize");
const models = require("../models/mysql");
const moment = require("moment");

const PREFIJOS = {
  VENTA: "ORD",
  COMPRA: "COM",
};

/**
 * Genera el siguiente código para el tipo indicado.
 * @param {"VENTA"|"COMPRA"} tipo
 * @returns {Promise<string>} Ej: "ORD2026061000012"
 */
async function generarSiguienteCodigo(tipo) {
  const prefijo = PREFIJOS[tipo];
  if (!prefijo) throw new Error(`Tipo inválido: ${tipo}`);

  const hoy = moment().format("YYYYMMDD");
  const patron = `${prefijo}${hoy}`;

  // Buscar el último código generado hoy
  const model = tipo === "VENTA" ? models.Orden : models.Compra;
  const columna = "nombre";

  const ultimo = await model.findOne({
    where: {
      [columna]: { [Op.like]: `${patron}%` },
    },
    order: [[columna, "DESC"]],
    attributes: [columna],
    paranoid: false,
  });

  let correlativo = 1;
  if (ultimo) {
    const ultimoCodigo = ultimo[columna];
    const numStr = ultimoCodigo.slice(patron.length);
    correlativo = parseInt(numStr, 10) + 1;
  }

  return `${patron}${String(correlativo).padStart(5, "0")}`;
}

module.exports = { generarSiguienteCodigo, PREFIJOS };
