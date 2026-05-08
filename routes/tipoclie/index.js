const { Router } = require('express')
const { getTiposClieCtrl, getTipoClieCtrl,  } = require('../../controllers/tipocli')

const router = Router()

router.get('/', getTiposClieCtrl )
router.get('/:id', getTipoClieCtrl )

module.exports = router