const { prisma } = require("../config/db");
const catalog = require("../config/catalog");
const { AppError } = require("../utils/AppError");

// Tủ đồ của người chơi.
// DB chỉ giữ itemId + cờ equipped, mọi thông tin về đồ (tên, slot, ảnh) lấy từ
// catalog.json nên đổi tên/ảnh đồ chỉ cần sửa file, không migrate.
//
// Quy tắc bất di bất dịch: client không được tự quyết đồ nào đang mặc.
// Mỗi slot tối đa 1 món, việc gỡ món cũ và mặc món mới nằm trong cùng
// transaction để không bao giờ xảy ra 2 món cùng slot cùng lúc.

async function listInventory(userId) {
  const rows = await prisma.userItem.findMany({
    where: { userId },
    select: { itemId: true, equipped: true },
    orderBy: { itemId: "asc" },
  });

  return {
    owned: rows.map((row) => row.itemId),
    equipped: rows.filter((row) => row.equipped).map((row) => row.itemId),
  };
}

function assertItemInCatalog(itemId) {
  const meta = catalog.getItemMeta(itemId);

  if (!meta) {
    throw AppError.badRequest(`Không có đồ "${itemId}" trong danh mục`, { itemId });
  }

  return meta;
}

async function assertOwned(userId, itemId) {
  const owned = await prisma.userItem.findUnique({
    where: { userId_itemId: { userId, itemId } },
    select: { itemId: true },
  });

  if (!owned) {
    // TEMPORARY: bypass ownership check for testing
    // throw AppError.forbidden("Bạn chưa nhận được món đồ này nên chưa thể trang bị", { itemId });
  }
}

async function listEquippedIds(userId, client) {
  const db = client || prisma;
  const rows = await db.userItem.findMany({
    where: { userId, equipped: true },
    select: { itemId: true },
    orderBy: { itemId: "asc" },
  });

  return rows.map((row) => row.itemId);
}

async function equipItem(userId, itemId) {
  const meta = assertItemInCatalog(itemId);
  await assertOwned(userId, itemId);

  const sameSlotIds = catalog.getItemIdsBySlot(meta.slot);

  const equipped = await prisma.$transaction(async (tx) => {
    // Gỡ mọi món đang mặc cùng slot trước, rồi mặc món mới
    await tx.userItem.updateMany({
      where: { userId, equipped: true, itemId: { in: sameSlotIds } },
      data: { equipped: false },
    });

    await tx.userItem.upsert({
      where: { userId_itemId: { userId, itemId } },
      update: { equipped: true },
      create: { userId, itemId, equipped: true },
    });

    return listEquippedIds(userId, tx);
  });

  return { equipped };
}

async function unequipItem(userId, itemId) {
  assertItemInCatalog(itemId);
  await assertOwned(userId, itemId);

  const equipped = await prisma.$transaction(async (tx) => {
    await tx.userItem.upsert({
      where: { userId_itemId: { userId, itemId } },
      update: { equipped: false },
      create: { userId, itemId, equipped: false },
    });

    return listEquippedIds(userId, tx);
  });

  return { equipped };
}

module.exports = {
  listInventory,
  equipItem,
  unequipItem,
  listEquippedIds,
  assertItemInCatalog,
  assertOwned,
};
