const { AppError } = require("../utils/AppError");
const { verifyToken } = require("../utils/token");

function extractBearerToken(req) {
  const header = req.headers.authorization;
  if (!header) {
    return null;
  }

  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
}

// Bắt buộc có token hợp lệ, gán req.user cho các middleware sau dùng
function requireAuth(req, res, next) {
  const token = extractBearerToken(req);
  if (!token) {
    return next(AppError.unauthorized("Thiếu token xác thực", "MISSING_TOKEN"));
  }

  try {
    const payload = verifyToken(token);
    const userId = payload.sub || payload.id || payload.userId;
    if (!userId) {
      return next(AppError.unauthorized("Token không hợp lệ", "INVALID_TOKEN"));
    }
    req.user = { id: userId, role: payload.role };
    return next();
  } catch (err) {
    // Đẩy xuống errorHandler để lỗi token hết hạn/sai đều ra code đúng
    return next(err);
  }
}

// Tên gọi đúng như hợp đồng của hệ thống tủ đồ/lab: bọc cơ chế auth sẵn có,
// sau đó req.user luôn có { id, role }. Giữ requireAuth làm bí danh để không
// phải sửa các route cũ.
const requireUser = requireAuth;

// Chặn theo role, dùng sau requireAuth
function requireRole(...allowedRoles) {
  return function roleGuard(req, res, next) {
    if (!req.user) {
      return next(AppError.unauthorized("Chưa xác thực", "UNAUTHORIZED"));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(AppError.forbidden("Không đủ quyền thực hiện thao tác này"));
    }
    return next();
  };
}

// Không bắt buộc có token, nhưng nếu có thì giải mã và gán req.user
function optionalAuth(req, res, next) {
  const token = extractBearerToken(req);
  if (!token) {
    return next();
  }

  try {
    const payload = verifyToken(token);
    const userId = payload.sub || payload.id || payload.userId;
    if (userId) {
      req.user = { id: userId, role: payload.role };
    }
  } catch {
    // Bỏ qua lỗi token hết hạn/sai khi gọi endpoint public
  }

  return next();
}

module.exports = { requireAuth, requireUser, requireRole, optionalAuth };


