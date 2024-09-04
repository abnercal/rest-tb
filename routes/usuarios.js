const { Router } = require('express')
const { usuariosGet, 
    usuariosDelete, 
    usuariosPost, 
    usuariosPut, 
    getUsuario} = require('../controllers/usuarios')

const router = Router()

router.get('/', usuariosGet )
router.get('/:id', getUsuario )
router.post('/', usuariosPost )
router.put('/:id', usuariosPut )
router.delete('/:id', usuariosDelete )


module.exports = router