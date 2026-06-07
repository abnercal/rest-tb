const { body } = require("express-validator");
const validateResults = require("../../utils/validateResults");

const createPresentacionValidator = [
  body("nombre")
    .notEmpty()
    .withMessage("El nombre de la presentación es obligatorio")
    .isString()
    .withMessage("El nombre de la presentación debe ser un texto"),

  validateResults,
];

const updatePresentacionValidator = [
  body("nombre")
    .optional()
    .isString()
    .withMessage("El nombre de la presentación debe ser un texto"),

  validateResults,
];

module.exports = {
  createPresentacionValidator,
  updatePresentacionValidator,
};
