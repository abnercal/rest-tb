/**
 * Entero positivo ESTRICTO (number o texto numérico). A diferencia de `.isInt()` de
 * express-validator, no acepta arrays (los validadores estándar validan cada elemento
 * de un array) ni objetos, y no castea nada en silencio.
 */
const esIdEstricto = (v) =>
  (typeof v === "number" && Number.isSafeInteger(v) && v > 0) ||
  (typeof v === "string" &&
    /^\d+$/.test(v.trim()) &&
    Number.isSafeInteger(Number(v)) &&
    Number(v) > 0);

module.exports = { esIdEstricto };
