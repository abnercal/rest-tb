const { body } = require("express-validator");
const validateResults = require("../../utils/validateResults");

const TIPOS_TALLA = ["ROPA", "CALZADO"];

const createTallaValidator = [
  body("nombre")
    .exists({ values: "falsy" })
    .withMessage("El nombre de la talla es obligatorio")
    .bail()
    .isString()
    .withMessage("El nombre de la talla debe ser un texto")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("El nombre de la talla es obligatorio")
    .isLength({ max: 20 })
    .withMessage("El nombre de la talla no puede superar 20 caracteres"),

  body("tipo")
    .notEmpty()
    .withMessage("El tipo de talla es obligatorio")
    .isIn(TIPOS_TALLA)
    .withMessage("El tipo de talla debe ser ROPA o CALZADO"),

  body("orden")
    .optional()
    .isInt({ min: 0 })
    .withMessage("El orden debe ser un número entero mayor o igual a 0"),

  body("estado")
    .optional()
    .isBoolean()
    .withMessage("El estado debe ser 0 o 1"),

  validateResults,
];

const updateTallaValidator = [
  body("nombre")
    .optional()
    .isString()
    .withMessage("El nombre de la talla debe ser un texto")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("El nombre de la talla no puede estar vacío")
    .isLength({ max: 20 })
    .withMessage("El nombre de la talla no puede superar 20 caracteres"),

  body("tipo")
    .optional()
    .isIn(TIPOS_TALLA)
    .withMessage("El tipo de talla debe ser ROPA o CALZADO"),

  body("orden")
    .optional()
    .isInt({ min: 0 })
    .withMessage("El orden debe ser un número entero mayor o igual a 0"),

  body("estado")
    .optional()
    .isBoolean()
    .withMessage("El estado debe ser 0 o 1"),

  validateResults,
];

module.exports = {
  createTallaValidator,
  updateTallaValidator,
};
