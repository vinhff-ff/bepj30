const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000; // 7 ngày tính theo milliseconds

/**
 * Gắn thêm thông tin thời gian và tag "Mới" cho bài học.
 * Kiểm tra xem bài học đã tạo quá 1 tuần chưa:
 * - Nếu chưa quá 1 tuần (<= 7 ngày): isNew = true, tag = "Mới", tags = ["Mới"]
 * - Nếu đã quá 1 tuần (> 7 ngày): isNew = false, tag = null, tags = []
 *
 * @param {Object} lesson Đối tượng bài học
 * @returns {Object} Đối tượng bài học kèm trường isNew, tag, tags
 */
function attachLessonTimeTag(lesson) {
  if (!lesson) return lesson;

  const createdAtDate = lesson.createdAt ? new Date(lesson.createdAt) : null;
  const now = Date.now();
  const diffMs =
    createdAtDate && !isNaN(createdAtDate.getTime())
      ? now - createdAtDate.getTime()
      : null;

  // Chưa quá 1 tuần (khoảng cách thời gian <= 7 ngày)
  const isNew = diffMs !== null ? diffMs <= ONE_WEEK_MS : false;

  return {
    ...lesson,
    isNew,
    tag: isNew ? "Mới" : null,
    tags: isNew ? ["Mới"] : [],
  };
}

module.exports = {
  ONE_WEEK_MS,
  attachLessonTimeTag,
};
