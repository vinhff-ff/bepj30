const router = require("express").Router();
const userController = require("../controllers/user.controller");
const { requireAuth, requireRole } = require("../middlewares/auth");

// Quản lý tài khoản chỉ dành cho ADMIN
router.get("/", requireAuth, requireRole("ADMIN"), userController.listUsers);
router.post("/", requireAuth, requireRole("ADMIN"), userController.createUser);
// Thống kê giới tính người dùng
router.get("/stats/gender", requireAuth, requireRole("ADMIN"), userController.getGenderStats);
// Thống kê tổng quan cho Admin
router.get("/stats/overview", requireAuth, requireRole("ADMIN"), userController.getAdminOverviewStats);

router.get("/:id", requireAuth, userController.getUser);
router.put("/:id", requireAuth, userController.updateUser);
router.delete("/:id", requireAuth, requireRole("ADMIN"), userController.deleteUser);

module.exports = router;
