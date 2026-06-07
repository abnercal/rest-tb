const { Router } = require("express");
const ctrl = require("../../controllers/productos");
const { upload, handleUploadError } = require("../../middlewares/imagen/archivos");
const { verifyJWT, checkPermiso } = require("../../middlewares/auth/verifyJWT");
const { createProductoValidator, updateProductoValidator } = require("../../middlewares/validators/productos");

const router = Router();

router.get("/",       verifyJWT, checkPermiso("productos:read"),                                ctrl.getProductosCtrl);
router.get("/:id",    verifyJWT, checkPermiso("productos:read"),                                ctrl.getProductoCtrl);
router.post("/",      verifyJWT, checkPermiso("productos:create"), createProductoValidator,     upload("productos", "imagen"), handleUploadError, ctrl.createProductoCtrl);
router.put("/:id",    verifyJWT, checkPermiso("productos:update"), updateProductoValidator,     upload("productos", "imagen"), handleUploadError, ctrl.updateProductoCtrl);
router.delete("/:id", verifyJWT, checkPermiso("productos:delete"),                              ctrl.deleteProductoCtrl);

module.exports = router;
