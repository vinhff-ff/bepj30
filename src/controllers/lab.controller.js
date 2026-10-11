const labService = require("../services/lab.service");
const { sendSuccess } = require("../utils/response");

// POST /api/lab/enter/:slug -> kiểm tra đồ, trả lessonPath + equipped + labToken
async function enterLab(req, res) {
  const result = await labService.enterLab(req.user.id, req.params.slug);
  return sendSuccess(res, result, "Vào phòng thí nghiệm thành công");
}

// POST /api/lab/result { labToken, result } -> lưu LessonResult
async function saveResult(req, res) {
  const record = await labService.saveLabResult(req.user.id, req.body.labToken, req.body.result);
  return sendSuccess(res, record, "Đã lưu kết quả");
}

module.exports = { enterLab, saveResult };
