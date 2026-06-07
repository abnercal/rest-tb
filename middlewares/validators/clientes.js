const { body } = require("express-validator");
const validateResults = require("../../utils/validateResults");

const createClienteValidator = [
  body("nombres")
    .notEmpty()
    .withMessage("Los nombres del cliente son obligatorios")
    .isString()
    .withMessage("Los nombres del cliente deben ser un texto"),

  body("nit")
    .optional()
    .isString()
    .withMessage("El NIT debe ser un texto"),

  body("idtipoCli")
    .optional()
    .isInt()
    .withMessage("El tipo de cliente debe ser un número entero"),

  body("email")
    .optional()
    .isEmail()
    .withMessage("Debe ser un correo electrónico válido"),

  validateResults,
];

const updateClienteValidator = [
  body("nombres")
    .optional()
    .isString()
    .withMessage("Los nombres del cliente deben ser un texto"),

  body("nit")
    .optional()
    .isString()
    .withMessage("El NIT debe ser un texto"),

  body("idtipoCli")
    .optional()
    .isInt()
    .withMessage("El tipo de cliente debe ser un número entero"),

  body("email")
    .optional()
    .isEmail()
    .withMessage("Debe ser un correo electrónico válido"),

  validateResults,
];

module.exports = {
  createClienteValidator,
  updateClienteValidator,
};
