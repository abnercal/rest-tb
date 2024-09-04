const { response, request } = require('express')
const { handleHttpError } = require('../utils/handleError');
const Presentacion = require('../models/mysql/presentacion');

const getPresentaciones = async (req= request, res= response) => {
    try {
        const presentacion = await Presentacion.findAll();
        res.json({
            msg: 'Lista de presentaciones',
            presentacion
        })
    } catch (error) {
        handleHttpError(res, error)
    }
}
const getPresentacion = async (req= request, res= response) => {
    const { id } = req.params;
    try {
        const presentacion = await Presentacion.findByPk(id);
        if (presentacion) {
            res.json({
                msg: 'Obtener presentacion',
                id,
                presentacion
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
const postPresentaciones = async (req, res= response) => {
    const { body} = req
    try {
        const presentacion = await Presentacion.create(body);
        res.status(201).json({
            msg: 'Presentacion creada correctamente',
            presentacion
        })
        
    } catch (error) {
        handleHttpError(res, error)
    }
}
const putPresentaciones = async (req, res= response) => {
    const {id} = req.params
    const { body} = req
    try {
        const presentacion = await Presentacion.findByPk( id );
        if(!presentacion) {
            return res.status(404).json({
                msg:`No existe el registro con el id ${ id }`
            })
        }

        await presentacion.update( body );
        res.status(201).json({
            msg: 'Transaccion correcta',
            body
        })
        
    } catch (error) {
        handleHttpError(res, error)
    }
}
const deletePresentaciones = async (req, res= response) => {
    const { id } = req.params;
    try {
        const presentacion = await Presentacion.findByPk( id );
        if(!presentacion) {
            return res.status(404).json({
                msg:`No existe el registro con el id ${ id }`
            })
        }

        //await categoria.destroy( );
        await presentacion.update({estado: false})

        res.json({
            msg: 'Presentacion eliminada correctamente',
            id
        })
    } catch (error) {
        handleHttpError(res, error)
    }
}

module.exports = {getPresentaciones, getPresentacion, postPresentaciones, putPresentaciones, deletePresentaciones}