const { Router } = require("express");
const { getLotesCtrl, getLotesPorVencerCtrl } = require("../../controllers/lotes");
const { verifyJWT, checkPermiso } = require("../../middlewares/auth/verifyJWT");

const router = Router();

// ─── Reporte de productos por vencer (debe ir ANTES de una futura /:id) ─────
router.get("/por-vencer", verifyJWT, checkPermiso("lotes:read"), getLotesPorVencerCtrl);

// ─── Listado ─────────────────────────────────────────────────────────────────
router.get("/", verifyJWT, checkPermiso("lotes:read"), getLotesCtrl);

module.exports = router;
