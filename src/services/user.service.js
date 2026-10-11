const { prisma } = require("../config/db");
const { AppError } = require("../utils/AppError");
const { hashPassword } = require("../utils/password");
const { validateUsername, validatePassword } = require("../utils/validators");
const { USER_PUBLIC_SELECT, USER_WITH_IMAGE_COUNT_SELECT } = require("../utils/select");

// Chỉ dùng nội bộ cho luồng đăng nhập, tuyệt đối không trả ra ngoài
async function findByUsername(username) {
  return prisma.user.findUnique({ where: { username } });
}

function buildWhere({ username, role }) {
  const where = {};

  if (username) {
    // mode insensitive chỉ có trên PostgreSQL
    where.username = { contains: username, mode: "insensitive" };
  }
  if (role) {
    where.role = String(role).toUpperCase();
  }

  return where;
}

// Chỉ ADMIN được xem tài khoản bất kỳ, thành viên chỉ xem được chính mình
function assertCanAccess(targetId, actor) {
  if (actor.role === "ADMIN") {
    return;
  }
  if (actor.id !== targetId) {
    throw AppError.forbidden("Không được sửa thông tin của tài khoản khác");
  }
}

async function listUsers({ page, pageSize, ...filters }) {
  const where = buildWhere(filters);

  // Gộp 2 truy vấn thành 1 round-trip
  const [total, data] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: USER_WITH_IMAGE_COUNT_SELECT,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return { data, total };
}

async function getUserById(id, actor) {
  assertCanAccess(id, actor);

  const user = await prisma.user.findUnique({
    where: { id },
    select: USER_PUBLIC_SELECT,
  });

  if (!user) {
    throw AppError.notFound("Không tìm thấy người dùng");
  }

  return user;
}

async function createUser({ username, password, avatarUrl, gender, role }) {
  validateUsername(username);
  validatePassword(password);

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    throw AppError.conflict("Tài khoản đã tồn tại", { field: "username" });
  }

  return prisma.user.create({
    data: {
      username,
      password: await hashPassword(password),
      avatarUrl: avatarUrl || null,
      gender: gender ? String(gender).toUpperCase() : null,
      role: role ? String(role).toUpperCase() : "MEMBER",
    },
    select: USER_PUBLIC_SELECT,
  });
}

async function updateUser(id, payload, actor) {
  assertCanAccess(id, actor);
  await getUserById(id, actor);

  const { username, password, avatarUrl, inventoryAvatarUrl, gender, role } = payload;

  // Thành viên không được tự đổi tên hoặc tự nâng quyền
  if (actor.role !== "ADMIN" && (role !== undefined || username !== undefined)) {
    throw AppError.forbidden("Chỉ quản trị viên mới đổi được tài khoản hoặc vai trò");
  }

  const data = {};

  if (username !== undefined) {
    validateUsername(username);
    data.username = username;
  }
  if (password !== undefined) {
    validatePassword(password);
    data.password = await hashPassword(password);
  }
  if (avatarUrl !== undefined) {
    data.avatarUrl = avatarUrl || null;
  }
  if (inventoryAvatarUrl !== undefined) {
    data.inventoryAvatarUrl = inventoryAvatarUrl || null;
  }
  if (gender !== undefined) {
    data.gender = gender ? String(gender).toUpperCase() : null;
  }
  if (role !== undefined) {
    data.role = String(role).toUpperCase();
  }

  if (Object.keys(data).length === 0) {
    throw AppError.badRequest("Không có trường nào để cập nhật");
  }

  return prisma.user.update({
    where: { id },
    data,
    select: USER_PUBLIC_SELECT,
  });
}

async function deleteUser(id, actor) {
  await getUserById(id, actor);
  // Ảnh nhật kí bị xoá theo do onDelete: Cascade
  await prisma.user.delete({ where: { id } });
  return { id };
}

async function getGenderStats() {
  const [total, grouped] = await Promise.all([
    prisma.user.count(),
    prisma.user.groupBy({
      by: ["gender"],
      _count: { id: true },
    }),
  ]);

  let male = 0;
  let female = 0;
  let other = 0;
  let unspecified = 0;

  for (const item of grouped) {
    const count = item._count.id;
    if (item.gender === "MALE") {
      male += count;
    } else if (item.gender === "FEMALE") {
      female += count;
    } else if (item.gender === "OTHER") {
      other += count;
    } else {
      unspecified += count;
    }
  }

  return {
    total,
    male,
    female,
    other,
    unspecified,
  };
}

async function getAdminOverviewStats() {
  const [
    genderStats,
    totalArticles,
    totalLessons,
    rooms,
    specialOrdersCount,
    totalOrders,
    specialOrdersPending,
    specialOrdersCompleted,
  ] = await Promise.all([
    getGenderStats(),
    prisma.article.count(),
    prisma.lesson.count(),
    prisma.room.findMany({
      orderBy: { order: "asc" },
      select: {
        id: true,
        name: true,
        order: true,
        _count: {
          select: { lessons: true },
        },
      },
    }),
    prisma.shopOrder.count({
      where: { isSpecial: true },
    }),
    prisma.shopOrder.count(),
    prisma.shopOrder.count({
      where: { isSpecial: true, status: "PENDING" },
    }),
    prisma.shopOrder.count({
      where: { isSpecial: true, status: "COMPLETED" },
    }),
  ]);

  const lessonsByRoom = rooms.map((r) => ({
    roomId: r.id,
    roomName: r.name,
    order: r.order,
    lessonCount: r._count.lessons,
  }));

  return {
    totalUsers: genderStats.total,
    gender: genderStats,
    totalArticles,
    totalLessons,
    lessonsByRoom,
    specialOrdersCount,
    specialOrdersPending,
    specialOrdersCompleted,
    totalOrders,
  };
}

module.exports = {
  findByUsername,
  listUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getGenderStats,
  getAdminOverviewStats,
};
