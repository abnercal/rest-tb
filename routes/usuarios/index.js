const { Router } = require("express");
const ctrl = require("../../controllers/usuarios");
const { upload, handleUploadError } = require("../../middlewares/imagen/archivos");
//const { verifyJWT, checkPermiso } = require("../../middlewares/auth/verifyJWT");
//const { createUsuarioValidator, updateUsuarioValidator } = require("../../middlewares/validators/usuario");

const router = Router();

// GET /api/usuarios
router.get("/",     /* verifyJWT, checkPermiso("usuarios:read"),  */  ctrl.getUsuariosCtrl);
// GET /api/usuarios/:id
router.get("/:id",  /* verifyJWT, checkPermiso("usuarios:read"), */   ctrl.getUsuarioCtrl);
// POST /api/usuarios
router.post("/",    /* verifyJWT, checkPermiso("usuarios:create"),  createUsuarioValidator,  */ upload("usuarios", "imagen"), handleUploadError, ctrl.createUsuarioCtrl);
// PUT /api/usuarios/:id
router.put("/:id",  /* verifyJWT, checkPermiso("usuarios:update"),  updateUsuarioValidator,  */ upload("usuarios", "imagen"), handleUploadError, ctrl.updateUsuarioCtrl);
// DELETE /api/usuarios/:id
router.delete("/:id", /* verifyJWT, checkPermiso("usuarios:delete"), */ ctrl.deleteUsuarioCtrl);

module.exports = router;
