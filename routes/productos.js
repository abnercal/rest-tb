const { Router } = require('express')
const { getProductos, getProducto, postProducto, putProducto, deleteProducto } = require('../controllers/producto')

const router = Router()

router.get('/', getProductos )
router.get('/:id', getProducto )
router.post('/', postProducto )
router.put('/:id', putProducto )
router.delete('/:id', deleteProducto )

module.exports = router