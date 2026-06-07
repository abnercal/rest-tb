const { Router } = require("express");
const ctrl = require("../../controllers/unidades");
const { verifyJWT, checkPermiso } = require("../../middlewares/auth/verifyJWT");
const { createUnidadValidator, updateUnidadValidator } = require("../../middlewares/validators/unidades");

const router = Router();

router.get("/",       verifyJWT, checkPermiso("unidades:read"),                            ctrl.getUnidadesCtrl);
router.get("/:id",    verifyJWT, checkPermiso("unidades:read"),                            ctrl.getUnidadCtrl);
router.post("/",      verifyJWT, checkPermiso("unidades:create"), createUnidadValidator,   ctrl.createUnidadCtrl);
router.put("/:id",    verifyJWT, checkPermiso("unidades:update"), updateUnidadValidator,   ctrl.updateUnidadCtrl);
router.delete("/:id", verifyJWT, checkPermiso("unidades:delete"),                          ctrl.deleteUnidadCtrl);

module.exports = router;
