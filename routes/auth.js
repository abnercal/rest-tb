const { Router } = require('express')
const router = Router();

const { login } = require("../controllers/auth");
const { loginValidator } = require("../middlewares/validators/auth");

router.post("/login", loginValidator, login);

module.exports = router;