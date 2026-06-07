const { body } = require("express-validator");
const validateResults = require("../../utils/validateResults");

const createVentaValidator = [
  body()
    .notEmpty()
    .withMessage("El cuerpo de la solicitud no puede estar vacío"),

  validateResults,
];

const updateVentaValidator = [
  body()
    .notEmpty()
    .withMessage("El cuerpo de la solicitud no puede estar vacío"),

  validateResults,
];

module.exports = {
  createVentaValidator,
  updateVentaValidator,
};
