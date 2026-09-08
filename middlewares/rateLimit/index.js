const { rateLimit } = require("express-rate-limit");

// Respuesta 429 en el mismo formato de envelope que usa el resto de la API
// (ver utils/handleError.js -> errorResponse / successResponse).
const tooManyRequests = (message) => (req, res) =>
  res.status(429).json({
    ok: false,
    message,
    data: null,
    meta: null,
  });

/**
 * Límite estricto para endpoints de autenticación (login).
 * Frena ataques de fuerza bruta sobre contraseñas.
 * `skipSuccessfulRequests`: un login correcto no consume cuota, solo los fallidos.
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  limit: 5, // 5 intentos fallidos por IP por ventana
  skipSuccessfulRequests: true,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: tooManyRequests(
    "Demasiados intentos de inicio de sesión. Esperá unos minutos e intentá de nuevo."
  ),
});

/**
 * Límite general para toda la API. Ventana amplia para no molestar el uso
 * normal de un front de POS (que hace muchas requests), pero corta abusos.
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  limit: 500, // 1000 requests por IP por ventana
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: tooManyRequests(
    "Demasiadas peticiones desde esta IP. Esperá unos minutos e intentá de nuevo."
  ),
});

module.exports = { loginLimiter, apiLimiter };
