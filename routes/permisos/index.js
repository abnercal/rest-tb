const { Router } = require('express');
const ctrl = require('../../controllers/permisos');
const { createPermisoValidator, updatePermisoValidator } = require('../../middlewares/validators/permisos');
const { verifyJWT, checkPermiso } = require('../../middlewares/auth/verifyJWT');

const router = Router();

router.get('/',       verifyJWT, checkPermiso("permisos:read"),                        ctrl.getPermisosCtrl);
router.get('/:id',    verifyJWT, checkPermiso("permisos:read"),                        ctrl.getPermisoCtrl);
router.post('/',      verifyJWT, checkPermiso("permisos:create"),  createPermisoValidator,  ctrl.createPermisoCtrl);
router.put('/:id',    verifyJWT, checkPermiso("permisos:update"),  updatePermisoValidator,  ctrl.updatePermisoCtrl);
router.delete('/:id', verifyJWT, checkPermiso("permisos:delete"),                          ctrl.deletePermisoCtrl);

module.exports = router;
