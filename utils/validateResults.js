const { validationResult } = require("express-validator");
const { errorResponse } = require("./handleError");

/**
 * Middleware para capturar errores de express-validator
 * y retornarlos en el formato estándar de la API
 */
const validateResults = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).json({
      ok: false,
      message: "Error de validación",
      data: null,
      meta: null,
      errors: errors.array(),
    });
  }

  next();
};

module.exports = validateResults;