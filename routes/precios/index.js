const { Router } = require("express");
const {
  getPreciosCtrl,
  getPrecioCtrl,
  createPrecioCtrl,
  updatePrecioCtrl,
  deletePrecioCtrl,
  getPrecioByPresentacionCtrl,
  getPreciosByProductoCtrl,
} = require("../../controllers/precios");
const { verifyJWT, checkPermiso } = require("../../middlewares/auth/verifyJWT");

const router = Router();

// ─── Consulta rápida (debe ir ANTES de /:id) ────────────────────────────────
router.get(
  "/by-presentacion/:idprodPresenta",
  verifyJWT,
  checkPermiso("precios:read"),
  getPrecioByPresentacionCtrl
);

// ─── Precios por producto ───────────────────────────────────────────────────
router.get(
  "/by-producto/:codigoprod",
  verifyJWT,
  checkPermiso("precios:read"),
  getPreciosByProductoCtrl
);

// ─── CRUD ────────────────────────────────────────────────────────────────────
router.get("/",       verifyJWT, checkPermiso("precios:read"),   getPreciosCtrl);
router.get("/:id",    verifyJWT, checkPermiso("precios:read"),   getPrecioCtrl);
router.post("/",      verifyJWT, checkPermiso("precios:create"), createPrecioCtrl);
router.put("/:id",    verifyJWT, checkPermiso("precios:update"), updatePrecioCtrl);
router.delete("/:id", verifyJWT, checkPermiso("precios:delete"), deletePrecioCtrl);

module.exports = router;
