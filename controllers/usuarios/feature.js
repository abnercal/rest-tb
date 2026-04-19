const models = require("../../models/mysql/index");
const bcrypt = require("bcryptjs");
const { Op } = require("sequelize");

/**
 * Campos que NO deben enviarse al cliente
 */
const EXCLUDE_FIELDS = ["password"];

/**
 * Obtener todos los usuarios
 */
const getUsuariosFtr = async (query = {}) => {
    const { page = 1, limit = 10, search = "" } = query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let where = { estado: 1 };

  if (search) {
    where[Op.or] = [
      { nombre: { [Op.like]: `%${search}%` } },
      { apellido: { [Op.like]: `%${search}%` } },
      { username: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } },
    ];
  }

  const { count, rows } = await models.Usuario.findAndCountAll({
    where,
    attributes: { exclude: EXCLUDE_FIELDS },
    include: [
      { model: models.Rol, as: "Roles", attributes: ["_id", "nombrerol"] },
      { model: models.Sucursal, as: "Sucursal", attributes: ["idsucursal", "nombre"] },
    ],
    limit: parseInt(limit),
    offset,
    order: [["createdAt", "DESC"]],
    distinct: true,
  });

  return {
    data: rows,
    meta: {
      total: count,
      totalPages: Math.ceil(count / parseInt(limit)),
      currentPage: parseInt(page),
      limit: parseInt(limit),
    },
  };
};

/**
 * Obtener usuario por ID
 */
const getUsuarioFtr = async (id) => {
  const usuario = await models.Usuario.findOne({
    where: { _id: id, estado: 1 },
    attributes: { exclude: EXCLUDE_FIELDS },
    include: [
      { model: models.Rol, as: "Roles", attributes: ["_id", "nombrerol"] },
      { model: models.Sucursal, as: "Sucursal" },
    ],
  });

  if (!usuario) {
    const error = new Error("Usuario no encontrado");
    error.status = 404;
    throw error;
  }

  return usuario;
};

/**
 * Crear usuario (password encriptado)
 */
const createUsuarioFtr = async (data) => {
  const transaction = await models.sequelize.transaction();

  try {
    const { email, password, roles = [], ...rest } = data;

    // Validar email duplicado
    const existeEmail = await models.Usuario.findOne({ where: { email }, transaction });
    if (existeEmail) {
      const error = new Error("El correo ya está registrado");
      error.status = 409;
      throw error;
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    const nuevoUsuario = await models.Usuario.create(
      { ...rest, email, password: passwordHash },
      { transaction }
    );

    // Asignar roles al nuevo usuario
    if (roles.length > 0) {
      const rolData = roles.map((idrol) => ({
        idusuario: nuevoUsuario._id,
        idrol,
      }));
      await models.UsuarioRol.bulkCreate(rolData, { transaction });
    }

    await transaction.commit();

    const response = nuevoUsuario.toJSON();
    delete response.password;
    return response;
  } catch (error) {
    await transaction.rollback();

    if (error.name === "SequelizeUniqueConstraintError") {
      const campo = error.errors[0]?.path;
      const mensaje =
        campo === "email"
          ? "El correo ya está registrado"
          : campo === "codigoemp"
          ? "El código de empresa ya existe"
          : "Dato duplicado";
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
const updateUsuarioFtr = async (id, data) => {
  const transaction = await models.sequelize.transaction();

  try {
    const usuario = await models.Usuario.findByPk(id);

    if (!usuario || usuario.estado !== 1) {
      const error = new Error("Usuario no encontrado");
      error.status = 404;
      throw error;
    }

    const { roles, password, ...rest } = data;

    if (password) {
      const salt = bcrypt.genSaltSync(10);
      rest.password = bcrypt.hashSync(password, salt);
    }

    await usuario.update(rest, { transaction });

    // Actualizar roles si vienen en el body
    if (roles && Array.isArray(roles)) {
      await models.UsuarioRol.destroy({ where: { idusuario: id }, transaction });
      if (roles.length > 0) {
        const rolData = roles.map((idrol) => ({ idusuario: id, idrol }));
        await models.UsuarioRol.bulkCreate(rolData, { transaction });
      }
    }

    await transaction.commit();

    const response = usuario.toJSON();
    delete response.password;
    return response;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * Eliminar usuario (soft delete)
 */
const deleteUsuarioFtr = async (id) => {
  const usuario = await models.Usuario.findByPk(id);

  if (!usuario || usuario.estado !== 1) {
    const error = new Error("Usuario no encontrado");
    error.status = 404;
    throw error;
  }

  await usuario.update({ estado: 0 });
  return true;
};

module.exports = {
  getUsuariosFtr,
  getUsuarioFtr,
  createUsuarioFtr,
  updateUsuarioFtr,
  deleteUsuarioFtr,
};