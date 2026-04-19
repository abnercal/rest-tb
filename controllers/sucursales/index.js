const feature = require("./feature");
const { successResponse, errorResponse } = require("../../utils/handleError");

const getSucursalesCtrl = async (req, res) => {
  try {
    const result = await feature.getSucursalesFtr(req.query);
    return successResponse(res, "Lista de sucursales", result.data, result.meta);
  } catch (error) {
    return errorResponse(res, error, "Error al obtener sucursales");
  }
};

const getSucursalCtrl = async (req, res) => {
  try {
    const result = await feature.getSucursalFtr(req.params.id);
    return successResponse(res, "Sucursal encontrada", result);
  } catch (error) {
    return errorResponse(res, error, "Error al obtener sucursal");
  }
};

const createSucursalCtrl = async (req, res) => {
  try {
    const data = await feature.createSucursalFtr(req.body);
    return successResponse(res, "Sucursal creada", data, null, 201);
  } catch (error) {
    return errorResponse(res, error, "Error al crear sucursal");
  }
};

const updateSucursalCtrl = async (req, res) => {
  try {
    const data = await feature.updateSucursalFtr(req.params.id, req.body);
    return successResponse(res, "Sucursal actualizada", data);
  } catch (error) {
    return errorResponse(res, error, "Error al actualizar sucursal");
  }
};

const deleteSucursalCtrl = async (req, res) => {
  try {
    await feature.deleteSucursalFtr(req.params.id);
    return successResponse(res, "Sucursal eliminada");
  } catch (error) {
    return errorResponse(res, error, "Error al eliminar sucursal");
  }
};

module.exports = {
  getSucursalesCtrl,
  getSucursalCtrl,
  createSucursalCtrl,
  updateSucursalCtrl,
  deleteSucursalCtrl,
};
