const authService = require("../services/auth.service");
const { sendCreated, sendSuccess } = require("../utils/response");

// Không try/catch: express-async-errors đã chuyển lỗi promise sang errorHandler
async function register(req, res) {
  const { username, password, avatarUrl, gender } = req.body;
  const result = await authService.register({ username, password, avatarUrl, gender });
  return sendCreated(res, result, "Đăng ký thành công");
}

async function login(req, res) {
  const { username, password } = req.body;
  const result = await authService.login({ username, password });
  return sendSuccess(res, result, "Đăng nhập thành công");
}

async function me(req, res) {
  const user = await authService.getMe(req.user.id);
  return sendSuccess(res, user, "Thông tin tài khoản");
}

async function refresh(req, res) {
  const { refreshToken } = req.body;
  const result = await authService.refreshToken(refreshToken);
  return sendSuccess(res, result, "Làm mới phiên đăng nhập thành công");
}

module.exports = { register, login, me, refresh };
