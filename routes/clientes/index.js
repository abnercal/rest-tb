const { Router } = require("express");
const ctrl = require("../../controllers/clientes");
const { verifyJWT, checkPermiso } = require("../../middlewares/auth/verifyJWT");
const { createClienteValidator, updateClienteValidator } = require("../../middlewares/validators/clientes");

const router = Router();

router.get("/",       verifyJWT, checkPermiso("clientes:read"),                            ctrl.getClientesCtrl);
router.get("/:id",    verifyJWT, checkPermiso("clientes:read"),                            ctrl.getClienteCtrl);
router.post("/",      verifyJWT, checkPermiso("clientes:create"), createClienteValidator,  ctrl.createClienteCtrl);
router.put("/:id",    verifyJWT, checkPermiso("clientes:update"), updateClienteValidator,  ctrl.updateClienteCtrl);
router.delete("/:id", verifyJWT, checkPermiso("clientes:delete"),                          ctrl.deleteClienteCtrl);

module.exports = router;
