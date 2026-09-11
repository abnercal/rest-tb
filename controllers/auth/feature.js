const bcrypt = require("bcryptjs");
const models = require("../../models/mysql/index");
const { signToken } = require("../../utils/jwt");

/**
 * Login: busca usuario activo, valida password,
 * carga roles y permisos, genera JWT
 */
const login = async ({ email, password }) => {
  // Buscar usuario
  const usuario = await models.Usuario.findOne({
    where: { email, estado: 1 },
    include: [
      {
        model: models.Rol,
        as: "Roles",
        include: [
          {
            model: models.Permiso,
            as: "Permisos",
          },
        ],
      },
      {
        model: models.Sucursal,
        as: "Sucursal",
      },
    ],
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

  // Extraer nombres de roles y permisos para el token
  const roles = usuario.Roles?.map((r) => r.nombrerol) || [];
  const permisos = [
    ...new Set(
      usuario.Roles?.flatMap((r) =>
        r.Permisos?.map((p) => p.nombre) || []
      ) || []
    ),
  ];

  // Generar token
  const token = signToken(usuario, roles, permisos);

  // Preparar respuesta
  const usuarioResponse = usuario.toJSON();
  delete usuarioResponse.password;

  return {
    token,
    usuario: usuarioResponse,
  };
};

/**
 * Logout: en JWT stateless el logout es del lado cliente.
 * Este endpoint sirve para registrar el evento si se desea.
 */
const logoutFtr = async (userId) => {
  // Si se implementa blacklist de tokens, aquí se agrega la lógica.
  // Por ahora solo confirma el evento.
  return { message: "Sesión cerrada correctamente" };
};

module.exports = {
  login,
  logoutFtr
};