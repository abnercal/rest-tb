const { Router } = require('express')
const { getComprasCtrl,getCompraCtrl,postCompraCtrl,putCompraCtrl,deleteCompraCtrl} = require('../controllers/compras/index')

const router = Router()

router.get('/', getComprasCtrl )
router.get('/:id', getCompraCtrl )
router.post('/', postCompraCtrl )
router.put('/:id', putCompraCtrl )
router.delete('/:id', deleteCompraCtrl )

module.exports = router