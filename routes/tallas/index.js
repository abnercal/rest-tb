const { Router } = require('express');
const { getTallasCtrl, getTallaCtrl, createTallaCtrl, updateTallaCtrl, delTallaCtrl } = require('../../controllers/tallas');
const { verifyJWT, checkPermiso } = require('../../middlewares/auth/verifyJWT');
const { createTallaValidator, updateTallaValidator } = require('../../middlewares/validators/tallas');

const router = Router();

router.get('/',       verifyJWT, checkPermiso("tallas:read"),                          getTallasCtrl);
router.get('/:id',    verifyJWT, checkPermiso("tallas:read"),                          getTallaCtrl);
router.post('/',      verifyJWT, checkPermiso("tallas:create"), createTallaValidator,  createTallaCtrl);
router.put('/:id',    verifyJWT, checkPermiso("tallas:update"), updateTallaValidator,  updateTallaCtrl);
router.delete('/:id', verifyJWT, checkPermiso("tallas:delete"),                        delTallaCtrl);

module.exports = router;
