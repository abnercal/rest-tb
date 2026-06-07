const { body } = require("express-validator");
const validateResults = require("../../utils/validateResults");

const createCompraValidator = [
  body()
    .notEmpty()
    .withMessage("El cuerpo de la solicitud no puede estar vacío"),

  validateResults,
];

const updateCompraValidator = [
  body()
    .notEmpty()
    .withMessage("El cuerpo de la solicitud no puede estar vacío"),

  validateResults,
];

module.exports = {
  createCompraValidator,
  updateCompraValidator,
};
