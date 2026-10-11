const router = require("express").Router();
const roomController = require("../controllers/room.controller");
const lessonController = require("../controllers/lesson.controller");
const { requireAuth, requireRole } = require("../middlewares/auth");

// Đọc phòng và bài học thì ai cũng xem được, kể cả khách chưa đăng nhập
router.get("/", roomController.listRooms);
router.get("/:roomId/lessons", lessonController.listLessons);
router.get("/:id", roomController.getRoom);

// Thêm/sửa/xoá chỉ dành cho admin
router.post("/", requireAuth, requireRole("ADMIN"), roomController.createRoom);
router.put("/:id", requireAuth, requireRole("ADMIN"), roomController.updateRoom);
router.delete("/:id", requireAuth, requireRole("ADMIN"), roomController.deleteRoom);
router.post("/:roomId/lessons", requireAuth, requireRole("ADMIN"), lessonController.createLesson);

module.exports = router;
