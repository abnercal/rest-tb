const { response, request } = require('express')
const { handleHttpError } = require('../utils/handleError');
const Producto = require('../models/mysql/producto');
const { Op } = require('sequelize');
const getProductos = async (req= request, res= response) => {
    try {
        const{ page = 1, search = ''} = req.query;
        const pageNumber = parseInt(page);

        const limite = 10;

        const desde = limite * (pageNumber - 1);

        const searchCondition = search
            ? { nombre: { [Op.like]: `%${search}%` } }
            : {};

        const productos = await Producto.findAllData({
            where: searchCondition,
            limit: limite,
            offset: desde,
            order: [['idproducto', 'DESC']]
        });

        const totalProductos = await Producto.count({
            where: searchCondition
        });

        res.json({msg: 'Lista de productos', data: productos, total: totalProductos, currentPage: pageNumber });

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
                data: producto
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
            data: producto
        })
        
    } catch (error) {
        handleHttpError(res, error)
    }
}
const putProducto = async (req, res= response) => {
    const {id} = req.params
    const { body} = req
    try {
        const producto = await Producto.findByPk( id );
        if(!producto) {
            return res.status(404).json({
                msg:`No existe el registro con el id ${ id }`
            })
        }

        await producto.update( body );
        res.status(201).json({
            msg: 'Transaccion correcta',
            //body,
            data: producto
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