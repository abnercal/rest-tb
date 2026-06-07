const { body } = require("express-validator");
const validateResults = require("../../utils/validateResults");

const createRolValidator = [
  body("nombrerol")
    .notEmpty()
    .withMessage("El nombre del rol es obligatorio")
    .isString()
    .withMessage("El nombre del rol debe ser un texto"),

  body("permisos")
    .optional()
    .isArray({ min: 1 })
    .withMessage("Los permisos deben ser un array con al menos un ID"),

  body("permisos.*")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Cada permiso debe ser un ID numérico válido"),

  validateResults,
];

const updateRolValidator = [
  body("nombrerol")
    .optional()
    .isString()
    .withMessage("El nombre del rol debe ser un texto"),

  body("permisos")
    .optional()
    .isArray({ min: 1 })
    .withMessage("Los permisos deben ser un array con al menos un ID"),

  body("permisos.*")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Cada permiso debe ser un ID numérico válido"),

  validateResults,
];

module.exports = {
  createRolValidator,
  updateRolValidator,
};
