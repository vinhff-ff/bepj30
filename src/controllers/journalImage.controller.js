const journalImageService = require("../services/journalImage.service");
const { sendSuccess, sendCreated, sendPaginated } = require("../utils/response");
const { getPagination } = require("../utils/pagination");

async function listImages(req, res) {
  const { page, pageSize } = getPagination(req.query);
  const { data, total } = await journalImageService.listImages({ ...req.query, page, pageSize });

  return sendPaginated(res, data, { page, pageSize, total }, "Danh sách ảnh nhật kí");
}

async function getImage(req, res) {
  const image = await journalImageService.getImageById(req.params.id);
  return sendSuccess(res, image, "Thông tin ảnh");
}

async function createImage(req, res) {
  // Không cho tự chỉ định chủ sở hữu, chỉ dùng user trong token
  const image = await journalImageService.createImage({
    imageUrl: req.body.imageUrl,
    capturedAt: req.body.capturedAt,
    userId: req.user.id,
  });

  return sendCreated(res, image, "Thêm ảnh thành công");
}

async function updateImage(req, res) {
  const image = await journalImageService.updateImage(req.params.id, req.body);
  return sendSuccess(res, image, "Cập nhật ảnh thành công");
}

async function deleteImage(req, res) {
  const result = await journalImageService.deleteImage(req.params.id);
  return sendSuccess(res, result, "Đã xoá ảnh");
}

module.exports = { listImages, getImage, createImage, updateImage, deleteImage };
