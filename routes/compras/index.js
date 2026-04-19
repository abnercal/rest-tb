const { Router } = require("express");
const ctrl = require("../../controllers/compras");
const { verifyJWT, checkPermiso } = require("../../middlewares/auth/verifyJWT");

const router = Router();

router.get("/",       /* verifyJWT, checkPermiso("compras:read"), */   ctrl.getComprasCtrl);
router.get("/:id",    /* verifyJWT, checkPermiso("compras:read"), */   ctrl.getCompraCtrl);
router.post("/",      /* verifyJWT, checkPermiso("compras:create"), */ ctrl.createCompraCtrl);
router.put("/:id",    /* verifyJWT, checkPermiso("compras:update"), */ ctrl.updateCompraCtrl);
//router.delete("/:id", /* verifyJWT, checkPermiso("compras:delete"), */ ctrl.deleteCompraCtrl);
router.post("/anular/:id", ctrl.deleteCompraCtrl);

module.exports = router;
