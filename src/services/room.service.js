const { prisma } = require("../config/db");
const { AppError } = require("../utils/AppError");
const { validateRoomName, validateOptionalImageUrl, validateOrder } = require("../utils/validators");
const { ROOM_SELECT } = require("../utils/select");

const ROOM_ORDER_BY = [{ order: "asc" }, { createdAt: "asc" }];

async function listRooms() {
  return prisma.room.findMany({
    select: ROOM_SELECT,
    orderBy: ROOM_ORDER_BY,
  });
}

async function getRoomById(id) {
  const room = await prisma.room.findUnique({
    where: { id },
    select: ROOM_SELECT,
  });

  if (!room) {
    throw AppError.notFound("Không tìm thấy phòng");
  }

  return room;
}

async function createRoom({ name, imageUrl, order }) {
  const data = { name: validateRoomName(name) };

  const image = validateOptionalImageUrl(imageUrl);
  if (image) {
    data.imageUrl = image;
  }

  const sortOrder = validateOrder(order);
  if (sortOrder !== undefined) {
    data.order = sortOrder;
  }

  return prisma.room.create({
    data,
    select: ROOM_SELECT,
  });
}

async function updateRoom(id, payload) {
  await getRoomById(id);

  const data = {};

  if (payload.name !== undefined) {
    data.name = validateRoomName(payload.name);
  }
  if (payload.imageUrl !== undefined) {
    // Gửi chuỗi rỗng để gỡ ảnh, không gửi imageUrl thì giữ nguyên ảnh cũ
    const image = validateOptionalImageUrl(payload.imageUrl);
    data.imageUrl = image;
  }
  if (payload.order !== undefined) {
    const sortOrder = validateOrder(payload.order);
    data.order = sortOrder === undefined ? 0 : sortOrder;
  }

  if (Object.keys(data).length === 0) {
    throw AppError.badRequest("Không có trường nào để cập nhật");
  }

  return prisma.room.update({
    where: { id },
    data,
    select: ROOM_SELECT,
  });
}

async function deleteRoom(id) {
  await getRoomById(id);
  // Bài học bị xoá theo do quan hệ onDelete: Cascade
  await prisma.room.delete({ where: { id } });
  return { id };
}

module.exports = {
  listRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
};
