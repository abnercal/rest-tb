const { Router } = require('express');
const ctrl = require('../../controllers/permisos');
//const { verifyJWT, checkPermiso } = require('../../middlewares/auth/verifyJWT');

const router = Router();

router.get('/',       /* verifyJWT, checkPermiso("permisos:read"),    */ ctrl.getPermisosCtrl);
router.get('/:id',    /* verifyJWT, checkPermiso("permisos:read"),    */ ctrl.getPermisoCtrl);
router.post('/',      /* verifyJWT, checkPermiso("permisos:create"),  */ ctrl.createPermisoCtrl);
router.put('/:id',    /* verifyJWT, checkPermiso("permisos:update"),  */ ctrl.updatePermisoCtrl);
router.delete('/:id', /* verifyJWT, checkPermiso("permisos:delete"),  */ ctrl.deletePermisoCtrl);

module.exports = router;
