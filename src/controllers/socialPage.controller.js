const socialPageService = require("../services/socialPage.service");
const { sendSuccess } = require("../utils/response");

async function getSocialPage(req, res) {
  const data = await socialPageService.getPublicSocialPage();
  return sendSuccess(res, data, "Trang Fanpage");
}

async function getAdminSocialPage(req, res) {
  const data = await socialPageService.getAdminSocialPage();
  return sendSuccess(res, data, "Cấu hình Fanpage");
}

async function updateSocialPage(req, res) {
  const data = await socialPageService.updateSocialPage(req.body);
  return sendSuccess(res, data, "Đã lưu cấu hình Fanpage");
}

module.exports = { getSocialPage, getAdminSocialPage, updateSocialPage };
