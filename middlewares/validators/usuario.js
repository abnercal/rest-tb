const { body } = require("express-validator");
const validateResults = require("../../utils/validateResults.js");

const createUsuarioValidator = [
  body("email")
    .isEmail()
    .withMessage("Debe ser un correo válido"),

  body("password")
    .isLength({ min: 6 })
    .withMessage("La contraseña debe tener al menos 6 caracteres"),

  body("nombre")
    .notEmpty()
    .withMessage("El nombre es obligatorio"),

  validateResults,
];

module.exports = {
  createUsuarioValidator,
};