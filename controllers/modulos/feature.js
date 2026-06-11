const models = require("../../models/mysql");

const getModulosFtr = async () => {
  const rows = await models.Modulo.findAll({
    order: [["feature_label", "ASC"]],
  });
  return rows;
};

const getModuloFtr = async (id) => {
  const modulo = await models.Modulo.findByPk(id);
  if (!modulo) {
    const error = new Error("Módulo no encontrado");
    error.status = 404;
    throw error;
  }
  return modulo;
};

const updateModuloFtr = async (id, body) => {
  const modulo = await models.Modulo.findByPk(id);
  if (!modulo) {
    const error = new Error("Módulo no encontrado");
    error.status = 404;
    throw error;
  }

  // Solo permitir actualizar permiso_nombre desde el panel
  if (body.permiso_nombre !== undefined) {
    modulo.permiso_nombre = body.permiso_nombre || null;
  }
  if (body.feature_label !== undefined) {
    modulo.feature_label = body.feature_label;
  }

  await modulo.save();
  return modulo;
};

module.exports = {
  getModulosFtr,
  getModuloFtr,
  updateModuloFtr,
};
