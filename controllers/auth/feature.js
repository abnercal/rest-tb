const bcrypt = require("bcryptjs");
const models = require("../../models/mysql/index");
const { signToken } = require("../../utils/jwt");

const login = async ({ email, password }) => {
  // Buscar usuario
  const usuario = await models.Usuario.findOne({
    where: { email, estado: 1 },
  });

  if (!usuario) {
    const error = new Error("Credenciales inválidas");
    error.status = 401;
    throw error;
  }

  // Comparar password
  const passwordValido = bcrypt.compareSync(password, usuario.password);
  if (!passwordValido) {
    const error = new Error("Credenciales inválidas");
    error.status = 401;
    throw error;
  }

  // Generar token
  const token = signToken(usuario);

  // Preparar respuesta
  const usuarioResponse = usuario.toJSON();
  delete usuarioResponse.password;

  return {
    token,
    usuario: usuarioResponse,
  };
};

module.exports = {
  login,
};