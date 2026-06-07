const { Router } = require('express')

const { login, logoutCtrl } = require("../../controllers/auth");
const { loginValidator } = require("../../middlewares/validators/auth");
const { verifyJWT } = require("../../middlewares/auth/verifyJWT")

const router = Router();
// POST /api/auth/login
router.post("/login", loginValidator, login);

// POST /api/auth/logout  (requiere token válido)
router.post("/logout", verifyJWT, logoutCtrl);

module.exports = router;