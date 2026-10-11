const { prisma } = require("../config/db");

/**
 * Lấy chuỗi ngày YYYY-MM-DD theo múi giờ Việt Nam (UTC+7)
 */
function getVietnamDateString(date = new Date()) {
  const vnTime = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return vnTime.toISOString().slice(0, 10);
}

/**
 * Cập nhật chuỗi đăng nhập cho người dùng và chuỗi của nhóm người dùng đó
 */
async function recordUserLoginAndStreak(userId) {
  if (!userId) return null;

  const now = new Date();
  const todayStr = getVietnamDateString(now);
  const yesterdayStr = getVietnamDateString(new Date(now.getTime() - 24 * 60 * 60 * 1000));

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      streak: true,
      lastLoginDate: true,
      groupMemberships: {
        select: { groupId: true },
        take: 1,
      },
    },
  });

  if (!user) return null;

  let newStreak = user.streak || 0;
  let shouldUpdateUser = false;

  if (user.lastLoginDate !== todayStr) {
    if (user.lastLoginDate === yesterdayStr) {
      newStreak = (user.streak || 0) + 1;
    } else {
      // Bị lỡ ngày hôm qua -> bắt đầu chuỗi mới là 1
      newStreak = 1;
    }
    shouldUpdateUser = true;

    await prisma.user.update({
      where: { id: userId },
      data: {
        streak: newStreak,
        lastLoginDate: todayStr,
      },
    });
  }

  // Cập nhật chuỗi nhóm nếu user đã tham gia nhóm
  const membership = user.groupMemberships[0];
  if (membership?.groupId) {
    await updateGroupStreak(membership.groupId);
  }

  return {
    streak: newStreak,
    lastLoginDate: todayStr,
  };
}

/**
 * Cập nhật hoặc tính toán chuỗi cho một nhóm cụ thể
 */
async function updateGroupStreak(groupId) {
  if (!groupId) return null;

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              lastLoginDate: true,
            },
          },
        },
      },
    },
  });

  if (!group) return null;

  const now = new Date();
  const todayStr = getVietnamDateString(now);
  const yesterdayStr = getVietnamDateString(new Date(now.getTime() - 24 * 60 * 60 * 1000));

  const totalMembers = group.members.length;
  if (totalMembers === 0) return group;

  // Kiểm tra xem tất cả thành viên trong nhóm có đăng nhập hôm nay không
  const allLoggedInToday = group.members.every((m) => m.user.lastLoginDate === todayStr);

  let currentStreak = group.streak || 0;

  // Nếu hôm qua không duy trì (và hôm nay chưa cập nhật) thì chuỗi cũ đã đứt
  if (group.lastStreakDate && group.lastStreakDate !== yesterdayStr && group.lastStreakDate !== todayStr) {
    currentStreak = 0;
  }

  // Nếu tất cả thành viên ĐÃ đăng nhập hôm nay:
  if (allLoggedInToday) {
    if (group.lastStreakDate !== todayStr) {
      if (group.lastStreakDate === yesterdayStr) {
        currentStreak = currentStreak + 1;
      } else {
        currentStreak = 1;
      }

      await prisma.group.update({
        where: { id: groupId },
        data: {
          streak: currentStreak,
          lastStreakDate: todayStr,
        },
      });
    }
  }

  return {
    streak: currentStreak,
    allLoggedInToday,
  };
}

/**
 * Xử lý thông tin chi tiết về chuỗi của nhóm để trả về client
 */
function enrichGroupStreakData(group) {
  if (!group) return null;

  const now = new Date();
  const todayStr = getVietnamDateString(now);
  const yesterdayStr = getVietnamDateString(new Date(now.getTime() - 24 * 60 * 60 * 1000));

  const members = group.members || [];
  const totalMembers = members.length;

  // Đánh dấu từng thành viên: đã đăng nhập hôm nay chưa
  const enrichedMembers = members.map((m) => {
    const hasLoggedInToday = Boolean(m.user && m.user.lastLoginDate === todayStr);
    return {
      ...m,
      hasLoggedInToday,
    };
  });

  const allLoggedInToday = totalMembers > 0 && enrichedMembers.every((m) => m.hasLoggedInToday);

  let actualStreak = group.streak || 0;
  if (group.lastStreakDate && group.lastStreakDate !== yesterdayStr && group.lastStreakDate !== todayStr) {
    actualStreak = 0;
  }

  // Nếu có người không duy trì (chưa/không đăng nhập hôm nay) -> chuỗi nhóm biến thành băng và mất số chuỗi đó (0)
  const isFrozen = !allLoggedInToday;
  const displayStreak = isFrozen ? 0 : actualStreak;

  return {
    ...group,
    streak: displayStreak,
    actualStreak,
    isFrozen,
    allLoggedInToday,
    todayStr,
    members: enrichedMembers,
  };
}

module.exports = {
  getVietnamDateString,
  recordUserLoginAndStreak,
  updateGroupStreak,
  enrichGroupStreakData,
};
