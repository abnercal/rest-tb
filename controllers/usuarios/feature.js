const crypto = require("crypto");
const models = require("../../models/mysql/index");
const bcrypt = require("bcryptjs");
const { Op } = require("sequelize");
const { deleteImageFile } = require("../../utils/imagen");
/**
 * Campos que NO deben enviarse al cliente
 */
const EXCLUDE_FIELDS = ["password"];

const buildImageUrl = (req, imagePath) => {
  if (!imagePath) return null;
  const base = `${req.protocol}://${req.get('host')}`;
  return `${base}${imagePath}`;
};

// ─── Transformar rows para incluir imageUrl ───────────────────────────────────
const toDTO = (req, usuario) => {
  const data = typeof usuario.toJSON === 'function' ? usuario.toJSON() : { ...usuario };
  delete data.password;
  data.imageUrl = buildImageUrl(req, data.imagen);
  return data;
};

/**
 * Obtener todos los usuarios
 */
const getUsuariosFtr = async (req, query = {}) => {
  const search = query.search || "";
  const hasPagination = query.page !== undefined || query.limit !== undefined;

  let where = { estado: 1 };

  if (search) {
    where[Op.or] = [
      { nombre: { [Op.like]: `%${search}%` } },
      { apellido: { [Op.like]: `%${search}%` } },
      { username: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } },
    ];
  }

  const FULL_INCLUDE = [
    { model: models.Rol, as: "Roles", attributes: ["_id", "nombrerol"] },
    { model: models.Sucursal, as: "Sucursal", attributes: ["idsucursal", "nombre"] },
  ];

  if (!hasPagination) {
    const { count, rows } = await models.Usuario.findAndCountAll({
      where,
      attributes: { exclude: EXCLUDE_FIELDS },
      include: FULL_INCLUDE,
      order: [["createdAt", "DESC"]],
      distinct: true,
    });
    return { data: rows.map((u) => toDTO(req, u)), meta: { total: count } };
  }

  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 10;

  // Paso 1: resolver qué IDs de usuario entran en esta página, SIN el include
  // belongsToMany (Roles) de por medio — ver nota en getVentasFtr (controllers/ventas/feature.js).
  // Con un to-many en el include, LIMIT se aplica sobre las filas del JOIN (una
  // por cada rol), no sobre usuarios distintos: un usuario con varios roles
  // "consume" varias posiciones del limit y terminan devolviéndose menos
  // usuarios de los pedidos por página.
  const { count, rows: idRows } = await models.Usuario.findAndCountAll({
    where,
    attributes: ["_id"],
    order: [["createdAt", "DESC"]],
    distinct: true,
    limit,
    offset: (page - 1) * limit,
  });

  const totalPages = Math.ceil(count / limit);
  if (idRows.length === 0) {
    return { data: [], meta: { total: count, totalPages, currentPage: page, limit } };
  }

  // Paso 2: traer esos usuarios completos (con Roles) para los IDs de esta página
  const ids = idRows.map((r) => r._id);
  const rows = await models.Usuario.findAll({
    where: { _id: { [Op.in]: ids } },
    attributes: { exclude: EXCLUDE_FIELDS },
    include: FULL_INCLUDE,
    order: [["createdAt", "DESC"]],
  });

  return {
    data: rows.map((u) => toDTO(req, u)),
    meta: { total: count, totalPages, currentPage: page, limit },
  };
};

/**
 * Obtener usuario por ID
 */
const getUsuarioFtr = async (req, id) => {
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

  return toDTO(req, usuario);
};

/**
 * Crear usuario (password encriptado)
 */
const createUsuarioFtr = async (req, data, file) => {
  const transaction = await models.sequelize.transaction();

  try {
    const { email, password, roles = [], username, codigoemp, idsucursal, ...rest } = data;

    // Optional fields: enviar null en vez de string vacío para evitar conflictos con UNIQUE
    const cleanUsername = username || null;
    // Si no mandan código empleado, se genera automático: EMP- + 5 aleatorios
    const cleanCodigoemp = codigoemp || `EMP-${crypto.randomUUID().replace(/-/g, '').slice(0, 5).toUpperCase()}`;
    // Sucursal: usar la del usuario logueado (req.user) si no se especifica
    const cleanIdsucursal = idsucursal ?? req.user?.idsucursal;

    const imagen = file ? `/usuarios/${file.filename}` : null;

    // Validar email duplicado
    const existeEmail = await models.Usuario.findOne({ where: { email }, transaction });
    if (existeEmail) {
      // Si ya subió imagen pero el correo está duplicado, borrarla
      if (file) deleteImageFile(imagen);
      const error = new Error("El correo ya está registrado");
      error.status = 409;
      throw error;
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    const nuevoUsuario = await models.Usuario.create(
      { ...rest, email, username: cleanUsername, codigoemp: cleanCodigoemp, idsucursal: cleanIdsucursal, password: passwordHash, imagen },
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

    /* const response = nuevoUsuario.toJSON();
    delete response.password;
    return response; */
    return toDTO(req, nuevoUsuario);
  } catch (error) {
    await transaction.rollback();

    if (error.name === "SequelizeUniqueConstraintError") {
      const campo = error.errors[0]?.path;
      const mensaje =
        campo === "email"
          ? "El correo ya está registrado"
          : campo === "codigoemp"
          ? "El código de empresa ya existe"
          : campo === "username"
          ? "El nombre de usuario ya existe"
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
const updateUsuarioFtr = async (req, id, data, file) => {
  const transaction = await models.sequelize.transaction();

  try {
    const usuario = await models.Usuario.findByPk(id);

    if (!usuario || usuario.estado !== 1) {
      // Si se subió imagen nueva pero el usuario no existe, borrarla
      if (file) deleteImageFile(`/usuarios/${file.filename}`);
      const error = new Error("Usuario no encontrado");
      error.status = 404;
      throw error;
    }

    const { roles, password, username, codigoemp, idsucursal, ...rest } = data;

    if (password) {
      const salt = bcrypt.genSaltSync(10);
      rest.password = bcrypt.hashSync(password, salt);
    }

    // Optional fields: enviar null en vez de string vacío
    if (username !== undefined) rest.username = username || null;
    // En update, no regenerar código — solo si mandan uno con valor
    if (codigoemp) rest.codigoemp = codigoemp;
    // Sucursal: usar la del usuario logueado si no se especifica
    if (idsucursal !== undefined) rest.idsucursal = idsucursal;
    else if (!usuario.idsucursal) rest.idsucursal = req.user?.idsucursal;
    
    // Si viene nueva imagen → borrar la anterior y asignar la nueva
    if (file) {
      deleteImageFile(usuario.imagen);          // borra la vieja del disco
      rest.imagen = `/usuarios/${file.filename}`;
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

    /* const response = usuario.toJSON();
    delete response.password;
    return response; */

    return toDTO(req, usuario);
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

  // Borrar imagen del disco antes del soft delete
  deleteImageFile(usuario.imagen);

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