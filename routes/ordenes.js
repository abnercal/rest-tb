const { Router } = require('express')
const  orden = require('../controllers/ventas/index')
const router = Router()

router.get('/', orden.listarOrdenes )
router.get('/:id', orden.obtenerOrden )
router.post('/', orden.crearOrden )
//router.put('/:id', putCompraCtrl )
//router.delete('/:id', deleteCompraCtrl )

module.exports = router