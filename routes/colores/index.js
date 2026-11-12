const { Router } = require('express');
const { getColoresCtrl, getColorCtrl, createColorCtrl, updateColorCtrl, delColorCtrl } = require('../../controllers/colores');
const { verifyJWT, checkPermiso } = require('../../middlewares/auth/verifyJWT');
const { createColorValidator, updateColorValidator } = require('../../middlewares/validators/colores');

const router = Router();

router.get('/',       verifyJWT, checkPermiso("colores:read"),                          getColoresCtrl);
router.get('/:id',    verifyJWT, checkPermiso("colores:read"),                          getColorCtrl);
router.post('/',      verifyJWT, checkPermiso("colores:create"), createColorValidator,  createColorCtrl);
router.put('/:id',    verifyJWT, checkPermiso("colores:update"), updateColorValidator,  updateColorCtrl);
router.delete('/:id', verifyJWT, checkPermiso("colores:delete"),                        delColorCtrl);

module.exports = router;
