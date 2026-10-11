const router = require("express").Router();
const authController = require("../controllers/auth.controller");
const { requireAuth } = require("../middlewares/auth");

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/refresh", authController.refresh);
router.get("/me", requireAuth, authController.me);

module.exports = router;
