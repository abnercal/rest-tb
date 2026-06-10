const { Op } = require("sequelize");
const models = require("../../models/mysql");

const getRolesFtr = async (query) => {
  const search = query.search || "";
  const hasPagination = query.page !== undefined || query.limit !== undefined;

  let where = {};
  if (search) {
    where[Op.or] = [{ nombrerol: { [Op.like]: `%${search}%` } }];
  }

  let findOptions = {
    where,
    include: [
      { model: models.Permiso, as: "Permisos", attributes: ["_id", "nombre"] },
    ],
    order: [["nombrerol", "ASC"]],
    distinct: true,
  };

  if (hasPagination) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    findOptions.limit = limit;
    findOptions.offset = (page - 1) * limit;

    const { count, rows } = await models.Rol.findAndCountAll(findOptions);
    return {
      data: rows,
      meta: { total: count, totalPages: Math.ceil(count / limit), currentPage: page, limit },
    };
  }

  const { count, rows } = await models.Rol.findAndCountAll(findOptions);
  return { data: rows, meta: { total: count } };
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
