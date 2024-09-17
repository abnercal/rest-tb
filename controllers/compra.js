const { response, request } = require('express')
const Compra = require('../models/mysql/compra');
const CompraDetalle = require('../models/mysql/detalle_compra');
const Almacen = require('../models/mysql/almacen');
const { handleHttpError } = require('../utils/handleError');
const { dbConnect } = require('../config/db/connection');

const getCompras = async (req= request, res= response) => {
    try {
        const compras = await Compra.findAllData();
        res.json({
            msg: 'Lista de Compras',
            compras
        })
    } catch (error) {
        console.error(error);
        handleHttpError(res, error)
    }
}

const getCompra = async (req= request, res= response) => {
    const { id } = req.params;
    try {
        const compra = await Compra.findOneData(id);
        if (compra) {
            res.json({
                msg: 'getCompra',
                id,
                compra
            })
        } else {
            res.status(404).json({
                msg:`No existe el registro con el id ${ id }`
            })
        }
    } catch (error) {
        console.error(error);
        handleHttpError(res, error)
    } 
}

const postCompra = async (req, res= response) => {

    const { body } = req;
    const { detalles } = body;

    const transaction = await dbConnect.transaction();

    try {
        // 1. Creacion encabezado de la compra
        const compra = await Compra.create(body, { transaction });

        // 2. Crear detalles de compra
        for (const detalle of detalles) {
            await CompraDetalle.create({
                ...detalle,
                idcompra: compra._id
            }, { transaction });

            // 3. Actualizar el stock del producto
            const almacen = await Almacen.findOne({
                where: {
                    codigoprod: detalle.codigoprod,
                    idsucursal: detalle.idsucursal,
                }
            });

            if (almacen) {
                // Si el producto ya existe en el almacén, actualiza el stock
                almacen.stock += detalle.cantidad;
                await almacen.save({ transaction });
            } else {
                // Si el producto no existe en el almacén, crea un nuevo registro
                await Almacen.create({
                    codigoprod: detalle.codigoprod,
                    idsucursal: detalle.idsucursal,
                    stock: detalle.cantidad,
                    fecha: new Date()
                }, { transaction });
            }
        }

        // Confirmar la transacción
        await transaction.commit();

        res.status(201).json({
            msg: 'Compra creada correctamente',
            compra
        });
        
    } catch (error) {
        console.log(error)
        await transaction.rollback();
        handleHttpError(res, error)
    }
}
const putCompra = async (req, res= response) => {
    const {id} = req.params
    const { body} = req
    try {
        const compra = await Compra.findByPk( id );
        if(!compra) {
            return res.status(404).json({
                msg:`No existe el registro con el id ${ id }`
            })
        }

        await compra.update( body );
        res.status(201).json({
            msg: 'Transaccion correcta',
            body
        })
        
    } catch (error) {
        console.error(error)
        handleHttpError(res, error)
    }
}
const deleteCompra = async (req, res= response) => {
    const { id } = req.params;
    try {
        const compra = await Compra.findByPk( id );
        if(!compra) {
            return res.status(404).json({
                msg:`No existe el registro con el id ${ id }`
            })
        }

        await compra.update({estado: false})

        res.json({
            msg: 'Compra eliminada correctamente',
            id
        })
    } catch (error) {
        handleHttpError(res, error)
    }
}

module.exports = {getCompras, getCompra, postCompra, putCompra, deleteCompra}