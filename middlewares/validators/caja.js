const { body, param, query } = require("express-validator");
const validateResults = require("../../utils/validateResults");
const { esIdEstricto } = require("../../utils/ids");

const TIPOS_MOVIMIENTO = ["INGRESO", "EGRESO"];
const ESTADOS_SESION = ["ABIERTA", "CERRADA"];

// Importe (number o texto) con hasta 12 enteros y 2 decimales: cabe en DECIMAL(18,2) sin redondeos
// silenciosos. `min0 = true` acepta 0; `false` exige > 0.
const montoValido = ({ min0 }) => (valor) => {
  if (typeof valor !== "number" && typeof valor !== "string") return false;
  const texto = String(valor).trim();
  if (!/^\d{1,12}(\.\d{1,2})?$/.test(texto)) return false;
  return min0 ? true : Number(texto) > 0;
};

const aMayusculas = (v) => (typeof v === "string" ? v.trim().toUpperCase() : v);

// ───── params ─────

const idParamValidator = [
  param("id").custom(esIdEstricto).withMessage("El id debe ser un ID numérico"),
  validateResults,
];

const idCajaParamValidator = [
  param("idcaja").custom(esIdEstricto).withMessage("El id de la caja debe ser un ID numérico"),
  validateResults,
];

// ───── cajas (catálogo) ─────

const createCajaValidator = [
  body("nombre")
    .exists({ values: "falsy" }).withMessage("El nombre de la caja es obligatorio")
    .bail()
    .isString().withMessage("El nombre de la caja debe ser un texto")
    .bail()
    .trim()
    .notEmpty().withMessage("El nombre de la caja es obligatorio")
    .isLength({ max: 45 }).withMessage("El nombre de la caja no puede superar 45 caracteres"),

  body("idsucursal")
    .optional()
    .custom(esIdEstricto).withMessage("La sucursal debe ser un ID numérico"),

  body("estado")
    .optional()
    .isBoolean().withMessage("El estado debe ser 0 o 1"),

  validateResults,
];

const updateCajaValidator = [
  body("nombre")
    .optional()
    .isString().withMessage("El nombre de la caja debe ser un texto")
    .bail()
    .trim()
    .notEmpty().withMessage("El nombre de la caja no puede estar vacío")
    .isLength({ max: 45 }).withMessage("El nombre de la caja no puede superar 45 caracteres"),

  body("estado")
    .optional()
    .isBoolean().withMessage("El estado debe ser 0 o 1"),

  validateResults,
];

const listadoCajasValidator = [
  query("page").optional().isInt({ min: 1 }).withMessage("page debe ser un entero mayor o igual a 1"),
  query("limit").optional().isInt({ min: 1 }).withMessage("limit debe ser un entero mayor o igual a 1"),
  query("estado").optional().isIn(["0", "1", "true", "false"]).withMessage("El estado debe ser 0 o 1"),
  query("idsucursal").optional().custom(esIdEstricto).withMessage("La sucursal debe ser un ID numérico"),
  validateResults,
];

// ───── sesiones ─────

const abrirSesionValidator = [
  body("monto_apertura")
    .exists({ values: "undefined" }).withMessage("El monto de apertura es obligatorio")
    .bail()
    .custom(montoValido({ min0: true }))
    .withMessage("El monto de apertura debe ser un número mayor o igual a 0 con hasta 2 decimales"),

  body("observaciones")
    .optional({ values: "null" })
    .isString().withMessage("Las observaciones deben ser un texto")
    .bail()
    .isLength({ max: 255 }).withMessage("Las observaciones no pueden superar 255 caracteres"),

  validateResults,
];

const cerrarSesionValidator = [
  body("monto_contado")
    .exists({ values: "undefined" }).withMessage("El monto contado es obligatorio")
    .bail()
    .custom(montoValido({ min0: true }))
    .withMessage("El monto contado debe ser un número mayor o igual a 0 con hasta 2 decimales"),

  body("observaciones")
    .optional({ values: "null" })
    .isString().withMessage("Las observaciones deben ser un texto")
    .bail()
    .isLength({ max: 255 }).withMessage("Las observaciones no pueden superar 255 caracteres"),

  validateResults,
];

const sesionActualValidator = [
  query("idcaja").optional().custom(esIdEstricto).withMessage("idcaja debe ser un ID numérico"),
  validateResults,
];

const listadoSesionesValidator = [
  query("page").optional().isInt({ min: 1 }).withMessage("page debe ser un entero mayor o igual a 1"),
  query("limit").optional().isInt({ min: 1 }).withMessage("limit debe ser un entero mayor o igual a 1"),
  query("idcaja").optional().custom(esIdEstricto).withMessage("idcaja debe ser un ID numérico"),
  query("idusuario").optional().custom(esIdEstricto).withMessage("idusuario debe ser un ID numérico"),
  query("idsucursal").optional().custom(esIdEstricto).withMessage("La sucursal debe ser un ID numérico"),
  query("estado")
    .optional()
    .customSanitizer(aMayusculas)
    .isIn(ESTADOS_SESION).withMessage("El estado debe ser ABIERTA o CERRADA"),
  query("desde").optional().isISO8601({ strict: true }).withMessage("desde debe ser una fecha válida (YYYY-MM-DD)"),
  query("hasta").optional().isISO8601({ strict: true }).withMessage("hasta debe ser una fecha válida (YYYY-MM-DD)"),
  validateResults,
];

// ───── movimientos ─────

const movimientoValidator = [
  body("tipo")
    .exists({ values: "falsy" }).withMessage("El tipo de movimiento es obligatorio")
    .bail()
    .customSanitizer(aMayusculas)
    .isIn(TIPOS_MOVIMIENTO).withMessage("El tipo debe ser INGRESO o EGRESO"),

  body("concepto")
    .exists({ values: "falsy" }).withMessage("El concepto es obligatorio")
    .bail()
    .isString().withMessage("El concepto debe ser un texto")
    .bail()
    .trim()
    .notEmpty().withMessage("El concepto es obligatorio")
    .isLength({ max: 45 }).withMessage("El concepto no puede superar 45 caracteres"),

  body("importe")
    .exists({ values: "undefined" }).withMessage("El importe es obligatorio")
    .bail()
    .custom(montoValido({ min0: false }))
    .withMessage("El importe debe ser un número mayor a 0 con hasta 2 decimales"),

  body("descripcion")
    .optional({ values: "null" })
    .isString().withMessage("La descripción debe ser un texto")
    .bail()
    .isLength({ max: 255 }).withMessage("La descripción no puede superar 255 caracteres"),

  body("referencia")
    .optional({ values: "null" })
    .isString().withMessage("La referencia debe ser un texto")
    .bail()
    .isLength({ max: 50 }).withMessage("La referencia no puede superar 50 caracteres"),

  validateResults,
];

const listadoMovimientosValidator = [
  query("page").optional().isInt({ min: 1 }).withMessage("page debe ser un entero mayor o igual a 1"),
  query("limit").optional().isInt({ min: 1 }).withMessage("limit debe ser un entero mayor o igual a 1"),
  query("tipo")
    .optional()
    .customSanitizer(aMayusculas)
    .isIn(TIPOS_MOVIMIENTO).withMessage("El tipo debe ser INGRESO o EGRESO"),
  validateResults,
];

module.exports = {
  idParamValidator,
  idCajaParamValidator,
  createCajaValidator,
  updateCajaValidator,
  listadoCajasValidator,
  abrirSesionValidator,
  cerrarSesionValidator,
  sesionActualValidator,
  listadoSesionesValidator,
  movimientoValidator,
  listadoMovimientosValidator,
};
