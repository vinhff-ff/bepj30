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

function extractItemSlug(imageUrl) {
  if (!imageUrl || typeof imageUrl !== "string") return null;
  const match = imageUrl.match(/(?:^|\/)items\/([^/]+?)(?:\.[a-zA-Z0-9]+)?$/);
  return match ? match[1] : null;
}

async function listInventory(userId) {
  if (userId) {
    // Tự động đồng bộ các đơn hàng đã mua thành công vào Tủ đồ nếu chưa có
    try {
      const validOrders = await prisma.shopOrder.findMany({
        where: {
          userId,
          OR: [
            // Đơn hàng thường: tự động mở vào tủ đồ (miễn là chưa bị hủy)
            { isSpecial: false, status: { not: "CANCELLED" } },
            // Đơn hàng đặc biệt: TUYỆT ĐỐI KHÔNG MỞ TỰ ĐỘNG, CHỈ MỞ KHI ADMIN ĐÃ DUYỆT COMPLETED
            { isSpecial: true, status: "COMPLETED" },
          ],
        },
        include: { item: true },
      });

      for (const order of validOrders) {
        if (order.item?.imageUrl) {
          const slug = extractItemSlug(order.item.imageUrl);
          if (slug) {
            await prisma.userItem.upsert({
              where: { userId_itemId: { userId, itemId: slug } },
              create: { userId, itemId: slug, equipped: false },
              update: {},
            });
          }
        }
      }
    } catch {
      // Bỏ qua lỗi đồng bộ nền
    }
  }

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
    throw AppError.forbidden("Bạn chưa sở hữu món đồ này. Vui lòng mua tại Cửa hàng để trang bị!", { itemId });
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
