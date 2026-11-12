const { Router } = require('express');
const { getPublicosCtrl, getPublicoCtrl, createPublicoCtrl, updatePublicoCtrl, delPublicoCtrl } = require('../../controllers/publicos');
const { verifyJWT, checkPermiso } = require('../../middlewares/auth/verifyJWT');
const { createPublicoValidator, updatePublicoValidator } = require('../../middlewares/validators/publicos');

const router = Router();

router.get('/',       verifyJWT, checkPermiso("publicos:read"),                           getPublicosCtrl);
router.get('/:id',    verifyJWT, checkPermiso("publicos:read"),                           getPublicoCtrl);
router.post('/',      verifyJWT, checkPermiso("publicos:create"), createPublicoValidator, createPublicoCtrl);
router.put('/:id',    verifyJWT, checkPermiso("publicos:update"), updatePublicoValidator, updatePublicoCtrl);
router.delete('/:id', verifyJWT, checkPermiso("publicos:delete"),                         delPublicoCtrl);

module.exports = router;
