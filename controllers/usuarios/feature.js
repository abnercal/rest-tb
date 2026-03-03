const models = require("../../models/mysql/index");
const bcrypt = require("bcryptjs");
const { Sequelize } = require("../../models/mysql/index");

/**
 * Campos que NO deben enviarse al cliente
 */
const EXCLUDE_FIELDS = ["password"];

/**
 * Obtener todos los usuarios
 */
const getUsuarios = async (query = {}) => {
  try {
    const { page = 1, limit = 10, search = "" } = query;
    const offset = (page - 1) * limit;

    let whereCondition = { estado: 1 };

    if (search) {
      whereCondition = {
        ...whereCondition,
        [models.Sequelize.Op.or]: [
          { nombre: { [models.Sequelize.Op.like]: `%${search}%` } },
          { apellido: { [models.Sequelize.Op.like]: `%${search}%` } },
          { username: { [models.Sequelize.Op.like]: `%${search}%` } },
          { email: { [models.Sequelize.Op.like]: `%${search}%` } },
        ],
      };
    }

    const usuarios = await models.Usuario.findAll({
      where: whereCondition,
      attributes: { exclude: EXCLUDE_FIELDS },
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["createdAt", "DESC"]],
    });

    const totalUsuarios = await models.Usuario.count({ where: whereCondition });

    return {
      usuarios,
      total: totalUsuarios,
      totalPages: Math.ceil(totalUsuarios / limit),
      currentPage: parseInt(page),
    };
  } catch (error) {
    throw new Error(`Error al obtener los usuarios: ${error.message}`);
  }
};

/**
 * Obtener usuario por ID
 */
const getUsuarioById = async (id) => {
  try {
    const usuario = await models.Usuario.findOne({
      where: { _id: id, estado: 1 },
      attributes: { exclude: EXCLUDE_FIELDS },
    });

    if (!usuario) {
      throw new Error("Usuario no encontrado");
    }

    return usuario;
  } catch (error) {
    throw new Error(`Error al obtener el usuario: ${error.message}`);
  }
};

/**
 * Crear usuario (password encriptado)
 */
const createUsuario = async (data) => {
  try {
    const { email, password, ...rest } = data;
    // Validar email duplicado
    const existeEmail = await models.Usuario.findOne({ where: { email } });
    if (existeEmail) {
      const error = new Error("El correo ya está registrado");
      error.status = 409;
      throw error;
    }

    // Encriptar password
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    const nuevoUsuario = await models.Usuario.create({
      ...rest,
      email,
      password: passwordHash,
    });

    const usuarioResponse = nuevoUsuario.toJSON();
    delete usuarioResponse.password;

    return usuarioResponse;
  } catch (error) {
if (error.name === "SequelizeUniqueConstraintError") {
    const campo = error.errors[0].path;

    let mensaje = "Dato duplicado";
    if (campo === "email") {
      mensaje = "El correo ya está registrado";
    }
    if (campo === "codigoemp") {
      mensaje = "El código de empresa ya existe";
    }

    const err = new Error(mensaje);
    err.status = 409;
    throw err;
  }

  throw error;
  }
};

/**
 * Actualizar usuario (si viene password, se encripta)
 */
const updateUsuario = async (id, data) => {
  try {
    const usuario = await models.Usuario.findByPk(id);

    if (!usuario || usuario.estado !== 1) {
      throw new Error("Usuario no encontrado");
    }

    if (data.password) {
      const salt = bcrypt.genSaltSync(10);
      data.password = bcrypt.hashSync(data.password, salt);
    }

    const usuarioActualizado = await usuario.update(data);

    const usuarioResponse = usuarioActualizado.toJSON();
    delete usuarioResponse.password;

    return usuarioResponse;
  } catch (error) {
    throw new Error(`Error al actualizar el usuario: ${error.message}`);
  }
};

/**
 * Eliminar usuario (soft delete)
 */
const deleteUsuario = async (id) => {
  try {
    const usuario = await models.Usuario.findByPk(id);

    if (!usuario || usuario.estado !== 1) {
      throw new Error("Usuario no encontrado");
    }

    await usuario.update({ estado: 0 });
  } catch (error) {
    throw new Error(`Error al eliminar el usuario: ${error.message}`);
  }
};

module.exports = {
  getUsuarios,
  getUsuarioById,
  createUsuario,
  updateUsuario,
  deleteUsuario,
};