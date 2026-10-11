const { prisma } = require("../config/db");
const { AppError } = require("../utils/AppError");
const {
  validateLessonName,
  validateOptionalImageUrl,
  validateLessonHtml,
  validateOrder,
} = require("../utils/validators");
const { LESSON_SELECT, LESSON_DETAIL_SELECT } = require("../utils/select");
const { getRoomById } = require("./room.service");
const { attachLessonTimeTag } = require("../utils/lesson");

const LESSON_ORDER_BY = [{ order: "asc" }, { createdAt: "asc" }];

async function listLessons(roomId) {
  await getRoomById(roomId);

  const lessons = await prisma.lesson.findMany({
    where: { roomId },
    select: LESSON_SELECT,
    orderBy: LESSON_ORDER_BY,
  });

  return lessons.map(attachLessonTimeTag);
}

// Chi tiết bài học, trả kèm mã html thuần để khung chạy
async function getLessonById(id) {
  const lesson = await prisma.lesson.findUnique({
    where: { id },
    select: LESSON_DETAIL_SELECT,
  });

  if (!lesson) {
    throw AppError.notFound("Không tìm thấy bài học");
  }

  return attachLessonTimeTag(lesson);
}

async function createLesson(roomId, { name, imageUrl, html, order }) {
  await getRoomById(roomId);

  const data = {
    roomId,
    name: validateLessonName(name),
    html: validateLessonHtml(html),
  };

  const image = validateOptionalImageUrl(imageUrl);
  if (image) {
    data.imageUrl = image;
  }

  const sortOrder = validateOrder(order);
  if (sortOrder !== undefined) {
    data.order = sortOrder;
  }

  const created = await prisma.lesson.create({
    data,
    select: LESSON_SELECT,
  });

  return attachLessonTimeTag(created);
}

async function updateLesson(id, payload) {
  await getLessonById(id);

  const data = {};

  if (payload.name !== undefined) {
    data.name = validateLessonName(payload.name);
  }
  if (payload.imageUrl !== undefined) {
    const image = validateOptionalImageUrl(payload.imageUrl);
    data.imageUrl = image;
  }
  if (payload.html !== undefined) {
    data.html = validateLessonHtml(payload.html);
  }
  if (payload.order !== undefined) {
    const sortOrder = validateOrder(payload.order);
    data.order = sortOrder === undefined ? 0 : sortOrder;
  }

  if (Object.keys(data).length === 0) {
    throw AppError.badRequest("Không có trường nào để cập nhật");
  }

  const updated = await prisma.lesson.update({
    where: { id },
    data,
    select: LESSON_DETAIL_SELECT,
  });

  return attachLessonTimeTag(updated);
}

async function deleteLesson(id) {
  await getLessonById(id);
  await prisma.lesson.delete({ where: { id } });
  return { id };
}

module.exports = {
  listLessons,
  getLessonById,
  createLesson,
  updateLesson,
  deleteLesson,
};
