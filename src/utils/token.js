const jwt = require("jsonwebtoken");
const { env } = require("../config/env");

// sub = userId, role để middleware phân quyền không cần query lại DB
// Access token sống 3 tiếng
function signToken(payload) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret);
}

// Refresh token sống 7 ngày
function signRefreshToken(payload) {
  return jwt.sign(payload, env.jwtRefreshSecret, { expiresIn: env.jwtRefreshExpiresIn });
}

function verifyRefreshToken(token) {
  return jwt.verify(token, env.jwtRefreshSecret);
}

module.exports = { signToken, verifyToken, signRefreshToken, verifyRefreshToken };
