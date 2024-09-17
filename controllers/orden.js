const { response, request } = require('express')
const Orden = require('../models/mysql/orden');
const OrdenDetalle = require('../models/mysql/orden_detalle');
const Almacen = require('../models/mysql/almacen');
const { handleHttpError } = require('../utils/handleError');
const { dbConnect } = require('../config/db/connection');


const postOrden = async (req, res= response) => {

    const { body } = req;
    const { detalles } = body;

    const transaction = await dbConnect.transaction();

    try {
        // 1. Crear la orden
        const orden = await Orden.create(body, { transaction });

        // 2. Crear detalles de la orden
        for (const detalle of detalles) {
            await OrdenDetalle.create({
                ...detalle,
                idorden: orden._id
            }, { transaction });

            // 3. Actualizar el stock del producto
            const almacen = await Almacen.findOne({
                where: {
                    codigoprod: detalle.codigoprod,
                    idsucursal: detalle.idsucursal // Asegúrate de que este campo existe en el detalle
                }
            });

            if (almacen) {
                // Si el producto ya existe en el almacén, actualiza el stock
                if (almacen.stock >= detalle.cantidad) {
                    almacen.stock -= detalle.cantidad;
                    await almacen.save({ transaction });
                } else {
                    throw new Error(`Stock insuficiente para el producto con código ${detalle.codigoprod}`);
                }
            } else {
                throw new Error(`No se encontró el producto con código ${detalle.codigoprod} en la sucursal ${detalle.idsucursal}`);
            }
        }

        // Confirmar la transacción
        await transaction.commit();

        // Enviar respuesta sólo una vez
        res.status(201).json({
            msg: 'Orden creada correctamente',
            orden
        });

    } catch (error) {
        // En caso de error, revertir la transacción
        if (transaction.finished !== 'commit') {
            await transaction.rollback();
        }
        console.error(error);
        handleHttpError(res, error);
    }

}

module.exports = {postOrden}