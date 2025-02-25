// controllers/ventas/index.js
const feature = require('./feature');
const { handleHttpError } = require("../../utils/manejoError");
const { dbConnect } = require("../../config/db/connection");

const listarOrdenes = async (req, res) => {
  try {
    const { ordenes, total, totalPages, currentPage } = await feature.getOrdenes(req);
    return res.status(200).json({
      msg: "Lista de ordenes",
      ordenes,
      total,
      totalPages,
      currentPage,
    })
  } catch (error) {
    handleHttpError(res, error, "Error al listar las ordenes", 500);
  }
  
}

/**
 * Crear una nueva orden (venta)
 * @param {Object} req - Objeto de solicitud HTTP
 * @param {Object} res - Objeto de respuesta HTTP
 */
const crearOrden = async (req, res) => {
  let transaction;
  try {
    transaction = await dbConnect.transaction();
    const { cliente, detalles, pago } = req.body;
    const nuevaOrden = await feature.crearOrden(cliente, detalles, pago, transaction);
    await  transaction.commit();
    return res.status(201).json({ msg: "Venta creada correctamente", nuevaOrden });
  } catch (error) {
    if (transaction) {
      await transaction.rollback(); // Rollback si hubo algún error
    }
    handleHttpError(res, error, "Error al crear la orden", 500);
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
    res.status(200).json({ msg: 'Detalles de una orden', orden });
  } catch (error) {
    handleHttpError(res, error, "Error al buscar la orden", 500);
  }
};

module.exports = {
  listarOrdenes,
  crearOrden,
  obtenerOrden,
};