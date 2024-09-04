const { response, request } = require('express')
const { handleHttpError } = require('../utils/handleError');
const Proveedor = require('../models/mysql/proveedor');

const getProveedores = async (req= request, res= response) => {
    try {
        const proveedor = await Proveedor.findAll();
        res.json({
            msg: 'Lista de proveedores',
            proveedor
        })
    } catch (error) {
        handleHttpError(res, error)
    }
}
const getProveedor = async (req= request, res= response) => {
    const { id } = req.params;
    try {
        const proveedor = await Proveedor.findByPk(id);
        if (proveedor) {
            res.json({
                msg: 'Obtener proveedor',
                id,
                proveedor
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
const postProveedor = async (req, res= response) => {
    const { body} = req
    try {
        const proveedor = await Proveedor.create(body);
        res.status(201).json({
            msg: 'Proveedor creada correctamente',
            proveedor
        })
        
    } catch (error) {
        handleHttpError(res, error)
    }
}
const putProveedor = async (req, res= response) => {
    const {id} = req.params
    const { body} = req
    try {
        const proveedor = await Proveedor.findByPk( id );
        if(!proveedor) {
            return res.status(404).json({
                msg:`No existe el registro con el id ${ id }`
            })
        }

        await proveedor.update( body );
        res.status(201).json({
            msg: 'Transaccion correcta',
            body
        })
        
    } catch (error) {
        handleHttpError(res, error)
    }
}
const deleteProveedor = async (req, res= response) => {
    const { id } = req.params;
    try {
        const proveedor = await Proveedor.findByPk( id );
        if(!proveedor) {
            return res.status(404).json({
                msg:`No existe el registro con el id ${ id }`
            })
        }

        //await categoria.destroy( );
        await proveedor.update({estado: false})

        res.json({
            msg: 'Proveedor eliminada correctamente',
            id
        })
    } catch (error) {
        handleHttpError(res, error)
    }
}

module.exports = {getProveedores, getProveedor, postProveedor, putProveedor, deleteProveedor}