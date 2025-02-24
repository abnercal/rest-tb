// controllers/ventas/index.js
const feature = require('./feature');
const { handleHttpError } = require('../../utils/errorHandler');

/**
 * Crear una nueva orden (venta)
 * @param {Object} req - Objeto de solicitud HTTP
 * @param {Object} res - Objeto de respuesta HTTP
 */
const crearOrden = async (req, res) => {
  try {
    const { cliente, detalles, pago } = req.body;
    const nuevaOrden = await feature.crearOrden(cliente, detalles, pago);
    res.status(201).json(nuevaOrden);
  } catch (error) {
    handleHttpError(res, error);
  }
};

/**
 * Obtener una orden por su ID
 * @param {Object} req - Objeto de solicitud HTTP
 * @param {Object} res - Objeto de respuesta HTTP
 */
const obtenerOrden = async (req, res) => {
  try {
    const { id } = req.params;
    const orden = await feature.obtenerOrden(id);
    res.status(200).json(orden);
  } catch (error) {
    handleHttpError(res, error);
  }
};

module.exports = {
  crearOrden,
  obtenerOrden,
};