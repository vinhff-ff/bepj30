const roomService = require("../services/room.service");
const { sendSuccess, sendCreated } = require("../utils/response");

async function listRooms(req, res) {
  const rooms = await roomService.listRooms();
  return sendSuccess(res, rooms, "Danh sách phòng");
}

async function getRoom(req, res) {
  const room = await roomService.getRoomById(req.params.id);
  return sendSuccess(res, room, "Thông tin phòng");
}

async function createRoom(req, res) {
  const room = await roomService.createRoom({
    name: req.body.name,
    imageUrl: req.body.imageUrl,
    order: req.body.order,
  });

  return sendCreated(res, room, "Thêm phòng thành công");
}

async function updateRoom(req, res) {
  const room = await roomService.updateRoom(req.params.id, req.body);
  return sendSuccess(res, room, "Cập nhật phòng thành công");
}

async function deleteRoom(req, res) {
  const result = await roomService.deleteRoom(req.params.id);
  return sendSuccess(res, result, "Đã xoá phòng");
}

module.exports = { listRooms, getRoom, createRoom, updateRoom, deleteRoom };
