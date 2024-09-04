const { Router } = require('express')
const { getPresentacion, getPresentaciones, postPresentaciones, putPresentaciones, deletePresentaciones } = require('../controllers/presentacion')

const router = Router()

router.get('/', getPresentaciones )
router.get('/:id', getPresentacion )
router.post('/', postPresentaciones )
router.put('/:id', putPresentaciones )
router.delete('/:id', deletePresentaciones )

module.exports = router