const { Router } = require('express');
const { getMarcasCtrl, getMarcaCtrl, createMarcasCtrl, updateMarcasCtrl, delMarcasCtrl } = require('../../controllers/marcas');
const { verifyJWT, checkPermiso } = require('../../middlewares/auth/verifyJWT');
const { createMarcaValidator, updateMarcaValidator } = require('../../middlewares/validators/marcas');

const router = Router();

router.get('/',       verifyJWT, checkPermiso("marcas:read"),                          getMarcasCtrl);
router.get('/:id',    verifyJWT, checkPermiso("marcas:read"),                          getMarcaCtrl);
router.post('/',      verifyJWT, checkPermiso("marcas:create"), createMarcaValidator,  createMarcasCtrl);
router.put('/:id',    verifyJWT, checkPermiso("marcas:update"), updateMarcaValidator,  updateMarcasCtrl);
router.delete('/:id', verifyJWT, checkPermiso("marcas:delete"),                        delMarcasCtrl);

module.exports = router;