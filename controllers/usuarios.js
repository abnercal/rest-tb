const { response, request } = require('express')
const usuariosGet = (req= request, res= response) => {
    res.json({
        msg: 'getUsuarios'
    })
}

const getUsuario = (req= request, res= response) => {
    const { id } = req.params;
    res.json({
        msg: 'getUsuario',
        id
    })
}

const usuariosPost = (req, res= response) => {
    const { body} = req
    res.status(201).json({
        msg: 'post API - controller',
        body
    })
}
const usuariosPut = (req, res= response) => {
    const {id} = req.params
    const { body } = req
    res.status(500).json({
        msg: 'put API - controller',
        id,
        body
    })
}
const usuariosDelete = (req, res= response) => {
    const { id } = req.params;
    res.json({
        msg: 'delete API - controller',
        id
    })
}

module.exports = {usuariosGet, getUsuario, usuariosPost, usuariosPut, usuariosDelete}