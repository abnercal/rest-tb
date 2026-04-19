const feature = require("./feature");
const { errorResponse, successResponse } = require("../../utils/handleError");

const login = async (req, res) => {
  try {
    const data = await feature.login(req.body);
    return successResponse(res, "Inicio de sesión exitoso", data);
  } catch (error) {
    return errorResponse(res, error, "Error al iniciar sesión");
  }
};

const logoutCtrl = async (req, res) => {
  try {
    const data = await feature.logoutFtr(req.user?.id);
    return successResponse(res, "Sesión cerrada correctamente", data);
  } catch (error) {
    return errorResponse(res, error, "Error al cerrar sesión");
  }
};
module.exports = {
  login,
  logoutCtrl
};