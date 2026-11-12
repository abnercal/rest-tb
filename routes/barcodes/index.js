const { Router } = require("express");
const ctrl = require("../../controllers/barcodes");
const { verifyJWT, checkPermiso } = require("../../middlewares/auth/verifyJWT");
const {
  createBarcodeValidator,
  updateBarcodeValidator,
  idBarcodeParamValidator,
  lookupBarcodeValidator,
} = require("../../middlewares/validators/barcodes");

const router = Router();

// Se reutilizan los permisos de productos (no hay permisos "barcodes:*" sembrados).
// /lookup/:barcode va ANTES de /:id (escaneo del POS: devuelve presentación + variante).
router.get("/lookup/:barcode", verifyJWT, checkPermiso("productos:read"),   lookupBarcodeValidator,                          ctrl.lookupBarcodeCtrl);
router.get("/",               verifyJWT, checkPermiso("productos:read"),                                                     ctrl.getBarcodesCtrl);
router.get("/:id",            verifyJWT, checkPermiso("productos:read"),   idBarcodeParamValidator,                          ctrl.getBarcodeCtrl);
router.post("/",              verifyJWT, checkPermiso("productos:create"), createBarcodeValidator,                           ctrl.createBarcodeCtrl);
router.put("/:id",            verifyJWT, checkPermiso("productos:update"), idBarcodeParamValidator, updateBarcodeValidator,  ctrl.updateBarcodeCtrl);
router.delete("/:id",         verifyJWT, checkPermiso("productos:delete"), idBarcodeParamValidator,                          ctrl.deleteBarcodeCtrl);

module.exports = router;
