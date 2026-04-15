const { Router } = require("express");
const ctrl = require("../../controllers/presentaciones");
//const { verifyJWT, checkPermiso } = require("../../middlewares/auth/verifyJWT");

const router = Router();

router.get("/",       /* verifyJWT, checkPermiso("presentaciones:read"), */   ctrl.getPresentacionesCtrl);
router.get("/:id",    /* verifyJWT, checkPermiso("presentaciones:read"), */   ctrl.getPresentacionCtrl);
router.post("/",      /* verifyJWT, checkPermiso("presentaciones:create"), */ ctrl.createPresentacionCtrl);
router.put("/:id",    /* verifyJWT, checkPermiso("presentaciones:update"), */ ctrl.updatePresentacionCtrl);
router.delete("/:id", /* verifyJWT, checkPermiso("presentaciones:delete"), */ ctrl.deletePresentacionCtrl);

module.exports = router;
