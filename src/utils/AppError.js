const STATUS = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  INTERNAL_SERVER_ERROR: 500,
};

// Lỗi nghiệp vụ có chủ đích - errorHandler sẽ trả nguyên status/code ra ngoài
class AppError extends Error {
  constructor(message, statusCode = STATUS.INTERNAL_SERVER_ERROR, code = "INTERNAL_ERROR", details = undefined) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, details) {
    return new AppError(message, STATUS.BAD_REQUEST, "BAD_REQUEST", details);
  }

  static unauthorized(message = "Chưa xác thực", code = "UNAUTHORIZED") {
    return new AppError(message, STATUS.UNAUTHORIZED, code);
  }

  static forbidden(message = "Không đủ quyền", details) {
    return new AppError(message, STATUS.FORBIDDEN, "FORBIDDEN", details);
  }

  static notFound(message = "Không tìm thấy dữ liệu") {
    return new AppError(message, STATUS.NOT_FOUND, "NOT_FOUND");
  }

  static conflict(message, details) {
    return new AppError(message, STATUS.CONFLICT, "CONFLICT", details);
  }
}

module.exports = { AppError, STATUS };
