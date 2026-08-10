const { Router } = require("express");
const ctrl = require("../../controllers/compras");
const { verifyJWT, checkPermiso } = require("../../middlewares/auth/verifyJWT");
const { createCompraValidator, updateCompraValidator } = require("../../middlewares/validators/compras");

const router = Router();

router.get("/",             verifyJWT, checkPermiso("compras:read"),                              ctrl.getComprasCtrl);
router.get("/next-code",    verifyJWT, checkPermiso("compras:create"),                            ctrl.nextCodeCtrl);
router.get("/:id",          verifyJWT, checkPermiso("compras:read"),                              ctrl.getCompraCtrl);
router.post("/",            verifyJWT, checkPermiso("compras:create"), createCompraValidator,     ctrl.createCompraCtrl);
router.put("/:id",          verifyJWT, checkPermiso("compras:update"), updateCompraValidator,     ctrl.updateCompraCtrl);
router.post("/anular/:id",  verifyJWT, checkPermiso("compras:delete"),                           ctrl.deleteCompraCtrl);
router.post("/:id/pagos",   verifyJWT, checkPermiso("compras:update"),                           ctrl.registrarPagoCompraCtrl);

module.exports = router;
