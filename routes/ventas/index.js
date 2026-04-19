const { Router } = require("express");
const ctrl = require("../../controllers/ventas");
//const { verifyJWT, checkPermiso } = require("../../middlewares/auth/verifyJWT");

const router = Router();

router.get("/",       /* verifyJWT, checkPermiso("ventas:read"), */   ctrl.getVentasCtrl);
router.get("/:id",    /* verifyJWT, checkPermiso("ventas:read"), */   ctrl.getVentaCtrl);
router.post("/",      /* verifyJWT, checkPermiso("ventas:create"), */ ctrl.createVentaCtrl);
router.put("/:id",    /* verifyJWT, checkPermiso("ventas:update"), */ ctrl.updateVentaCtrl);
//router.delete("/:id", /* verifyJWT, checkPermiso("ventas:delete"), */ ctrl.deleteVentaCtrl);
router.post("/anular/:id", ctrl.deleteVentaCtrl);

module.exports = router;
