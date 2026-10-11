const { AppError } = require("../utils/AppError");

// Bắt mọi request lọt xuống không khớp route nào
function notFoundHandler(req, res, next) {
  return next(
    new AppError(`Không tìm thấy endpoint ${req.method} ${req.originalUrl}`, 404, "ROUTE_NOT_FOUND")
  );
}

module.exports = { notFoundHandler };
