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
    .isLength({ min: 8 })
    .withMessage("La contraseña debe tener al menos 8 caracteres")
    .matches(/[A-Z]/)
    .withMessage("Debe contener al menos una mayúscula")
    .matches(/[a-z]/)
    .withMessage("Debe contener al menos una minúscula")
    .matches(/[0-9]/)
    .withMessage("Debe contener al menos un número"),

  validateResults,
];

const updateUsuarioValidator = [
  body("email")
    .optional()
    .isEmail()
    .withMessage("Debe ser un correo electrónico válido"),

  body("password")
    .optional()
    .isLength({ min: 8 })
    .withMessage("La contraseña debe tener al menos 8 caracteres")
    .matches(/[A-Z]/)
    .withMessage("Debe contener al menos una mayúscula")
    .matches(/[a-z]/)
    .withMessage("Debe contener al menos una minúscula")
    .matches(/[0-9]/)
    .withMessage("Debe contener al menos un número"),

  validateResults,
];

module.exports = {
  createUsuarioValidator,
  updateUsuarioValidator
};