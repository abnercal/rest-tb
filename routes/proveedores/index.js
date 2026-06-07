const { Router } = require("express");
const ctrl = require("../../controllers/proveedores");
const { verifyJWT, checkPermiso } = require("../../middlewares/auth/verifyJWT");
const { createProveedorValidator, updateProveedorValidator } = require("../../middlewares/validators/proveedores");

const router = Router();

router.get("/",       verifyJWT, checkPermiso("proveedores:read"),                                ctrl.getProveedoresCtrl);
router.get("/:id",    verifyJWT, checkPermiso("proveedores:read"),                                ctrl.getProveedorCtrl);
router.post("/",      verifyJWT, checkPermiso("proveedores:create"), createProveedorValidator,    ctrl.createProveedorCtrl);
router.put("/:id",    verifyJWT, checkPermiso("proveedores:update"), updateProveedorValidator,    ctrl.updateProveedorCtrl);
router.delete("/:id", verifyJWT, checkPermiso("proveedores:delete"),                              ctrl.deleteProveedorCtrl);

module.exports = router;
