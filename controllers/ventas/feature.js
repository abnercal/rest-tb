// controllers/ventas/feature.js
const models = require("../../models/mysql/index");

/**
 * Crear una nueva orden (venta)
 * @param {Object} cliente - Datos del cliente
 * @param {Array} detalles - Detalles de la orden (productos y cantidades)
 * @param {Object} pago - Datos del pago
 * @returns {Object} - Orden creada
 */
const crearOrden = async (cliente, detalles, pago, transaction) => {
  try {
    // Verificar si el cliente existe
    const clienteExistente = await models.Cliente.findByPk(cliente.idcliente, { transaction });
    if (!clienteExistente) {
      throw new Error('El cliente no existe');
    }

    // Calcular el total de la orden
    let total = 0;
    for (const detalle of detalles) {
      const producto = await models.Producto.findOne({ where: { codigoprod: detalle.codigoprod }, transaction });
      if (!producto) {
        throw new Error(`El producto con código ${detalle.codigoprod} no existe`);
      }
      total += detalle.cantidad * detalle.precio;
    }

    // Crear la orden
    const nuevaOrden = await models.Orden.create({
      fecha: new Date(),
      direccion: cliente.direccion || null,
      cliente: cliente.idcliente,
      total: total,
      estado: 1, // Estado inicial 
    }, { transaction });

    // Crear los detalles de la orden y actualizar el stock
    for (const detalle of detalles) {
      const producto = await models.Producto.findOne({ where: { codigoprod: detalle.codigoprod }, transaction });

      // Verificar si hay suficiente stock en el almacén
      const almacen = await models.Almacen.findOne({ where: { codigoprod: detalle.codigoprod }, transaction });
      if (!almacen || almacen.stock < detalle.cantidad) {
        throw new Error(`No hay suficiente stock para el producto ${producto.nombre}`);
      }

      // Crear el detalle de la orden
      await models.OrdenDetalle.create({
        cantidad: detalle.cantidad,
        precio: detalle.precio,
        idorden: nuevaOrden._id,
        codigoprod: detalle.codigoprod,
      }, { transaction });

      // Actualizar el stock en el almacén
      almacen.stock = Number(almacen.stock) - Number(detalle.cantidad); 
      await almacen.save({ transaction });
    }

    // Registrar el pago
    await models.Pago.create({
      estado: pago.estado || 'Pendiente',
      importe: total,
      idorden: nuevaOrden._id,
      idtipopago: pago.idtipopago || null,
      fecha_pago: new Date(),
    }, { transaction });

    return nuevaOrden;
  } catch (error) {
    throw new Error(`Error al crear la orden: ${error.message}`);
  }
};

/**
 * Obtener una orden por su ID
 * @param {String} id - ID de la orden
 * @returns {Object} - Orden con detalles y pago
 */
const obtenerOrden = async (id) => {
  try {
    const orden = await models.Orden.findOneData(id);
    if (!orden) {
      throw new Error('La orden no existe');
    }
    return orden;
  } catch (error) {
    throw new Error(`Error al obtener la orden: ${error.message}`);
  }
};

module.exports = {
  crearOrden,
  obtenerOrden,
};