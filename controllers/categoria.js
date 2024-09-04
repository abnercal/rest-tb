const { response, request } = require('express')
const Categoria = require('../models/mysql/categoria');
const { handleHttpError } = require('../utils/handleError');

const getCategorias = async (req= request, res= response) => {
    try {
        const categorias = await Categoria.findAll();
        res.json({
            msg: 'Lista de Categorías',
            categorias
        })
    } catch (error) {
        console.error(error);
        res.status(500).json({
            msg: 'Error al obtener las categorías'
        });
    }
}

const getCategoria = async (req= request, res= response) => {
    const { id } = req.params;
    try {
        const categoria = await Categoria.findByPk(id);
        if (categoria) {
            res.json({
                msg: 'getUsuario',
                id,
                categoria
            })
        } else {
            res.status(404).json({
                msg:`No existe el registro con el id ${ id }`
            })
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({
            msg: 'Error al obtener la categoría'
        });
    } 
}

const postCategoria = async (req, res= response) => {
    const { body} = req
    try {
        const categoria = await Categoria.create(body);
        res.status(201).json({
            msg: 'Categoría creada correctamente',
            categoria
        })
        
    } catch (error) {
        console.log(error)
        res.status(500).json({
            msg: 'Error al guardad en la db'
        })
    }
}
const putCategoria = async (req, res= response) => {
    const {id} = req.params
    const { body} = req
    try {
        const categoria = await Categoria.findByPk( id );
        if(!categoria) {
            return res.status(404).json({
                msg:`No existe el registro con el id ${ id }`
            })
        }

        await categoria.update( body );
        res.status(201).json({
            msg: 'Transaccion correcta',
            body
        })
        
    } catch (error) {
        console.error(error)
        res.status(500).json({
            msg: 'Error al actualizar la categoría'
        })
    }
}
const deleteCategoria = async (req, res= response) => {
    const { id } = req.params;
    try {
        const categoria = await Categoria.findByPk( id );
        if(!categoria) {
            return res.status(404).json({
                msg:`No existe el registro con el id ${ id }`
            })
        }

        //await categoria.destroy( );
        await categoria.update({estado: false})

        res.json({
            msg: 'Categoría eliminada correctamente',
            id
        })
    } catch (error) {
        handleHttpError(res, error)
        /* console.error(error);
        res.status(500).json({
            msg: 'Error al eliminar la categoría'
        }); */
    }
}

module.exports = {getCategorias, getCategoria, postCategoria, putCategoria, deleteCategoria}