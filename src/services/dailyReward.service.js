const { prisma } = require("../config/db");
const { AppError } = require("../utils/AppError");

const DEFAULT_DAY_REWARDS = [1, 2, 3, 4, 5, 6, 7];

/**
 * Lấy chuỗi ngày YYYY-MM-DD theo múi giờ Việt Nam (UTC+7)
 */
function getVietnamDateString(date = new Date()) {
  const vnTime = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return vnTime.toISOString().slice(0, 10);
}

/**
 * Lấy cấu hình hệ thống Điểm danh nhận xu
 */
async function getConfig() {
  let config = await prisma.dailyRewardConfig.findUnique({
    where: { id: "default" },
  });

  if (!config) {
    config = await prisma.dailyRewardConfig.create({
      data: {
        id: "default",
        enabled: true,
        dayRewards: DEFAULT_DAY_REWARDS,
      },
    });
  }

  return {
    enabled: config.enabled,
    dayRewards: Array.isArray(config.dayRewards) ? config.dayRewards : DEFAULT_DAY_REWARDS,
    updatedAt: config.updatedAt,
  };
}

/**
 * Admin cập nhật On/Off và số xu của 7 ngày
 */
async function updateConfig({ enabled, dayRewards }, adminId = null) {
  if (dayRewards !== undefined) {
    if (!Array.isArray(dayRewards) || dayRewards.length !== 7) {
      throw AppError.badRequest("Cấu hình xu phải gồm đúng 7 ngày (mảng 7 số)", { field: "dayRewards" });
    }

    const cleanRewards = dayRewards.map((val, idx) => {
      const num = Number(val);
      if (!Number.isInteger(num) || num < 0) {
        throw AppError.badRequest(`Số xu của Ngày ${idx + 1} phải là số nguyên không âm`, {
          day: idx + 1,
        });
      }
      return num;
    });

    dayRewards = cleanRewards;
  }

  const data = {};
  if (enabled !== undefined) {
    data.enabled = Boolean(enabled);
  }
  if (dayRewards !== undefined) {
    data.dayRewards = dayRewards;
  }
  if (adminId) {
    data.updatedById = adminId;
  }

  const updated = await prisma.dailyRewardConfig.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      enabled: enabled !== undefined ? Boolean(enabled) : true,
      dayRewards: dayRewards || DEFAULT_DAY_REWARDS,
      updatedById: adminId,
    },
    update: data,
  });

  return {
    enabled: updated.enabled,
    dayRewards: updated.dayRewards,
    updatedAt: updated.updatedAt,
  };
}

/**
 * Lấy trạng thái nhận xu hàng ngày của người dùng
 */
async function getStatus(userId) {
  const config = await getConfig();

  const now = new Date();
  const todayStr = getVietnamDateString(now);
  const yesterdayStr = getVietnamDateString(new Date(now.getTime() - 24 * 60 * 60 * 1000));

  const [user, todayCheckIn, latestCheckIn] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, coins: true },
    }),
    prisma.dailyCheckIn.findUnique({
      where: {
        userId_date: {
          userId,
          date: todayStr,
        },
      },
    }),
    prisma.dailyCheckIn.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!user) {
    throw AppError.notFound("Không tìm thấy người dùng");
  }

  let currentDayIndex = 1;
  const hasClaimedToday = Boolean(todayCheckIn);

  if (hasClaimedToday && todayCheckIn) {
    currentDayIndex = todayCheckIn.dayIndex;
  } else if (latestCheckIn) {
    if (latestCheckIn.date === yesterdayStr) {
      currentDayIndex = (latestCheckIn.dayIndex % 7) + 1;
    } else {
      currentDayIndex = 1;
    }
  }

  // Danh sách các ngày trong chu kỳ hiện tại đã nhận
  const claimedDaysInCycle = [];
  if (hasClaimedToday) {
    for (let i = 1; i <= currentDayIndex; i++) {
      claimedDaysInCycle.push(i);
    }
  } else if (latestCheckIn && latestCheckIn.date === yesterdayStr) {
    for (let i = 1; i <= latestCheckIn.dayIndex; i++) {
      claimedDaysInCycle.push(i);
    }
  }

  const todayReward = config.dayRewards[currentDayIndex - 1] ?? 1;

  return {
    enabled: config.enabled,
    dayRewards: config.dayRewards,
    hasClaimedToday,
    currentDayIndex,
    todayReward,
    userCoins: user.coins,
    claimedDays: claimedDaysInCycle,
  };
}

/**
 * Người dùng nhận xu điểm danh hôm nay
 */
async function claimDailyReward(userId) {
  const config = await getConfig();

  if (!config.enabled) {
    throw AppError.badRequest("Tính năng đăng nhập nhận xu hiện đang tạm đóng bởi Quản trị viên.");
  }

  const now = new Date();
  const todayStr = getVietnamDateString(now);
  const yesterdayStr = getVietnamDateString(new Date(now.getTime() - 24 * 60 * 60 * 1000));

  const existingToday = await prisma.dailyCheckIn.findUnique({
    where: {
      userId_date: {
        userId,
        date: todayStr,
      },
    },
  });

  if (existingToday) {
    throw AppError.badRequest("Bạn đã nhận xu điểm danh của ngày hôm nay rồi!");
  }

  const latestCheckIn = await prisma.dailyCheckIn.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  let nextDayIndex = 1;
  if (latestCheckIn && latestCheckIn.date === yesterdayStr) {
    nextDayIndex = (latestCheckIn.dayIndex % 7) + 1;
  }

  const coinsToAward = Number(config.dayRewards[nextDayIndex - 1] || 1);

  const [, updatedUser] = await prisma.$transaction([
    prisma.dailyCheckIn.create({
      data: {
        userId,
        dayIndex: nextDayIndex,
        coins: coinsToAward,
        date: todayStr,
      },
    }),
    prisma.user.update({
      where: { id: userId },
      data: {
        coins: { increment: coinsToAward },
      },
      select: { coins: true },
    }),
  ]);

  return {
    success: true,
    dayIndex: nextDayIndex,
    coinsEarned: coinsToAward,
    userCoins: updatedUser.coins,
    message: `Nhận thành công ${coinsToAward} xu của Ngày ${nextDayIndex}!`,
  };
}

/**
 * Admin xem danh sách xu của các tài khoản
 */
async function listUsersWithCoins({ search = "", page = 1, limit = 50 } = {}) {
  const where = {};
  if (search && search.trim()) {
    where.username = { contains: search.trim(), mode: "insensitive" };
  }

  const take = Math.min(Math.max(1, Number(limit) || 50), 100);
  const skip = Math.max(0, (Number(page) - 1) * take);

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        role: true,
        coins: true,
        avatarUrl: true,
        createdAt: true,
        _count: {
          select: {
            dailyCheckIns: true,
            lessonRewards: true,
          },
        },
      },
      orderBy: [{ coins: "desc" }, { createdAt: "desc" }],
      take,
      skip,
    }),
  ]);

  return {
    total,
    page: Number(page) || 1,
    limit: take,
    totalPages: Math.ceil(total / take) || 1,
    users,
  };
}

/**
 * Admin điều chỉnh (cộng/trừ) số xu của 1 user
 */
async function adjustUserCoins({ userId, amount }) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, coins: true },
  });

  if (!user) {
    throw AppError.notFound("Không tìm thấy tài khoản người dùng");
  }

  const delta = Number(amount);
  if (!Number.isInteger(delta)) {
    throw AppError.badRequest("Số xu điều chỉnh phải là số nguyên", { field: "amount" });
  }

  const newCoins = Math.max(0, user.coins + delta);

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { coins: newCoins },
    select: { id: true, username: true, coins: true },
  });

  return {
    userId: updated.id,
    username: updated.username,
    previousCoins: user.coins,
    newCoins: updated.coins,
    delta,
  };
}

module.exports = {
  getConfig,
  updateConfig,
  getStatus,
  claimDailyReward,
  listUsersWithCoins,
  adjustUserCoins,
};
