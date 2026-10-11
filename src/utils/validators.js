const { AppError } = require("./AppError");

const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,50}$/;
const MIN_PASSWORD_LENGTH = 6;

function validateUsername(username) {
  if (!USERNAME_PATTERN.test(username || "")) {
    throw AppError.badRequest("Tài khoản phải gồm chữ, số hoặc dấu gạch dưới, dài 3-50 ký tự", {
      field: "username",
    });
  }
  return username;
}

function validatePassword(password) {
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    throw AppError.badRequest(`Mật khẩu tối thiểu ${MIN_PASSWORD_LENGTH} ký tự`, { field: "password" });
  }
  return password;
}

function validateImageUrl(imageUrl) {
  if (!imageUrl || typeof imageUrl !== "string" || imageUrl.trim().length === 0) {
    throw AppError.badRequest("Thiếu đường dẫn ảnh", { field: "imageUrl" });
  }
  return imageUrl.trim();
}

// Ngày không hợp lệ sẽ tạo ra Invalid Date, cần chặn trước khi xuống tầng DB
function validateCapturedAt(capturedAt) {
  const date = new Date(capturedAt);
  if (Number.isNaN(date.getTime())) {
    throw AppError.badRequest("Thời gian không hợp lệ, dùng định dạng ISO 8601", { field: "capturedAt" });
  }
  return date;
}

// Tên nhóm: 2-100 ký tự, không chỉ toàn khoảng trắng
function validateGroupName(name) {
  if (typeof name !== "string" || name.trim().length < 2) {
    throw AppError.badRequest("Tên nhóm phải có ít nhất 2 ký tự", { field: "name" });
  }
  const trimmed = name.trim();
  if (trimmed.length > 100) {
    throw AppError.badRequest("Tên nhóm không được vượt quá 100 ký tự", { field: "name" });
  }
  return trimmed;
}

// Từ khoá tìm bạn: 1-50 ký tự, chỉ chữ/số/gạch dưới để tránh truy vấn rác
function validateSearchKeyword(keyword) {
  if (typeof keyword !== "string" || keyword.trim().length < 1) {
    throw AppError.badRequest("Vui lòng nhập từ khoá tìm kiếm", { field: "keyword" });
  }
  const trimmed = keyword.trim();
  if (trimmed.length > 50) {
    throw AppError.badRequest("Từ khoá tìm kiếm không được vượt quá 50 ký tự", { field: "keyword" });
  }
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
    throw AppError.badRequest("Từ khoá chỉ được gồm chữ, số hoặc dấu gạch dưới", { field: "keyword" });
  }
  return trimmed;
}

// Tên phòng: 2-100 ký tự, không chỉ toàn khoảng trắng
function validateRoomName(name) {
  if (typeof name !== "string" || name.trim().length < 2) {
    throw AppError.badRequest("Tên phòng phải có ít nhất 2 ký tự", { field: "name" });
  }
  const trimmed = name.trim();
  if (trimmed.length > 100) {
    throw AppError.badRequest("Tên phòng không được vượt quá 100 ký tự", { field: "name" });
  }
  return trimmed;
}

// Tên bài học: 2-150 ký tự
function validateLessonName(name) {
  if (typeof name !== "string" || name.trim().length < 2) {
    throw AppError.badRequest("Tên bài học phải có ít nhất 2 ký tự", { field: "name" });
  }
  const trimmed = name.trim();
  if (trimmed.length > 150) {
    throw AppError.badRequest("Tên bài học không được vượt quá 150 ký tự", { field: "name" });
  }
  return trimmed;
}

// Ảnh không bắt buộc: để trống hoặc gửi null nghĩa là dùng ảnh mặc định
function validateOptionalImageUrl(imageUrl) {
  if (imageUrl === undefined || imageUrl === null) {
    return null;
  }
  if (typeof imageUrl !== "string" || imageUrl.trim().length === 0) {
    return null;
  }
  return validateImageUrl(imageUrl);
}

// HTML bài học do admin dán vào, cho phép để trống rồi bổ sung sau
const MAX_LESSON_HTML_LENGTH = 200_000;

function validateLessonHtml(html) {
  if (html === undefined || html === null) {
    return "";
  }
  if (typeof html !== "string") {
    throw AppError.badRequest("Nội dung HTML phải là chuỗi", { field: "html" });
  }
  if (html.length > MAX_LESSON_HTML_LENGTH) {
    throw AppError.badRequest(
      `Nội dung HTML không được vượt quá ${MAX_LESSON_HTML_LENGTH} ký tự`,
      { field: "html" },
    );
  }
  return html;
}

// Thứ tự hiển thị: số nguyên từ 0 trở lên
function validateOrder(order) {
  if (order === undefined || order === null) {
    return undefined;
  }
  const value = Number(order);
  if (!Number.isInteger(value) || value < 0) {
    throw AppError.badRequest("Thứ tự hiển thị phải là số nguyên từ 0 trở lên", { field: "order" });
  }
  return value;
}

function slugify(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function validateArticleTitle(title) {
  if (typeof title !== "string" || title.trim().length < 3) {
    throw AppError.badRequest("Tiêu đề bài viết phải có ít nhất 3 ký tự", { field: "title" });
  }
  const trimmed = title.trim();
  if (trimmed.length > 255) {
    throw AppError.badRequest("Tiêu đề bài viết không được vượt quá 255 ký tự", { field: "title" });
  }
  return trimmed;
}

function validateArticleSlug(slug, fallbackTitle) {
  const candidate = slug && typeof slug === "string" && slug.trim() ? slug.trim() : slugify(fallbackTitle);
  if (!candidate || candidate.length < 3) {
    throw AppError.badRequest("Slug bài viết phải có ít nhất 3 ký tự", { field: "slug" });
  }
  const clean = candidate.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/^-+|-+$/g, "");
  if (clean.length > 150) {
    return clean.slice(0, 150);
  }
  return clean;
}

function validateArticleExcerpt(excerpt) {
  if (typeof excerpt !== "string" || excerpt.trim().length < 5) {
    throw AppError.badRequest("Tóm tắt bài viết phải có ít nhất 5 ký tự", { field: "excerpt" });
  }
  return excerpt.trim();
}

function validateArticleContent(content) {
  if (typeof content !== "string" || content.trim().length < 10) {
    throw AppError.badRequest("Nội dung bài viết phải có ít nhất 10 ký tự", { field: "content" });
  }
  return content.trim();
}

function validateArticleCategory(category) {
  if (!category || typeof category !== "string") {
    return "TIN TỨC";
  }
  const clean = category.trim().toUpperCase();
  const validCategories = ["TIN TỨC", "KHÁM PHÁ", "CỘNG ĐỒNG", "SỰ KIỆN"];
  if (validCategories.includes(clean)) {
    return clean;
  }
  return "TIN TỨC";
}

function validateArticleTags(tags) {
  if (!tags) return [];
  if (Array.isArray(tags)) {
    return tags
      .map((t) => String(t).trim().replace(/^#/, ""))
      .filter((t) => t.length > 0 && t.length <= 50)
      .slice(0, 10);
  }
  if (typeof tags === "string") {
    return tags
      .split(/[,;\n]+/)
      .map((t) => t.trim().replace(/^#/, ""))
      .filter((t) => t.length > 0 && t.length <= 50)
      .slice(0, 10);
  }
  return [];
}

module.exports = {
  validateUsername,
  validatePassword,
  validateImageUrl,
  validateCapturedAt,
  validateGroupName,
  validateSearchKeyword,
  validateRoomName,
  validateLessonName,
  validateOptionalImageUrl,
  validateLessonHtml,
  validateOrder,
  MAX_LESSON_HTML_LENGTH,
  slugify,
  validateArticleTitle,
  validateArticleSlug,
  validateArticleExcerpt,
  validateArticleContent,
  validateArticleCategory,
  validateArticleTags,
};

