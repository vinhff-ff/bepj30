const userService = require("../services/user.service");
const { sendSuccess, sendCreated, sendPaginated } = require("../utils/response");
const { getPagination } = require("../utils/pagination");

async function listUsers(req, res) {
  const { page, pageSize } = getPagination(req.query);
  const { data, total } = await userService.listUsers({ ...req.query, page, pageSize });

  return sendPaginated(res, data, { page, pageSize, total }, "Danh sách người dùng");
}

async function getUser(req, res) {
  const user = await userService.getUserById(req.params.id, req.user);
  return sendSuccess(res, user, "Thông tin người dùng");
}

async function createUser(req, res) {
  const user = await userService.createUser(req.body);
  return sendCreated(res, user, "Tạo người dùng thành công");
}

async function updateUser(req, res) {
  const user = await userService.updateUser(req.params.id, req.body, req.user);
  return sendSuccess(res, user, "Cập nhật người dùng thành công");
}

async function deleteUser(req, res) {
  const result = await userService.deleteUser(req.params.id, req.user);
  return sendSuccess(res, result, "Đã xoá người dùng");
}

async function getGenderStats(req, res) {
  const stats = await userService.getGenderStats();
  return sendSuccess(res, stats, "Thống kê giới tính");
}

async function getAdminOverviewStats(req, res) {
  const stats = await userService.getAdminOverviewStats();
  return sendSuccess(res, stats, "Thống kê tổng quan quản trị");
}

module.exports = {
  listUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getGenderStats,
  getAdminOverviewStats,
};

