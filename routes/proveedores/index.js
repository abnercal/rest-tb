const { Router } = require("express");
const ctrl = require("../../controllers/proveedores");
//const { verifyJWT, checkPermiso } = require("../../middlewares/auth/verifyJWT");

const router = Router();

router.get("/",       /* verifyJWT, checkPermiso("proveedores:read"), */   ctrl.getProveedoresCtrl);
router.get("/:id",    /* verifyJWT, checkPermiso("proveedores:read"), */   ctrl.getProveedorCtrl);
router.post("/",      /* verifyJWT, checkPermiso("proveedores:create"), */ ctrl.createProveedorCtrl);
router.put("/:id",    /* verifyJWT, checkPermiso("proveedores:update"), */ ctrl.updateProveedorCtrl);
router.delete("/:id", /* verifyJWT, checkPermiso("proveedores:delete"), */ ctrl.deleteProveedorCtrl);

module.exports = router;
