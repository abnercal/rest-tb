const { Router } = require('express')
const { getCompras, getCompra, postCompra, putCompra, deleteCompra } = require('../controllers/compra')

const router = Router()

router.get('/', getCompras )
router.get('/:id', getCompra )
router.post('/', postCompra )
router.put('/:id', putCompra )
router.delete('/:id', deleteCompra )

module.exports = router