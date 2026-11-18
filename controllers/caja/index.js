const feature = require("./feature.js");
const { successResponse, errorResponse } = require("../../utils/handleError.js");

// ───── cajas (catálogo) ─────

const getCajasCtrl = async (req, res) => {
  try {
    const result = await feature.getCajasFtr(req.query, req.user);
    return successResponse(res, "Lista de cajas", result.data, result.meta);
  } catch (error) {
    return errorResponse(res, error, "Error al obtener cajas");
  }
};

const getCajaCtrl = async (req, res) => {
  try {
    const result = await feature.getCajaFtr(req.params.id, req.user);
    return successResponse(res, "Caja encontrada", result);
  } catch (error) {
    return errorResponse(res, error, "Error al obtener caja");
  }
};

const createCajaCtrl = async (req, res) => {
  try {
    const data = await feature.createCajaFtr(req.body, req.user);
    return successResponse(res, "Caja creada", data, null, 201);
  } catch (error) {
    return errorResponse(res, error, "Error al crear caja");
  }
};

const updateCajaCtrl = async (req, res) => {
  try {
    const data = await feature.updateCajaFtr(req.params.id, req.body, req.user);
    return successResponse(res, "Caja actualizada", data);
  } catch (error) {
    return errorResponse(res, error, "Error al actualizar caja");
  }
};

const delCajaCtrl = async (req, res) => {
  try {
    await feature.delCajaFtr(req.params.id, req.user);
    return successResponse(res, "Caja eliminada");
  } catch (error) {
    return errorResponse(res, error, "Error al eliminar caja");
  }
};

// ───── sesiones ─────

const abrirCajaCtrl = async (req, res) => {
  try {
    const data = await feature.abrirCajaFtr(req.params.idcaja, req.body, req.user);
    return successResponse(res, "Caja abierta", data, null, 201);
  } catch (error) {
    return errorResponse(res, error, "Error al abrir caja");
  }
};

const getSesionActualCtrl = async (req, res) => {
  try {
    const data = await feature.getSesionActualFtr(req.query, req.user);
    return successResponse(res, "Sesión de caja actual", data);
  } catch (error) {
    return errorResponse(res, error, "Error al obtener la sesión actual");
  }
};

const getSesionesCtrl = async (req, res) => {
  try {
    const result = await feature.getSesionesFtr(req.query, req.user);
    return successResponse(res, "Lista de sesiones de caja", result.data, result.meta);
  } catch (error) {
    return errorResponse(res, error, "Error al obtener sesiones de caja");
  }
};

const getSesionCtrl = async (req, res) => {
  try {
    const data = await feature.getSesionFtr(req.params.id, req.user);
    return successResponse(res, "Sesión de caja encontrada", data);
  } catch (error) {
    return errorResponse(res, error, "Error al obtener sesión de caja");
  }
};

const cerrarSesionCtrl = async (req, res) => {
  try {
    const data = await feature.cerrarSesionFtr(req.params.id, req.body, req.user);
    return successResponse(res, "Caja cerrada", data);
  } catch (error) {
    return errorResponse(res, error, "Error al cerrar caja");
  }
};

const getArqueoCtrl = async (req, res) => {
  try {
    const data = await feature.getArqueoFtr(req.params.id, req.user);
    return successResponse(res, "Arqueo de caja", data);
  } catch (error) {
    return errorResponse(res, error, "Error al obtener el arqueo");
  }
};

// ───── movimientos ─────

const crearMovimientoCtrl = async (req, res) => {
  try {
    const data = await feature.crearMovimientoFtr(req.params.id, req.body, req.user);
    return successResponse(res, "Movimiento de caja registrado", data, null, 201);
  } catch (error) {
    return errorResponse(res, error, "Error al registrar movimiento de caja");
  }
};

const getMovimientosCtrl = async (req, res) => {
  try {
    const result = await feature.getMovimientosFtr(req.params.id, req.query, req.user);
    return successResponse(res, "Movimientos de caja", result.data, result.meta);
  } catch (error) {
    return errorResponse(res, error, "Error al obtener movimientos de caja");
  }
};

module.exports = {
  getCajasCtrl,
  getCajaCtrl,
  createCajaCtrl,
  updateCajaCtrl,
  delCajaCtrl,
  abrirCajaCtrl,
  getSesionActualCtrl,
  getSesionesCtrl,
  getSesionCtrl,
  cerrarSesionCtrl,
  getArqueoCtrl,
  crearMovimientoCtrl,
  getMovimientosCtrl,
};
