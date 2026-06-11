const { Router } = require("express");
const ctrl = require("../../controllers/reportes/inventario");
const { verifyJWT, checkPermiso } = require("../../middlewares/auth/verifyJWT");

const router = Router();

router.get("/inventario", verifyJWT, checkPermiso("reporte:read"), ctrl.getInventarioCtrl);

module.exports = router;
