const { body } = require("express-validator");
const validateResults = require("../../utils/validateResults");

const createProductoValidator = [
  body("nombre")
    .notEmpty()
    .withMessage("El nombre del producto es obligatorio")
    .isString()
    .withMessage("El nombre del producto debe ser un texto"),

  body("idmarca")
    .optional()
    .isInt()
    .withMessage("La marca debe ser un ID numérico"),

  body("idpresentacion")
    .optional()
    .isInt()
    .withMessage("La presentación debe ser un ID numérico"),

  body("idcategoria")
    .optional()
    .isInt()
    .withMessage("La categoría debe ser un ID numérico"),

  body("idunidad")
    .optional()
    .isInt()
    .withMessage("La unidad debe ser un ID numérico"),

  validateResults,
];

const updateProductoValidator = [
  body("nombre")
    .optional()
    .isString()
    .withMessage("El nombre del producto debe ser un texto"),

  body("idmarca")
    .optional()
    .isInt()
    .withMessage("La marca debe ser un ID numérico"),

  body("idpresentacion")
    .optional()
    .isInt()
    .withMessage("La presentación debe ser un ID numérico"),

  body("idcategoria")
    .optional()
    .isInt()
    .withMessage("La categoría debe ser un ID numérico"),

  body("idunidad")
    .optional()
    .isInt()
    .withMessage("La unidad debe ser un ID numérico"),

  validateResults,
];

module.exports = {
  createProductoValidator,
  updateProductoValidator,
};
