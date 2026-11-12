const { body, param } = require("express-validator");
const validateResults = require("../../utils/validateResults");
const { esIdEstricto } = require("../../utils/ids");

// Texto de 1..100 caracteres (sin castear arrays/objetos: .isString() de express-validator valida
// elemento por elemento si llega un array, por eso se usa un custom estricto).
const esBarcodeValido = (v) => typeof v === "string" && v.trim().length >= 1 && v.trim().length <= 100;
const esTipoValido = (v) => typeof v === "string" && v.trim().length <= 30;
const esBooleanoValido = (v) => [true, false, 1, 0, "true", "false", "1", "0"].includes(v);

const idBarcodeParamValidator = [
  param("id").custom(esIdEstricto).withMessage("El id del código de barras debe ser un ID numérico"),
  validateResults,
];

const lookupBarcodeValidator = [
  param("barcode").custom(esBarcodeValido).withMessage("El código de barras debe ser un texto de 1 a 100 caracteres"),
  validateResults,
];

const createBarcodeValidator = [
  body("barcode")
    .exists({ values: "undefined" }).withMessage("El código de barras es obligatorio")
    .bail()
    .custom(esBarcodeValido).withMessage("El código de barras debe ser un texto de 1 a 100 caracteres"),

  body("tipo")
    .optional({ values: "null" })
    .custom(esTipoValido).withMessage("El tipo debe ser un texto de máximo 30 caracteres"),

  body("idprodPresenta")
    .custom(esIdEstricto).withMessage("La presentación del producto es obligatoria y debe ser un ID numérico"),

  // Opcional (null = sin variante). Si es obligatorio u obligatoriamente ausente lo decide el controller
  // según el producto (VARIANTE_REQUERIDA / VARIANTE_NO_PERMITIDA / VARIANTE_INVALIDA).
  body("idvariante")
    .optional({ values: "null" })
    .custom(esIdEstricto).withMessage("idvariante debe ser un ID numérico"),

  validateResults,
];

const updateBarcodeValidator = [
  body("barcode")
    .optional()
    .custom(esBarcodeValido).withMessage("El código de barras debe ser un texto de 1 a 100 caracteres"),

  body("tipo")
    .optional({ values: "null" })
    .custom(esTipoValido).withMessage("El tipo debe ser un texto de máximo 30 caracteres"),

  body("idvariante")
    .optional({ values: "null" })
    .custom(esIdEstricto).withMessage("idvariante debe ser un ID numérico"),

  body("estado")
    .optional()
    .custom(esBooleanoValido).withMessage("El estado debe ser 0/1 o verdadero/falso"),

  validateResults,
];

module.exports = {
  createBarcodeValidator,
  updateBarcodeValidator,
  idBarcodeParamValidator,
  lookupBarcodeValidator,
};
