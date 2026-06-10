const { Router } = require("express");
const ctrl = require("../../controllers/reportes/inventario");
const { verifyJWT } = require("../../middlewares/auth/verifyJWT");

const router = Router();

router.get("/inventario", verifyJWT, ctrl.getInventarioCtrl);

module.exports = router;
