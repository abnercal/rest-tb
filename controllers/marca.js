const { response, request } = require('express')
const { handleHttpError } = require('../utils/handleError');
const Marca = require('../models/mysql/marca');

const getMarcas = async (req= request, res= response) => {
    try {
        const marcas = await Marca.findAll();
        res.json({
            msg: 'Lista de marcas',
            marcas
        })
    } catch (error) {
        handleHttpError(res, error)
    }
}
const getMarca = async (req= request, res= response) => {
    const { id } = req.params;
    try {
        const marcas = await Marca.findByPk(id);
        if (marcas) {
            res.json({
                msg: 'Obtener marca',
                id,
                marcas
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
const postMarcas = async (req, res= response) => {
    const { body} = req
    try {
        const marcas = await Marca.create(body);
        res.status(201).json({
            msg: 'Marca creada correctamente',
            marcas
        })
        
    } catch (error) {
        handleHttpError(res, error)
    }
}
const putMarcas = async (req, res= response) => {
    const {id} = req.params
    const { body} = req
    console.log(id)
    try {
        const marcas = await Marca.findByPk( id );
        console.log(marcas)
        if(!marcas) {
            return res.status(404).json({
                msg:`No existe el registro con el id ${ id }`
            })
        }

        await marcas.update( body );
        res.status(201).json({
            msg: 'Transaccion correcta',
            body
        })
        
    } catch (error) {
        handleHttpError(res, error)
    }
}
const deleteMarca = async (req, res= response) => {
    const { id } = req.params;
    try {
        const marcas = await Marca.findByPk( id );
        if(!marcas) {
            return res.status(404).json({
                msg:`No existe el registro con el id ${ id }`
            })
        }

        //await categoria.destroy( );
        await marcas.update({estado: false})

        res.json({
            msg: 'Marca eliminada correctamente',
            id
        })
    } catch (error) {
        handleHttpError(res, error)
    }
}

module.exports = {getMarcas, getMarca, postMarcas, putMarcas, deleteMarca}