const { body } = require("express-validator");
const validateResults = require("../../utils/validateResults");

const createUnidadValidator = [
  body("nombre")
    .notEmpty()
    .withMessage("El nombre de la unidad es obligatorio")
    .isString()
    .withMessage("El nombre de la unidad debe ser un texto"),

  body("abreviatura")
    .notEmpty()
    .withMessage("La abreviatura de la unidad es obligatoria")
    .isString()
    .withMessage("La abreviatura de la unidad debe ser un texto"),

  validateResults,
];

const updateUnidadValidator = [
  body("nombre")
    .optional()
    .isString()
    .withMessage("El nombre de la unidad debe ser un texto"),

  body("abreviatura")
    .optional()
    .isString()
    .withMessage("La abreviatura de la unidad debe ser un texto"),

  validateResults,
];

module.exports = {
  createUnidadValidator,
  updateUnidadValidator,
};
