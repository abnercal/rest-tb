const { body } = require("express-validator");
const validateResults = require("../../utils/validateResults");

const createSucursalValidator = [
  body("nombre")
    .notEmpty()
    .withMessage("El nombre de la sucursal es obligatorio")
    .isString()
    .withMessage("El nombre de la sucursal debe ser un texto"),

  validateResults,
];

const updateSucursalValidator = [
  body("nombre")
    .optional()
    .isString()
    .withMessage("El nombre de la sucursal debe ser un texto"),

  validateResults,
];

module.exports = {
  createSucursalValidator,
  updateSucursalValidator,
};
