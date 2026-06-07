const { body } = require("express-validator");
const validateResults = require("../../utils/validateResults");

const createMarcaValidator = [
  body("nombre")
    .notEmpty()
    .withMessage("El nombre de la marca es obligatorio")
    .isString()
    .withMessage("El nombre de la marca debe ser un texto"),

  validateResults,
];

const updateMarcaValidator = [
  body("nombre")
    .optional()
    .isString()
    .withMessage("El nombre de la marca debe ser un texto"),

  validateResults,
];

module.exports = {
  createMarcaValidator,
  updateMarcaValidator,
};
