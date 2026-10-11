const { z } = require("zod");
const router = require("express").Router();

const labController = require("../controllers/lab.controller");
const { requireAuth } = require("../middlewares/auth");
const { createRateLimit } = require("../middlewares/rateLimit");
const { parseOrThrow } = require("../utils/validate");

// result do bài học gửi lên, server tự kiểm tra kích thước thật nên ở đây
// chỉ chặn sơ bộ để body không phình vô lý.
// labToken chỉ kiểm tra là chuỗi: token sai định dạng vẫn phải ra 401 từ
// tầng verify chứ không phải 400, để client xử lý 1 kiểu lỗi cho token.
const resultSchema = z.object({
  labToken: z.string().min(1),
  result: z.unknown(),
});

// Chống spam: nộp kết quả càng nhiều thì càng bị chặn, không ảnh hưởng năng
// lực chơi bình thường (mỗi màn chơi chỉ nộp vài lần)
const resultRateLimit = createRateLimit({
  windowMs: 60_000,
  max: 30,
  message: "Bạn nộp kết quả quá nhanh, vui lòng chậm lại",
});

// Vào phòng và nộp kết quả thì phải đăng nhập.
// (Danh sách bài học nằm ở GET /api/lessons, khai báo trong lesson.routes.js
// vì đó là endpoint của resource "lessons".)
router.post("/enter/:slug", requireAuth, labController.enterLab);

router.post(
  "/result",
  requireAuth,
  resultRateLimit,
  function validateResult(req, res, next) {
    req.body = parseOrThrow(resultSchema, req.body);
    return next();
  },
  labController.saveResult,
);

module.exports = router;
