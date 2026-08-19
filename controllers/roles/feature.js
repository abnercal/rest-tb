const { Op } = require("sequelize");
const models = require("../../models/mysql");

const getRolesFtr = async (query) => {
  const search = query.search || "";
  const hasPagination = query.page !== undefined || query.limit !== undefined;

  let where = {};
  if (search) {
    where[Op.or] = [{ nombrerol: { [Op.like]: `%${search}%` } }];
  }

  const FULL_INCLUDE = [
    { model: models.Permiso, as: "Permisos", attributes: ["_id", "nombre"] },
  ];

  if (!hasPagination) {
    const { count, rows } = await models.Rol.findAndCountAll({
      where,
      include: FULL_INCLUDE,
      order: [["nombrerol", "ASC"]],
      distinct: true,
    });
    return { data: rows, meta: { total: count } };
  }

  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 20;

  // Paso 1: resolver qué IDs de rol entran en esta página, SIN el include
  // belongsToMany (Permisos) de por medio — ver nota en getVentasFtr (controllers/ventas/feature.js).
  // Con un to-many en el include, LIMIT se aplica sobre las filas del JOIN (una
  // por cada permiso), no sobre roles distintos: un rol con varios permisos
  // "consume" varias posiciones del limit y terminan devolviéndose menos
  // roles de los pedidos por página.
  const { count, rows: idRows } = await models.Rol.findAndCountAll({
    where,
    attributes: ["_id"],
    order: [["nombrerol", "ASC"]],
    distinct: true,
    limit,
    offset: (page - 1) * limit,
  });

  const totalPages = Math.ceil(count / limit);
  if (idRows.length === 0) {
    return { data: [], meta: { total: count, totalPages, currentPage: page, limit } };
  }

  // Paso 2: traer esos roles completos (con Permisos) para los IDs de esta página
  const ids = idRows.map((r) => r._id);
  const rows = await models.Rol.findAll({
    where: { _id: { [Op.in]: ids } },
    include: FULL_INCLUDE,
    order: [["nombrerol", "ASC"]],
  });

  return { data: rows, meta: { total: count, totalPages, currentPage: page, limit } };
};

const getRolFtr = async (id) => {
  const rol = await models.Rol.findByPk(id, {
    include: [
      { model: models.Permiso, as: "Permisos", attributes: ["_id", "nombre"] },
    ],
  });

  if (!rol) {
    const error = new Error("Rol no encontrado");
    error.status = 404;
    throw error;
  }

  return rol;
};

const createRolFtr = async (body) => {
  const transaction = await models.sequelize.transaction();

  try {
    const { permisos = [], ...rolData } = body;

    const nuevoRol = await models.Rol.create(rolData, { transaction });

    if (permisos.length > 0) {
      const permisoData = permisos.map((idpermiso) => ({
        idrol: nuevoRol._id,
        idpermiso,
      }));
      await models.RolPermiso.bulkCreate(permisoData, { transaction });
    }

    await transaction.commit();

    // Retornar con permisos incluidos
    const rolConPermisos = await models.Rol.findByPk(nuevoRol._id, {
      include: [
        { model: models.Permiso, as: "Permisos", attributes: ["_id", "nombre"] },
      ],
    });

    return rolConPermisos;
  } catch (error) {
    await transaction.rollback();

    if (error.name === "SequelizeUniqueConstraintError") {
      const err = new Error("El nombre del rol ya existe");
      err.status = 409;
      throw err;
    }

    throw error;
  }
};

const updateRolFtr = async (id, body) => {
  const transaction = await models.sequelize.transaction();

  try {
    const rol = await models.Rol.findByPk(id);
    if (!rol) {
      const error = new Error("Rol no encontrado");
      error.status = 404;
      throw error;
    }

    const { permisos, ...updateData } = body;

    if (Object.keys(updateData).length > 0) {
      await rol.update(updateData, { transaction });
    }

    // Actualizar permisos si vienen en el body
    if (permisos && Array.isArray(permisos)) {
      await models.RolPermiso.destroy({ where: { idrol: id }, transaction });

      if (permisos.length > 0) {
        const permisoData = permisos.map((idpermiso) => ({
          idrol: id,
          idpermiso,
        }));
        await models.RolPermiso.bulkCreate(permisoData, { transaction });
      }
    }

    await transaction.commit();

    // Retornar con permisos incluidos
    const rolConPermisos = await models.Rol.findByPk(id, {
      include: [
        { model: models.Permiso, as: "Permisos", attributes: ["_id", "nombre"] },
      ],
    });

    return rolConPermisos;
  } catch (error) {
    await transaction.rollback();

    if (error.name === "SequelizeUniqueConstraintError") {
      const err = new Error("El nombre del rol ya existe");
      err.status = 409;
      throw err;
    }

    throw error;
  }
};

const deleteRolFtr = async (id) => {
  const rol = await models.Rol.findByPk(id);

  if (!rol) {
    const error = new Error("Rol no encontrado");
    error.status = 404;
    throw error;
  }

  // Eliminar relaciones N:M antes de borrar el rol
  await models.RolPermiso.destroy({ where: { idrol: id } });

  await rol.destroy();
  return true;
};

module.exports = {
  getRolesFtr,
  getRolFtr,
  createRolFtr,
  updateRolFtr,
  deleteRolFtr,
};
