const { body } = require("express-validator");
const validateResults = require("../../utils/validateResults");

const createVentaValidator = [
  body("idcliente")
    .notEmpty().withMessage("El cliente es obligatorio")
    .isInt().withMessage("El cliente debe ser un ID numérico"),

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

  body("detalles.*.precio")
    .notEmpty().withMessage("Cada detalle debe tener un precio")
    .isFloat({ min: 0 }).withMessage("El precio debe ser un número válido"),

  body("nombre")
    .optional()
    .isString().withMessage("El nombre debe ser texto"),

  body("pago.idtipopago")
    .optional()
    .isInt().withMessage("El tipo de pago debe ser un ID numérico"),

  body("pago.estado")
    .optional()
    .isString().withMessage("El estado del pago debe ser texto"),

  validateResults,
];

const updateVentaValidator = [
  body("nombre")
    .optional()
    .isString().withMessage("El nombre debe ser texto"),

  body("direccion")
    .optional()
    .isString().withMessage("La dirección debe ser texto"),

  body("idcliente")
    .optional()
    .isInt().withMessage("El cliente debe ser un ID numérico"),

  body("idestado")
    .optional()
    .isInt().withMessage("El estado debe ser un ID numérico"),

  validateResults,
];

module.exports = {
  createVentaValidator,
  updateVentaValidator,
};
