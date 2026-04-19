const { Router } = require("express");
const ctrl = require("../../controllers/sucursales");
//const { verifyJWT, checkPermiso } = require("../../middlewares/auth/verifyJWT");

const router = Router();

router.get("/",       /* verifyJWT, checkPermiso("sucursales:read"), */   ctrl.getSucursalesCtrl);
router.get("/:id",    /* verifyJWT, checkPermiso("sucursales:read"), */   ctrl.getSucursalCtrl);
router.post("/",      /* verifyJWT, checkPermiso("sucursales:create"), */ ctrl.createSucursalCtrl);
router.put("/:id",    /* verifyJWT, checkPermiso("sucursales:update"), */ ctrl.updateSucursalCtrl);
router.delete("/:id", /* verifyJWT, checkPermiso("sucursales:delete"), */ ctrl.deleteSucursalCtrl);

module.exports = router;
