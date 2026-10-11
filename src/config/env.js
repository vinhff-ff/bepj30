const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

function toInt(value, fallback) {
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function toList(value) {
  return (value || "http://localhost:3000")
    .split(",")
    .map(function normalizeOrigin(item) {
      return item.trim();
    })
    .filter(Boolean);
}

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  isProduction: process.env.NODE_ENV === "production",
  port: toInt(process.env.PORT, 8080),
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "3h",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || (process.env.JWT_SECRET ? process.env.JWT_SECRET + "_refresh" : "dev_refresh_secret"),
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  bcryptSaltRounds: toInt(process.env.BCRYPT_SALT_ROUNDS, 10),
  corsOrigins: toList(process.env.CORS_ORIGIN),
  // Khóa riêng cho labToken, tách khỏi JWT đăng nhập để vòng xoay token
  // không làm hỏng phiên đang chơi thí nghiệm.
  labSecret: process.env.LAB_SECRET || process.env.JWT_SECRET,
  labTokenExpiresIn: process.env.LAB_TOKEN_EXPIRES_IN || "2h",
  // catalog.json nằm ở thư mục public của frontend (repo chung),
  // mặc định trỏ sang ../frontend/public/items/catalog.json.
  // Luôn resolve về đường dẫn tuyệt đối để không phụ thuộc thư mục chạy
  // (pm2/nginx có thể chạy từ nơi khác).
  labCatalogPath: path.resolve(
    __dirname,
    "../..",
    process.env.LAB_CATALOG_PATH || "../frontend/public/items/catalog.json",
  ),
};

// Dừng server ngay nếu thiếu biến môi trường bắt buộc
function validateEnv() {
  const required = [
    { key: "DATABASE_URL", value: env.databaseUrl },
    { key: "JWT_SECRET", value: env.jwtSecret },
  ];

  const missing = required
    .filter(function checkItem(item) {
      return !item.value;
    })
    .map(function toKey(item) {
      return item.key;
    });

  if (missing.length > 0) {
    throw new Error("Thiếu biến môi trường: " + missing.join(", ") + ". Hãy copy .env.example sang .env");
  }

  if (env.isProduction && env.jwtSecret.length < 32) {
    throw new Error("JWT_SECRET phải dài tối thiểu 32 ký tự khi chạy production");
  }
}

module.exports = { env, validateEnv };
