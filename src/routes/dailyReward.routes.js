const router = require("express").Router();
const dailyRewardController = require("../controllers/dailyReward.controller");
const { requireAuth, requireRole } = require("../middlewares/auth");

// Người dùng xem trạng thái và nhận xu
router.get("/status", requireAuth, dailyRewardController.getStatus);
router.post("/claim", requireAuth, dailyRewardController.claimDailyReward);

// Quản trị viên cấu hình On/Off, set xu 7 ngày, quản lý xu user
router.get("/config", requireAuth, requireRole("ADMIN"), dailyRewardController.getConfig);
router.put("/config", requireAuth, requireRole("ADMIN"), dailyRewardController.updateConfig);
router.get("/admin/users", requireAuth, requireRole("ADMIN"), dailyRewardController.listUsersWithCoins);
router.post("/admin/adjust", requireAuth, requireRole("ADMIN"), dailyRewardController.adjustUserCoins);

module.exports = router;
