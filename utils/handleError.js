/**
 * Respuesta de error centralizada
 * @param {Object}  res         - Objeto de respuesta de Express
 * @param {Error}   error       - Error capturado
 * @param {string}  message     - Mensaje genérico
 * @param {number}  statusCode  - Código HTTP (default: error.status || 500)
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
    data: null,
    meta: null,
    ...(process.env.NODE_ENV === "development" && {
      error: error?.message || error,
    }),
  });
};

/**
 * Respuesta exitosa
 * @param {Object}  res     - Objeto de respuesta de Express
 * @param {string}  message - Mensaje descriptivo
 * @param {*}       data    - Datos a retornar
 * @param {Object}  meta    - Metadatos de paginación
 * @param {number}  status  - Código HTTP (default: 200)
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

  