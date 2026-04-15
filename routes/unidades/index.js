const { Router } = require("express");
const ctrl = require("../../controllers/unidades");
//const { verifyJWT, checkPermiso } = require("../../middlewares/auth/verifyJWT");

const router = Router();

router.get("/",       /* verifyJWT, checkPermiso("productos:read"), */   ctrl.getUnidadesCtrl);
router.get("/:id",    /* verifyJWT, checkPermiso("productos:read"), */   ctrl.getUnidadCtrl);
router.post("/",      /* verifyJWT, checkPermiso("productos:create"), */ ctrl.createUnidadCtrl);
router.put("/:id",    /* verifyJWT, checkPermiso("productos:update"), */ ctrl.updateUnidadCtrl);
router.delete("/:id", /* verifyJWT, checkPermiso("productos:delete"), */ ctrl.deleteUnidadCtrl);

module.exports = router;
