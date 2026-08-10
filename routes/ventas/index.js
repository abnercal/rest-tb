const { Router } = require("express");
const ctrl = require("../../controllers/ventas");
const { verifyJWT, checkPermiso } = require("../../middlewares/auth/verifyJWT");
const { createVentaValidator, updateVentaValidator } = require("../../middlewares/validators/ventas");

const router = Router();

router.get("/",             verifyJWT, checkPermiso("ventas:read"),                            ctrl.getVentasCtrl);
router.get("/next-code",    verifyJWT, checkPermiso("ventas:create"),                          ctrl.nextCodeCtrl);
router.get("/:id",          verifyJWT, checkPermiso("ventas:read"),                            ctrl.getVentaCtrl);
router.post("/",            verifyJWT, checkPermiso("ventas:create"), createVentaValidator,    ctrl.createVentaCtrl);
router.put("/:id",          verifyJWT, checkPermiso("ventas:update"), updateVentaValidator,    ctrl.updateVentaCtrl);
router.post("/anular/:id",  verifyJWT, checkPermiso("ventas:delete"),                         ctrl.deleteVentaCtrl);
router.post("/:id/convertir", verifyJWT, checkPermiso("ventas:create"),                       ctrl.convertirCotizacionCtrl);
router.post("/:id/entregar",  verifyJWT, checkPermiso("ventas:update"),                       ctrl.marcarEntregadaCtrl);
router.post("/:id/pagos",     verifyJWT, checkPermiso("ventas:update"),                       ctrl.registrarPagoCtrl);

module.exports = router;
