const levelCompletionService = require("../services/levelCompletion.service");
const { sendSuccess } = require("../utils/response");

// POST /api/levels/:id/complete -> cấp đồ mở khoá theo màn, trả { rewards }
async function completeLevel(req, res) {
  const result = await levelCompletionService.completeLevel(req.user.id, req.params.id);
  return sendSuccess(res, result, "Đã hoàn thành màn");
}

module.exports = { completeLevel };
