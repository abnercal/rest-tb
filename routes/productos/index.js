const { Router } = require("express");
const ctrl = require("../../controllers/productos");
//const { verifyJWT, checkPermiso } = require("../../middlewares/auth/verifyJWT");

const router = Router();

router.get("/",       /* verifyJWT, checkPermiso("productos:read"), */   ctrl.getProductosCtrl);
router.get("/:id",    /* verifyJWT, checkPermiso("productos:read"), */   ctrl.getProductoCtrl);
router.post("/",      /* verifyJWT, checkPermiso("productos:create"), */ ctrl.createProductoCtrl);
router.put("/:id",    /* verifyJWT, checkPermiso("productos:update"), */ ctrl.updateProductoCtrl);
router.delete("/:id", /* verifyJWT, checkPermiso("productos:delete"), */ ctrl.deleteProductoCtrl);

module.exports = router;
