// controllers/ventas/feature.js
const { Orden, OrdenDetalle, Cliente, Producto, Almacen, Pago } = require('../../models');
const { handleHttpError } = require('../../utils/errorHandler');

/**
 * Crear una nueva orden (venta)
 * @param {Object} cliente - Datos del cliente
 * @param {Array} detalles - Detalles de la orden (productos y cantidades)
 * @param {Object} pago - Datos del pago
 * @returns {Object} - Orden creada
 */
const crearOrden = async (cliente, detalles, pago) => {
  try {
    // Verificar si el cliente existe
    const clienteExistente = await Cliente.findByPk(cliente.idclientes);
    if (!clienteExistente) {
      throw new Error('El cliente no existe');
    }

    // Calcular el total de la orden
    let total = 0;
    for (const detalle of detalles) {
      const producto = await Producto.findOne({ where: { codigoprod: detalle.codigoprod } });
      if (!producto) {
        throw new Error(`El producto con código ${detalle.codigoprod} no existe`);
      }
      total += detalle.cantidad * producto.precio;
    }

    // Crear la orden
    const nuevaOrden = await Orden.create({
      fecha: new Date(),
      direccion: cliente.direccion || null,
      cliente: cliente.idclientes,
      estado: 1, // Estado inicial (por ejemplo, 1 = Pendiente)
    });

    // Crear los detalles de la orden y actualizar el stock
    for (const detalle of detalles) {
      const producto = await Producto.findOne({ where: { codigoprod: detalle.codigoprod } });

      // Verificar si hay suficiente stock en el almacén
      const almacen = await Almacen.findOne({ where: { codigoprod: detalle.codigoprod } });
      if (!almacen || almacen.stock < detalle.cantidad) {
        throw new Error(`No hay suficiente stock para el producto ${producto.nombre}`);
      }

      // Crear el detalle de la orden
      await OrdenDetalle.create({
        cantidad: detalle.cantidad,
        precio: producto.precio,
        idorden: nuevaOrden._id,
        codigoprod: detalle.codigoprod,
      });

      // Actualizar el stock en el almacén
      almacen.stock -= detalle.cantidad;
      await almacen.save();
    }

    // Registrar el pago
    await Pago.create({
      estado: pago.estado || 'Pendiente',
      importe: total,
      idorden: nuevaOrden._id,
      idtipopago: pago.idtipopago || null,
      fecha_pago: new Date(),
    });

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
    const orden = await Orden.findOneData(id);
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