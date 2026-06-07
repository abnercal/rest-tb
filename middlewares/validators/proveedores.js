const { body } = require("express-validator");
const validateResults = require("../../utils/validateResults");

const createProveedorValidator = [
  body("nombre")
    .notEmpty()
    .withMessage("El nombre del proveedor es obligatorio")
    .isString()
    .withMessage("El nombre del proveedor debe ser un texto"),

  validateResults,
];

const updateProveedorValidator = [
  body("nombre")
    .optional()
    .isString()
    .withMessage("El nombre del proveedor debe ser un texto"),

  validateResults,
];

module.exports = {
  createProveedorValidator,
  updateProveedorValidator,
};
