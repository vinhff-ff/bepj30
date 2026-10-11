const router = require("express").Router();

const levelController = require("../controllers/level.controller");
const { requireAuth } = require("../middlewares/auth");
const { createRateLimit } = require("../middlewares/rateLimit");

// Chống gọi liên tục để moi thêm đồ. Một người chơi bình thường hoàn thành
// màn theo tốc độ bình thường nên 20 lần/phút là rất rộng.
const completeRateLimit = createRateLimit({
  windowMs: 60_000,
  max: 20,
  message: "Bạn xác nhận hoàn thành quá nhanh, vui lòng chậm lại",
});

// Hoàn thành màn thì phải đăng nhập
router.post("/:id/complete", requireAuth, completeRateLimit, levelController.completeLevel);

module.exports = router;
