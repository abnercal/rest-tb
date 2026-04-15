const { Router } = require('express')
const { getMarcasCtrl, getMarcaCtrl, createMarcasCtrl, updateMarcasCtrl, delMarcasCtrl } = require('../../controllers/marcas')

const router = Router()

router.get('/', getMarcasCtrl )
router.get('/:id', getMarcaCtrl )
router.post('/', createMarcasCtrl )
router.put('/:id', updateMarcasCtrl )
router.delete('/:id', delMarcasCtrl )

module.exports = router