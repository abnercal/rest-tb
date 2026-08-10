const { Router } = require("express");
const {
  getDescuentosCtrl,
  getDescuentoCtrl,
  createDescuentoCtrl,
  updateDescuentoCtrl,
  deleteDescuentoCtrl,
} = require("../../controllers/descuentos");
const { verifyJWT, checkPermiso } = require("../../middlewares/auth/verifyJWT");

const router = Router();

// ─── CRUD ────────────────────────────────────────────────────────────────────
router.get("/",       verifyJWT, checkPermiso("descuentos:read"),   getDescuentosCtrl);
router.get("/:id",    verifyJWT, checkPermiso("descuentos:read"),   getDescuentoCtrl);
router.post("/",      verifyJWT, checkPermiso("descuentos:create"), createDescuentoCtrl);
router.put("/:id",    verifyJWT, checkPermiso("descuentos:update"), updateDescuentoCtrl);
router.delete("/:id", verifyJWT, checkPermiso("descuentos:delete"), deleteDescuentoCtrl);

module.exports = router;
