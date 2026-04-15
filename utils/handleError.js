/**
 * Manejador de errores HTTP centralizado.
 *
 * @param {Object}  res            - Objeto de respuesta de Express
 * @param {Error}   error          - Error capturado
 * @param {string}  [message] - Mensaje genérico para producción
 * @param {number}  [statusCode]   - Código HTTP (default: error.status || 500)
 */
const errorResponse  = (res, error, message = "Algo salió mal", statusCode = null) => {
  const status = statusCode || error.status || 500;

  // En desarrollo mostramos el mensaje real del error
  const finalMessage =
    process.env.NODE_ENV === "development"
      ? error.message || message
      : message;

  if (process.env.NODE_ENV === "development") {
    console.error("Error:", error);
  }

  return res.status(status).json({
    ok: false,
    message:finalMessage,
    ...(process.env.NODE_ENV === "development" && {
      error: error?.message || error,
    }),
  });
};

/**
 * Respuesta exitosa
 */
const successResponse = (res, message = "OK", data = null, meta = null, status = 200) => {
  return res.status(status).json({
    ok: true,
    message,
    data,
    meta,
  });
};

module.exports = { errorResponse , successResponse };

  