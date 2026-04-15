const { Router } = require("express");
const ctrl = require("../../controllers/clientes");
//const { verifyJWT, checkPermiso } = require("../../middlewares/auth/verifyJWT");

const router = Router();

router.get("/",       /* verifyJWT, checkPermiso("clientes:read"), */   ctrl.getClientesCtrl);
router.get("/:id",    /* verifyJWT, checkPermiso("clientes:read"), */   ctrl.getClienteCtrl);
router.post("/",      /* verifyJWT, checkPermiso("clientes:create"), */ ctrl.createClienteCtrl);
router.put("/:id",    /* verifyJWT, checkPermiso("clientes:update"), */ ctrl.updateClienteCtrl);
router.delete("/:id", /* verifyJWT, checkPermiso("clientes:delete"), */ ctrl.deleteClienteCtrl);

module.exports = router;
