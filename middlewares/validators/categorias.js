const { body } = require("express-validator");
const validateResults = require("../../utils/validateResults");

const createCategoriaValidator = [
  body("nombre")
    .notEmpty()
    .withMessage("El nombre de la categoría es obligatorio")
    .isString()
    .withMessage("El nombre de la categoría debe ser un texto"),

  validateResults,
];

const updateCategoriaValidator = [
  body("nombre")
    .optional()
    .isString()
    .withMessage("El nombre de la categoría debe ser un texto"),

  validateResults,
];

module.exports = {
  createCategoriaValidator,
  updateCategoriaValidator,
};
