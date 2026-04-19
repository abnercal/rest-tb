const { body } = require("express-validator");
const validateResults = require("../../utils/validateResults.js");

const createUsuarioValidator = [
  body("nombre")
    .notEmpty()
    .withMessage("El nombre es obligatorio"),

  body("email")
    .isEmail()
    .withMessage("Debe ser un correo electrónico válido"),

  body("password")
    .isLength({ min: 6 })
    .withMessage("La contraseña debe tener al menos 6 caracteres"),

  validateResults,
];

const updateUsuarioValidator = [
  body("email")
    .optional()
    .isEmail()
    .withMessage("Debe ser un correo electrónico válido"),

  body("password")
    .optional()
    .isLength({ min: 6 })
    .withMessage("La contraseña debe tener al menos 6 caracteres"),

  validateResults,
];

module.exports = {
  createUsuarioValidator,
  updateUsuarioValidator
};