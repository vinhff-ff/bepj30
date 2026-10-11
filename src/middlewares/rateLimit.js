const { AppError } = require("../utils/AppError");

// Rate limit in-memory theo userId (fallback theo IP).
// Đủ dùng cho 1 tiến trình Node; khi chạy nhiều instance PM2/nginx thì mỗi
// instance một bộ đếm riêng, chấp nhận được vì endpoint này chỉ chặn spam
// chứ không phải chống DDoS. Muốn chặn chặt hơn thì thêm Redis.

const buckets = new Map();

// Dọn bucket cũ định kỳ để map không phình vô hạn
const CLEANUP_INTERVAL_MS = 60_000;
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now - bucket.resetAt > CLEANUP_INTERVAL_MS) {
      buckets.delete(key);
    }
  }
}, CLEANUP_INTERVAL_MS);

if (typeof cleanupTimer.unref === "function") {
  cleanupTimer.unref();
}

function defaultKey(req) {
  return req.user ? `u:${req.user.id}` : `ip:${req.ip}`;
}

/**
 * @param {object} options
 * @param {number} options.windowMs cửa sổ thời gian tính cả chuỗi
 * @param {number} options.max số lần tối đa trong cửa sổ
 * @param {string} options.message thông báo khi vượt
 * @param {(req) => string} [options.key] tự chọn khoá đếm
 */
function createRateLimit({ windowMs, max, message, key }) {
  const getKey = key || defaultKey;

  return function rateLimit(req, res, next) {
    const bucketKey = getKey(req);
    const now = Date.now();
    const bucket = buckets.get(bucketKey);

    if (!bucket || now >= bucket.resetAt) {
      buckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
      res.setHeader("X-RateLimit-Limit", String(max));
      res.setHeader("X-RateLimit-Remaining", String(max - 1));
      return next();
    }

    bucket.count += 1;

    if (bucket.count > max) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfter));
      return next(new AppError(message, 429, "RATE_LIMITED", { retryAfter }));
    }

    res.setHeader("X-RateLimit-Limit", String(max));
    res.setHeader("X-RateLimit-Remaining", String(Math.max(0, max - bucket.count)));
    return next();
  };
}

module.exports = { createRateLimit };
