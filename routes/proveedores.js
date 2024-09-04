const { Router } = require('express')
const { getProveedores, getProveedor, postProveedor, putProveedor, deleteProveedor } = require('../controllers/proveedor')

const router = Router()

router.get('/', getProveedores )
router.get('/:id', getProveedor )
router.post('/', postProveedor )
router.put('/:id', putProveedor )
router.delete('/:id', deleteProveedor )

module.exports = router