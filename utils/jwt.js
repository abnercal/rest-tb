const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES = process.env.JWT_EXPIRES || "8h";

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET no está definido en el .env");
}

/**
 * Genera un JWT con el payload del usuario
 * Incluye roles y permisos para autorización en middleware
 */
const signToken = (usuario, roles = [], permisos = []) => {
  return jwt.sign(
    {
      id: usuario._id,
      email: usuario.email,
      roles,
      permisos,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
};

const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

module.exports = { signToken, verifyToken };