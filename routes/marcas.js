const { Router } = require('express')
const { getMarcas, getMarca, postMarcas, putMarcas, deleteMarca } = require('../controllers/marca')

const router = Router()

router.get('/', getMarcas )
router.get('/:id', getMarca )
router.post('/', postMarcas )
router.put('/:id', putMarcas )
router.delete('/:id', deleteMarca )

module.exports = router