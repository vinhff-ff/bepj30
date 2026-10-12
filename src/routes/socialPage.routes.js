const router = require("express").Router();
const socialPageController = require("../controllers/socialPage.controller");
const { requireAuth, requireRole } = require("../middlewares/auth");

// Trang /fanpage đọc công khai để hiển thị link mạng xã hội.
router.get("/", socialPageController.getSocialPage);

// Chỉ admin được xem toàn bộ bản nháp và lưu cấu hình.
router.get("/admin", requireAuth, requireRole("ADMIN"), socialPageController.getAdminSocialPage);
router.put("/admin", requireAuth, requireRole("ADMIN"), socialPageController.updateSocialPage);

module.exports = router;
