const { Router } = require('express')
const { crearOrden,obtenerOrden} = require('../controllers/ventas/index')

const router = Router()

//router.get('/', obtenerOrden )
router.get('/:id', obtenerOrden )
router.post('/', crearOrden )
//router.put('/:id', putCompraCtrl )
//router.delete('/:id', deleteCompraCtrl )

module.exports = router