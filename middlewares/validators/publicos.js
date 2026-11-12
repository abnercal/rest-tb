const { body } = require("express-validator");
const validateResults = require("../../utils/validateResults");

const createPublicoValidator = [
  body("nombre")
    .exists({ values: "falsy" })
    .withMessage("El nombre del público objetivo es obligatorio")
    .bail()
    .isString()
    .withMessage("El nombre del público objetivo debe ser un texto")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("El nombre del público objetivo es obligatorio")
    .isLength({ max: 45 })
    .withMessage("El nombre del público objetivo no puede superar 45 caracteres"),

  body("estado")
    .optional()
    .isBoolean()
    .withMessage("El estado debe ser 0 o 1"),

  validateResults,
];

const updatePublicoValidator = [
  body("nombre")
    .optional()
    .isString()
    .withMessage("El nombre del público objetivo debe ser un texto")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("El nombre del público objetivo no puede estar vacío")
    .isLength({ max: 45 })
    .withMessage("El nombre del público objetivo no puede superar 45 caracteres"),

  body("estado")
    .optional()
    .isBoolean()
    .withMessage("El estado debe ser 0 o 1"),

  validateResults,
];

module.exports = {
  createPublicoValidator,
  updatePublicoValidator,
};
