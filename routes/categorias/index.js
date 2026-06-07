const { Router } = require('express');
const { getCategoriasCtrl, getCategoriaCtrl, createCategoriaCtrl, updateCategoriaCtrl, deleteCategoriaCtrl } = require('../../controllers/categorias');
const { verifyJWT, checkPermiso } = require('../../middlewares/auth/verifyJWT');
const { createCategoriaValidator, updateCategoriaValidator } = require('../../middlewares/validators/categorias');

const router = Router();

router.get('/',       verifyJWT, checkPermiso("categorias:read"),                              getCategoriasCtrl);
router.get('/:id',    verifyJWT, checkPermiso("categorias:read"),                              getCategoriaCtrl);
router.post('/',      verifyJWT, checkPermiso("categorias:create"), createCategoriaValidator,  createCategoriaCtrl);
router.put('/:id',    verifyJWT, checkPermiso("categorias:update"), updateCategoriaValidator,  updateCategoriaCtrl);
router.delete('/:id', verifyJWT, checkPermiso("categorias:delete"),                            deleteCategoriaCtrl);

module.exports = router;
