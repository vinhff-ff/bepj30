const { prisma } = require("../config/db");
const { AppError } = require("../utils/AppError");
const { hashPassword, comparePassword } = require("../utils/password");
const { signToken, signRefreshToken, verifyRefreshToken } = require("../utils/token");
const { validateUsername, validatePassword } = require("../utils/validators");
const { USER_PUBLIC_SELECT } = require("../utils/select");

function buildTokenPayload(user) {
  return { sub: user.id, role: user.role };
}

async function register({ username, password, avatarUrl, gender }) {
  validateUsername(username);
  validatePassword(password);

  const existing = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (existing) {
    throw AppError.conflict("Tài khoản đã tồn tại", { field: "username" });
  }

  const user = await prisma.user.create({
    data: {
      username,
      password: await hashPassword(password),
      avatarUrl: avatarUrl || null,
      gender: gender ? String(gender).toUpperCase() : null,
      role: "MEMBER",
    },
    select: USER_PUBLIC_SELECT,
  });

  const payload = buildTokenPayload(user);
  return {
    user,
    token: signToken(payload), // 3h
    refreshToken: signRefreshToken(payload), // 7d
  };
}

const { recordUserLoginAndStreak } = require("./streak.service");

async function login({ username, password }) {
  const record = await prisma.user.findUnique({ where: { username } });

  // Cùng một thông báo cho cả "không có user" lẫn "sai mật khẩu" để không lộ user nào tồn tại
  const invalidCredentials = AppError.unauthorized(
    "Tài khoản hoặc mật khẩu không đúng",
    "INVALID_CREDENTIALS"
  );

  if (!record) {
    throw invalidCredentials;
  }

  const passwordMatches = await comparePassword(password, record.password);
  if (!passwordMatches) {
    throw invalidCredentials;
  }

  // Duy trì chuỗi đăng nhập cho user và cho nhóm
  const streakInfo = await recordUserLoginAndStreak(record.id);

  const { password: hashedPassword, ...user } = record;
  if (streakInfo) {
    user.streak = streakInfo.streak;
    user.lastLoginDate = streakInfo.lastLoginDate;
  }
  const payload = buildTokenPayload(user);

  return {
    user,
    token: signToken(payload), // 3h
    refreshToken: signRefreshToken(payload), // 7d
  };
}

async function getMe(userId) {
  // Duy trì chuỗi đăng nhập cho user và cho nhóm
  await recordUserLoginAndStreak(userId);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      ...USER_PUBLIC_SELECT,
      _count: { select: { journalImages: true } },
      groupMemberships: {
        select: {
          role: true,
          group: {
            select: { id: true, name: true, ownerId: true },
          },
        },
      },
    },
  });

  if (!user) {
    throw AppError.notFound("Không tìm thấy người dùng");
  }

  const membership = user.groupMemberships?.[0] || null;
  const group = membership
    ? {
        id: membership.group.id,
        name: membership.group.name,
        role: membership.role,
        isOwner: membership.role === "OWNER",
      }
    : null;

  const { groupMemberships, ...userData } = user;
  return { ...userData, group };
}

async function refreshToken(tokenString) {
  if (!tokenString) {
    throw AppError.unauthorized("Thiếu refresh token", "INVALID_REFRESH_TOKEN");
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(tokenString);
  } catch (err) {
    throw AppError.unauthorized("Refresh token đã hết hạn hoặc không hợp lệ", "EXPIRED_REFRESH_TOKEN");
  }

  const userId = decoded.sub || decoded.id || decoded.userId;
  if (!userId) {
    throw AppError.unauthorized("Refresh token không hợp lệ", "INVALID_REFRESH_TOKEN");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: USER_PUBLIC_SELECT,
  });

  if (!user) {
    throw AppError.unauthorized("Người dùng không tồn tại", "USER_NOT_FOUND");
  }

  const payload = buildTokenPayload(user);
  return {
    user,
    token: signToken(payload), // 3h
    refreshToken: signRefreshToken(payload), // 7d
  };
}

module.exports = { register, login, getMe, refreshToken };
