const { verifyToken } = require("../../utils/jwt");
const { errorResponse } = require("../../utils/handleError");

/**
 * Middleware que verifica el JWT en el header Authorization
 * Adjunta el payload decodificado en req.user
 */
const verifyJWT = (req, res, next) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return errorResponse(res, { status: 401 }, "Token no proporcionado", 401);
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return errorResponse(res, { status: 401 }, "Token inválido o expirado", 401);
  }
};

/**
 * Middleware factory que verifica si el usuario tiene el permiso requerido.
 * El superusuario (rol SUPERADMIN) omite la verificación.
 *
 * @param {string} nombrePermiso - Ej: "marcas:read", "ventas:create"
 */
const checkPermiso = (nombrePermiso) => (req, res, next) => {
  const { roles = [], permisos = [] } = req.user || {};

  // Superadmin bypassa todo
  if (roles.includes("SUPERADMIN")) {
    return next();
  }

  if (!permisos.includes(nombrePermiso)) {
    return errorResponse(
      res,
      { status: 403 },
      `Sin permiso: ${nombrePermiso}`,
      403
    );
  }

  next();
};

module.exports = { verifyJWT, checkPermiso };
