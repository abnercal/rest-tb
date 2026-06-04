const { Router } = require('express');
const ctrl = require('../../controllers/roles');
//const { verifyJWT, checkPermiso } = require('../../middlewares/auth/verifyJWT');

const router = Router();

router.get('/',       /* verifyJWT, checkPermiso("roles:read"),    */ ctrl.getRolesCtrl);
router.get('/:id',    /* verifyJWT, checkPermiso("roles:read"),    */ ctrl.getRolCtrl);
router.post('/',      /* verifyJWT, checkPermiso("roles:create"),  */ ctrl.createRolCtrl);
router.put('/:id',    /* verifyJWT, checkPermiso("roles:update"),  */ ctrl.updateRolCtrl);
router.delete('/:id', /* verifyJWT, checkPermiso("roles:delete"),  */ ctrl.deleteRolCtrl);

module.exports = router;
