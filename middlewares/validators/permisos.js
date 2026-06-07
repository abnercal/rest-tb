const { body } = require("express-validator");
const validateResults = require("../../utils/validateResults");

const createPermisoValidator = [
  body("nombre")
    .notEmpty()
    .withMessage("El nombre del permiso es obligatorio")
    .isString()
    .withMessage("El nombre del permiso debe ser un texto"),

  validateResults,
];

const updatePermisoValidator = [
  body("nombre")
    .optional()
    .isString()
    .withMessage("El nombre del permiso debe ser un texto"),

  validateResults,
];

module.exports = {
  createPermisoValidator,
  updatePermisoValidator,
};
