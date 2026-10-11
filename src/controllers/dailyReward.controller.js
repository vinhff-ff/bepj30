const dailyRewardService = require("../services/dailyReward.service");
const { sendSuccess } = require("../utils/response");

async function getStatus(req, res) {
  const status = await dailyRewardService.getStatus(req.user.id);
  return sendSuccess(res, status, "Trạng thái điểm danh nhận xu");
}

async function claimDailyReward(req, res) {
  const result = await dailyRewardService.claimDailyReward(req.user.id);
  return sendSuccess(res, result, result.message);
}

async function getConfig(req, res) {
  const config = await dailyRewardService.getConfig();
  return sendSuccess(res, config, "Cấu hình điểm danh nhận xu");
}

async function updateConfig(req, res) {
  const config = await dailyRewardService.updateConfig(req.body, req.user.id);
  return sendSuccess(res, config, "Cập nhật cấu hình nhận xu thành công");
}

async function listUsersWithCoins(req, res) {
  const { search, page, limit } = req.query;
  const result = await dailyRewardService.listUsersWithCoins({ search, page, limit });
  return sendSuccess(res, result, "Danh sách xu người dùng");
}

async function adjustUserCoins(req, res) {
  const { userId, amount } = req.body;
  const result = await dailyRewardService.adjustUserCoins({ userId, amount });
  return sendSuccess(res, result, "Điều chỉnh xu thành công");
}

module.exports = {
  getStatus,
  claimDailyReward,
  getConfig,
  updateConfig,
  listUsersWithCoins,
  adjustUserCoins,
};
