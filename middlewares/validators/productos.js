const { body } = require("express-validator");
const validateResults = require("../../utils/validateResults");

const createProductoValidator = [
  body("nombre")
    .notEmpty()
    .withMessage("El nombre del producto es obligatorio")
    .isString()
    .withMessage("El nombre del producto debe ser un texto"),

  body("idmarca")
    .optional({ values: "null" })
    .isInt()
    .withMessage("La marca debe ser un ID numérico"),

  body("idcategoria")
    .optional({ values: "null" })
    .isInt()
    .withMessage("La categoría debe ser un ID numérico"),

  body("idunidad")
    .optional({ values: "null" })
    .isInt()
    .withMessage("La unidad debe ser un ID numérico"),

  body("presentaciones")
    .optional()
    .isArray()
    .withMessage("Las presentaciones deben ser un arreglo"),

  body("presentaciones.*.idpresentacion")
    .if(body("presentaciones").exists())
    .isInt()
    .withMessage("Cada presentación debe tener un ID válido"),

  body("presentaciones.*.cantidad_base")
    .if(body("presentaciones").exists())
    .optional()
    .isFloat({ min: 0 })
    .withMessage("La cantidad base debe ser un número positivo"),

  validateResults,
];

const updateProductoValidator = [
  body("nombre")
    .optional()
    .isString()
    .withMessage("El nombre del producto debe ser un texto"),

  body("idmarca")
    .optional({ values: "null" })
    .isInt()
    .withMessage("La marca debe ser un ID numérico"),

  body("idcategoria")
    .optional({ values: "null" })
    .isInt()
    .withMessage("La categoría debe ser un ID numérico"),

  body("idunidad")
    .optional({ values: "null" })
    .isInt()
    .withMessage("La unidad debe ser un ID numérico"),

  body("presentaciones")
    .optional()
    .isArray()
    .withMessage("Las presentaciones deben ser un arreglo"),

  body("presentaciones.*.idpresentacion")
    .if(body("presentaciones").exists())
    .isInt()
    .withMessage("Cada presentación debe tener un ID válido"),

  validateResults,
];

module.exports = {
  createProductoValidator,
  updateProductoValidator,
};
