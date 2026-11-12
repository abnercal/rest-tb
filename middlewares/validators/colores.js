const { body } = require("express-validator");
const validateResults = require("../../utils/validateResults");

// Formato #RGB, #RRGGBB o #RRGGBBAA (la columna es VARCHAR(10))
const HEX_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

const createColorValidator = [
  body("nombre")
    .exists({ values: "falsy" })
    .withMessage("El nombre del color es obligatorio")
    .bail()
    .isString()
    .withMessage("El nombre del color debe ser un texto")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("El nombre del color es obligatorio")
    .isLength({ max: 45 })
    .withMessage("El nombre del color no puede superar 45 caracteres"),

  body("hex")
    .optional({ nullable: true })
    .matches(HEX_REGEX)
    .withMessage("El código hex debe tener el formato #RRGGBB"),

  body("estado")
    .optional()
    .isBoolean()
    .withMessage("El estado debe ser 0 o 1"),

  validateResults,
];

const updateColorValidator = [
  body("nombre")
    .optional()
    .isString()
    .withMessage("El nombre del color debe ser un texto")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("El nombre del color no puede estar vacío")
    .isLength({ max: 45 })
    .withMessage("El nombre del color no puede superar 45 caracteres"),

  body("hex")
    .optional({ nullable: true })
    .matches(HEX_REGEX)
    .withMessage("El código hex debe tener el formato #RRGGBB"),

  body("estado")
    .optional()
    .isBoolean()
    .withMessage("El estado debe ser 0 o 1"),

  validateResults,
];

module.exports = {
  createColorValidator,
  updateColorValidator,
};
