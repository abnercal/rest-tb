const { body } = require("express-validator");
const validateResults = require("../../utils/validateResults");

const createCompraValidator = [
  body("idproveedor")
    .notEmpty().withMessage("El proveedor es obligatorio")
    .isInt().withMessage("El proveedor debe ser un ID numérico"),

  body("idusuario")
    .notEmpty().withMessage("El usuario es obligatorio")
    .isInt().withMessage("El usuario debe ser un ID numérico"),

  body("idsucursal")
    .notEmpty().withMessage("La sucursal es obligatoria")
    .isInt().withMessage("La sucursal debe ser un ID numérico"),

  body("detalles")
    .isArray({ min: 1 }).withMessage("Debe incluir al menos un detalle"),

  body("detalles.*.idprodPresenta")
    .notEmpty().withMessage("Cada detalle debe tener un producto")
    .isInt().withMessage("El producto debe ser un ID numérico"),

  body("detalles.*.cantidad")
    .notEmpty().withMessage("Cada detalle debe tener una cantidad")
    .isFloat({ min: 0.01 }).withMessage("La cantidad debe ser mayor a 0"),

  body("detalles.*.costo")
    .notEmpty().withMessage("Cada detalle debe tener un costo")
    .isFloat({ min: 0 }).withMessage("El costo debe ser un número válido"),

  body("nombre")
    .optional()
    .isString().withMessage("El nombre debe ser texto"),

  body("direccion")
    .optional()
    .isString().withMessage("La dirección debe ser texto"),

  validateResults,
];

const updateCompraValidator = [
  body("nombre")
    .optional()
    .isString().withMessage("El nombre debe ser texto"),

  body("direccion")
    .optional()
    .isString().withMessage("La dirección debe ser texto"),

  body("idproveedor")
    .optional()
    .isInt().withMessage("El proveedor debe ser un ID numérico"),

  body("estado")
    .optional()
    .isBoolean().withMessage("El estado debe ser verdadero o falso"),

  validateResults,
];

module.exports = {
  createCompraValidator,
  updateCompraValidator,
};
