const { response, request } = require('express')
const { handleHttpError } = require('../utils/handleError');
const Producto = require('../models/mysql/producto');

const getProductos = async (req= request, res= response) => {
    try {
        const producto = await Producto.findAllData();
        res.json({
            msg: 'Lista de productos',
            producto
        })
    } catch (error) {
        handleHttpError(res, error)
    }
}
const getProducto = async (req= request, res= response) => {
    const { id } = req.params;
    try {
        const producto = await Producto.findOneData(id);
        if (producto) {
            res.json({
                msg: 'Obtener Producto',
                id,
                producto
            })
        } else {
            res.status(404).json({
                msg:`No existe el registro con el id ${ id }`
            })
        }
    } catch (error) {
        handleHttpError(res, error)
    } 
}
const postProducto = async (req, res= response) => {
    const { body} = req
    try {
        const producto = await Producto.create(body);
        res.status(201).json({
            msg: 'Producto creada correctamente',
            producto
        })
        
    } catch (error) {
        handleHttpError(res, error)
    }
}
const putProducto = async (req, res= response) => {
    const {id} = req.params
    const { body} = req
    console.log(id)
    try {
        const producto = await Producto.findByPk( id );
        console.log(producto)
        if(!producto) {
            return res.status(404).json({
                msg:`No existe el registro con el id ${ id }`
            })
        }

        await producto.update( body );
        res.status(201).json({
            msg: 'Transaccion correcta',
            body
        })
        
    } catch (error) {
        handleHttpError(res, error)
    }
}
const deleteProducto = async (req, res= response) => {
    const { id } = req.params;
    try {
        const producto = await Producto.findByPk( id );
        if(!producto) {
            return res.status(404).json({
                msg:`No existe el registro con el id ${ id }`
            })
        }

        await producto.update({estado: false})

        res.json({
            msg: 'Producto eliminada correctamente',
            id
        })
    } catch (error) {
        handleHttpError(res, error)
    }
}

module.exports = {getProductos, getProducto, postProducto, putProducto, deleteProducto}