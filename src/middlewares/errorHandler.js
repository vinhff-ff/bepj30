const { Prisma } = require("@prisma/client");
const { AppError } = require("../utils/AppError");
const { sendError } = require("../utils/response");
const { env } = require("../config/env");

// Dịch mọi lỗi kỹ thuật về AppError để client chỉ thấy message/code sạch
function normalizeError(err) {
  if (err instanceof AppError) {
    return err;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case "P2002":
        return AppError.conflict("Dữ liệu đã tồn tại", { fields: err.meta && err.meta.target });
      case "P2025":
        return AppError.notFound("Không tìm thấy dữ liệu");
      case "P2003":
        return AppError.conflict("Không thể thao tác: còn dữ liệu liên quan");
      case "P2011":
        return AppError.badRequest("Dữ liệu không hợp lệ");
      default:
        return new AppError("Lỗi cơ sở dữ liệu", 500, "DATABASE_ERROR", { prismaCode: err.code });
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    return AppError.badRequest("Truy vấn không hợp lệ", { reason: "prisma_validation" });
  }

  if (err.name === "TokenExpiredError") {
    return AppError.unauthorized("Token đã hết hạn", "TOKEN_EXPIRED");
  }

  if (err.name === "JsonWebTokenError") {
    return AppError.unauthorized("Token không hợp lệ", "INVALID_TOKEN");
  }

  if (err.type === "entity.parse.failed") {
    return new AppError("Body JSON không hợp lệ", 400, "INVALID_JSON");
  }

  return new AppError((err && err.message) || "Lỗi hệ thống", 500, "INTERNAL_ERROR");
}

// Middleware bắt lỗi cuối cùng - express gọi theo thứ tự đăng ký, phải đặt sau tất cả route
function errorHandler(err, req, res, next) {
  const appError = normalizeError(err);

  // Lỗi 5xx mới log server, lỗi 4xx là lỗi client nên bỏ qua
  if (appError.statusCode >= 500) {
    console.error("[error]", req.method, req.originalUrl, "\n", err);
  }

  // Production không trả lộ chi tiết lỗi nội bộ
  const message = env.isProduction && appError.statusCode >= 500
    ? "Đã có lỗi xảy ra, vui lòng thử lại"
    : appError.message;

  return sendError(res, message, appError.code, appError.details, appError.statusCode);
}

module.exports = { errorHandler, normalizeError };
