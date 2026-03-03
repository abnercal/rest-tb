const { body } = require("express-validator");
const validateResults = require("../../utils/validateResults");

const loginValidator = [
  body("email")
    .isEmail()
    .withMessage("Debe ser un correo válido"),

  body("password")
    .notEmpty()
    .withMessage("La contraseña es obligatoria"),

  validateResults,
];

module.exports = {
  loginValidator,
};