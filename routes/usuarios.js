const { Router } = require('express')
const usuarioController = require('../controllers/usuarios')
const { createUsuarioValidator } = require("../middlewares/validators/usuario");

const router = Router()

router.get('/', usuarioController.getUsuarios )
router.get('/:id', usuarioController.getUsuarioById )
router.post('/', createUsuarioValidator ,usuarioController.crearUsuario )
router.put('/:id', usuarioController.updateUsuario )
router.delete('/:id', usuarioController.deleteUsuario )


module.exports = router