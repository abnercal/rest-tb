const { Router } = require('express')
const { postOrden } = require('../controllers/orden')

const router = Router()

router.post('/', postOrden )

module.exports = router