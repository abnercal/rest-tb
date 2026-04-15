const feature = require("./feature");
const { successResponse, errorResponse } = require("../../utils/handleError");

const getProveedoresCtrl = async (req, res) => {
  try {
    const result = await feature.getProveedoresFtr(req.query);
    return successResponse(
      res,
      "Lista de proveedores",
      result.data,
      result.meta,
    );
  } catch (error) {
    return errorResponse(res, error, "Error al obtener proveedores");
  }
};

const getProveedorCtrl = async (req, res) => {
  try {
    const result = await feature.getProveedorFtr(req.params.id);
    return successResponse(res, "Proveedor encontrado", result);
  } catch (error) {
    return errorResponse(res, error, "Error al obtener proveedor");
  }
};

const createProveedorCtrl = async (req, res) => {
  try {
    const data = await feature.createProveedorFtr(req.body);
    return successResponse(res, "Proveedor creado", data, null, 201);
  } catch (error) {
    return errorResponse(res, error, "Error al crear proveedor");
  }
};

const updateProveedorCtrl = async (req, res) => {
  try {
    const data = await feature.updateProveedorFtr(req.params.id, req.body);
    return successResponse(res, "Proveedor actualizado", data);
  } catch (error) {
    return errorResponse(res, error, "Error al actualizar proveedor");
  }
};

const deleteProveedorCtrl = async (req, res) => {
  try {
    await feature.deleteProveedorFtr(req.params.id);
    return successResponse(res, "Proveedor eliminado");
  } catch (error) {
    return errorResponse(res, error, "Error al eliminar proveedor");
  }
};

module.exports = {
  getProveedoresCtrl,
  getProveedorCtrl,
  createProveedorCtrl,
  updateProveedorCtrl,
  deleteProveedorCtrl,
};
