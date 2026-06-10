const { Router } = require("express");
const ctrl = require("../../controllers/tipo-pago");
const { verifyJWT } = require("../../middlewares/auth/verifyJWT");

const router = Router();

router.get("/", verifyJWT, ctrl.getTiposPagoCtrl);

module.exports = router;
