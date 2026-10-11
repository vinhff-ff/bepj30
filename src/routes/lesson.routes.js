const router = require("express").Router();
const lessonController = require("../controllers/lesson.controller");
const { requireAuth, requireRole } = require("../middlewares/auth");

// Bài học là nội dung công khai, ai cũng mở được.
// Danh sách tất cả bài đã xuất bản (kèm slot đồ bắt buộc) cho trang /lessons.
// Đặt trước /:id để đọc dễ.
router.get("/", lessonController.listLabLessons);

router.get("/:id", lessonController.getLesson);

router.put("/:id", requireAuth, requireRole("ADMIN"), lessonController.updateLesson);
router.delete("/:id", requireAuth, requireRole("ADMIN"), lessonController.deleteLesson);

module.exports = router;
