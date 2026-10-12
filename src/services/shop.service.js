const fs = require("fs");
const path = require("path");
const { prisma } = require("../config/db");
const { env } = require("../config/env");
const { AppError } = require("../utils/AppError");

/**
 * Trích xuất slug từ imageUrl (nếu thuộc folder /items/)
 * Ví dụ: "/items/hat_circle.webp" -> "hat_circle"
 * "/items/glasses_kinh.png" -> "glasses_kinh"
 */
function extractItemSlug(imageUrl) {
  if (!imageUrl || typeof imageUrl !== "string") return null;
  const match = imageUrl.match(/(?:^|\/)items\/([^/]+?)(?:\.[a-zA-Z0-9]+)?$/);
  return match ? match[1] : null;
}

/**
 * Tự động đồng bộ item vào catalog.json nếu là đồ trang bị và chưa có
 */
function syncCatalogItem(slug, name, filename) {
  try {
    const catalogPath = env.labCatalogPath;
    if (!fs.existsSync(catalogPath)) return;
    const raw = fs.readFileSync(catalogPath, "utf8");
    const data = JSON.parse(raw);

    const ext = filename ? path.extname(filename).replace(".", "") : "webp";

    if (!data[slug]) {
      data[slug] = {
        name: name || slug,
        unlockedBy: "",
        ...(ext && ext !== "webp" ? { ext } : {}),
      };
      fs.writeFileSync(catalogPath, JSON.stringify(data, null, 2), "utf8");
    } else if (name && data[slug].name !== name) {
      data[slug].name = name;
      fs.writeFileSync(catalogPath, JSON.stringify(data, null, 2), "utf8");
    }
  } catch (err) {
    console.error("Lỗi đồng bộ catalog.json:", err.message);
  }
}

/**
 * Quét danh sách file ảnh có sẵn trong thư mục public/items
 */
function getAvailableAssets() {
  const itemsDir = path.dirname(env.labCatalogPath);
  if (!fs.existsSync(itemsDir)) {
    return [];
  }

  let catalog = {};
  try {
    if (fs.existsSync(env.labCatalogPath)) {
      catalog = JSON.parse(fs.readFileSync(env.labCatalogPath, "utf8"));
    }
  } catch {
    catalog = {};
  }

  const files = fs.readdirSync(itemsDir);
  const imageExts = new Set([".png", ".webp", ".jpg", ".jpeg", ".svg"]);

  const assets = [];
  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (!imageExts.has(ext)) continue;

    const baseName = path.basename(file, ext);
    const slug = baseName;
    const catalogMeta = catalog[slug];

    let suggestedName = catalogMeta?.name;
    if (!suggestedName) {
      const parts = slug.split("_");
      const prefix = parts[0];
      const rest = parts.slice(1).join(" ");
      const prefixMap = {
        hat: "Mũ",
        glasses: "Kính",
        mask: "Mặt nạ",
        shirt: "Áo",
      };
      suggestedName = prefixMap[prefix]
        ? `${prefixMap[prefix]} ${rest || ""}`.trim()
        : slug.replace(/_/g, " ");
    }

    assets.push({
      filename: file,
      url: `/items/${file}`,
      slug,
      name: suggestedName,
    });
  }

  return assets;
}

/**
 * Lấy danh sách sản phẩm trong Cửa hàng
 * @param {Object} options
 * @param {boolean} [options.includeInactive=false]
 * @param {string} [options.search=""]
 * @param {string|null} [options.userId=null]
 */
async function getItems({ includeInactive = false, search = "", userId = null } = {}) {
  const where = {};
  if (!includeInactive) {
    where.isActive = true;
  }
  if (search && search.trim()) {
    where.name = { contains: search.trim(), mode: "insensitive" };
  }

  const items = await prisma.shopItem.findMany({
    where,
    orderBy: [
      { isSpecial: "desc" },
      { createdAt: "desc" },
    ],
  });

  if (!userId) {
    return items.map((item) => ({ ...item, isOwned: false }));
  }

  // Lấy các đơn hàng người dùng đã mua
  const orders = await prisma.shopOrder.findMany({
    where: {
      userId,
      status: { in: ["PENDING", "PROCESSING", "COMPLETED"] },
    },
    select: { itemId: true },
  });
  const boughtItemIds = new Set(orders.map((o) => o.itemId));

  // Lấy các trang bị người dùng đã sở hữu trong tủ đồ
  const userItems = await prisma.userItem.findMany({
    where: { userId },
    select: { itemId: true },
  });
  const ownedSlugs = new Set(userItems.map((ui) => ui.itemId));

  return items.map((item) => {
    const slug = extractItemSlug(item.imageUrl);
    const isOwned = boughtItemIds.has(item.id) || (Boolean(slug) && ownedSlugs.has(slug));
    return {
      ...item,
      isOwned,
    };
  });
}

/**
 * Lấy chi tiết một sản phẩm
 */
async function getItemById(id, userId = null) {
  const item = await prisma.shopItem.findUnique({
    where: { id },
  });
  if (!item) {
    throw AppError.notFound("Không tìm thấy sản phẩm");
  }

  let isOwned = false;
  if (userId) {
    const existingOrder = await prisma.shopOrder.findFirst({
      where: {
        userId,
        itemId: id,
        status: { in: ["PENDING", "PROCESSING", "COMPLETED"] },
      },
    });
    const slug = extractItemSlug(item.imageUrl);
    let inInventory = false;
    if (slug) {
      const ownedItem = await prisma.userItem.findUnique({
        where: { userId_itemId: { userId, itemId: slug } },
      });
      inInventory = Boolean(ownedItem);
    }
    isOwned = Boolean(existingOrder) || inInventory;
  }

  return { ...item, isOwned };
}

/**
 * Admin: Tạo sản phẩm mới
 */
async function createItem({ name, description, imageUrl, coinPrice, isSpecial, stock }) {
  if (!name || !name.trim()) {
    throw AppError.badRequest("Tên sản phẩm không được để trống", { field: "name" });
  }
  if (!imageUrl || !imageUrl.trim()) {
    throw AppError.badRequest("Ảnh sản phẩm không được để trống", { field: "imageUrl" });
  }

  const parsedPrice = Number(coinPrice);
  if (isNaN(parsedPrice) || parsedPrice < 0 || !Number.isInteger(parsedPrice)) {
    throw AppError.badRequest("Giá xu phải là số nguyên không âm", { field: "coinPrice" });
  }

  let parsedStock = null;
  if (stock !== undefined && stock !== null && stock !== "") {
    parsedStock = Number(stock);
    if (isNaN(parsedStock) || parsedStock < 0 || !Number.isInteger(parsedStock)) {
      throw AppError.badRequest("Số lượng tồn kho phải là số nguyên không âm", { field: "stock" });
    }
  }

  const created = await prisma.shopItem.create({
    data: {
      name: name.trim(),
      description: description ? description.trim() : null,
      imageUrl: imageUrl.trim(),
      coinPrice: parsedPrice,
      isSpecial: Boolean(isSpecial),
      stock: parsedStock,
      isActive: true,
    },
  });

  // Tự động đồng bộ catalog.json nếu là đồ trang bị trong public/items
  const slug = extractItemSlug(imageUrl);
  if (slug) {
    const filename = path.basename(imageUrl.trim());
    syncCatalogItem(slug, name.trim(), filename);
  }

  return created;
}

/**
 * Admin: Cập nhật sản phẩm
 */
async function updateItem(id, data) {
  await getItemById(id);

  const updateData = {};
  if (data.name !== undefined) {
    if (!data.name.trim()) {
      throw AppError.badRequest("Tên sản phẩm không được để trống", { field: "name" });
    }
    updateData.name = data.name.trim();
  }
  if (data.description !== undefined) {
    updateData.description = data.description ? data.description.trim() : null;
  }
  if (data.imageUrl !== undefined) {
    if (!data.imageUrl.trim()) {
      throw AppError.badRequest("Ảnh sản phẩm không được để trống", { field: "imageUrl" });
    }
    updateData.imageUrl = data.imageUrl.trim();
  }
  if (data.coinPrice !== undefined) {
    const parsedPrice = Number(data.coinPrice);
    if (isNaN(parsedPrice) || parsedPrice < 0 || !Number.isInteger(parsedPrice)) {
      throw AppError.badRequest("Giá xu phải là số nguyên không âm", { field: "coinPrice" });
    }
    updateData.coinPrice = parsedPrice;
  }
  if (data.isSpecial !== undefined) {
    updateData.isSpecial = Boolean(data.isSpecial);
  }
  if (data.isActive !== undefined) {
    updateData.isActive = Boolean(data.isActive);
  }
  if (data.stock !== undefined) {
    if (data.stock === null || data.stock === "") {
      updateData.stock = null;
    } else {
      const parsedStock = Number(data.stock);
      if (isNaN(parsedStock) || parsedStock < 0 || !Number.isInteger(parsedStock)) {
        throw AppError.badRequest("Số lượng tồn kho phải là số nguyên không âm", { field: "stock" });
      }
      updateData.stock = parsedStock;
    }
  }

  const updated = await prisma.shopItem.update({
    where: { id },
    data: updateData,
  });

  // Tự động đồng bộ catalog.json nếu là đồ trang bị
  if (updated.imageUrl) {
    const slug = extractItemSlug(updated.imageUrl);
    if (slug) {
      const filename = path.basename(updated.imageUrl);
      syncCatalogItem(slug, updated.name, filename);
    }
  }

  return updated;
}

/**
 * Admin: Xoá sản phẩm
 */
async function deleteItem(id) {
  await getItemById(id);
  return await prisma.shopItem.delete({
    where: { id },
  });
}

/**
 * Người dùng mua sản phẩm bằng xu
 * - Kiểm tra đã sở hữu chưa (mua rồi không cho mua lại)
 * - Kiểm tra đủ xu
 * - Nếu đồ đặc biệt: bắt buộc có contactInfo
 * - Trừ xu người dùng
 * - Giảm tồn kho
 * - Lưu đơn hàng
 * - Tự động cấp vào Tủ đồ (userItem) nếu là trang bị
 */
async function purchaseItem({ userId, itemId, contactInfo, note }) {
  if (!itemId) {
    throw AppError.badRequest("Thiếu ID sản phẩm cần mua", { field: "itemId" });
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Tìm sản phẩm
    const item = await tx.shopItem.findUnique({
      where: { id: itemId },
    });
    if (!item || !item.isActive) {
      throw AppError.notFound("Vật phẩm không tồn tại hoặc đã ngừng bán.");
    }

    // 2. KIỂM TRA ĐÃ SỞ HỮU CHƯA (CHẶN MUA LẠI)
    // A. Kiểm tra đơn hàng cũ
    const existingOrder = await tx.shopOrder.findFirst({
      where: {
        userId,
        itemId: item.id,
        status: { in: ["PENDING", "PROCESSING", "COMPLETED"] },
      },
    });
    if (existingOrder) {
      throw AppError.badRequest("Bạn đã sở hữu vật phẩm này rồi, không thể mua lại nữa.");
    }

    // B. Kiểm tra trong Tủ đồ (nếu là trang bị)
    const slug = extractItemSlug(item.imageUrl);
    if (slug) {
      const existingUserItem = await tx.userItem.findUnique({
        where: { userId_itemId: { userId, itemId: slug } },
      });
      if (existingUserItem) {
        throw AppError.badRequest("Bạn đã sở hữu vật phẩm này trong Tủ đồ rồi, không thể mua lại nữa.");
      }
    }

    // 3. Kiểm tra tồn kho
    if (item.stock !== null && item.stock <= 0) {
      throw AppError.badRequest("Vật phẩm này hiện đã hết hàng.");
    }

    // 4. Kiểm tra thông tin liên lạc nếu là đồ đặc biệt
    const cleanContact = (contactInfo || "").trim();
    if (item.isSpecial && !cleanContact) {
      throw AppError.badRequest(
        "Vật phẩm này được đánh dấu là ĐẶC BIỆT! Vui lòng nhập thông tin liên lạc (SĐT, Zalo, Email, Facebook...) để Admin liên hệ trao thưởng.",
        { field: "contactInfo" }
      );
    }

    // 5. Tìm người dùng và kiểm tra số xu
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, coins: true },
    });
    if (!user) {
      throw AppError.notFound("Không tìm thấy tài khoản người dùng.");
    }

    if (user.coins < item.coinPrice) {
      throw AppError.badRequest(
        `Bạn không đủ xu để mua vật phẩm này! Cần ${item.coinPrice.toLocaleString("vi-VN")} xu nhưng bạn chỉ có ${user.coins.toLocaleString("vi-VN")} xu.`
      );
    }

    // 6. Trừ xu của người dùng
    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: {
        coins: {
          decrement: item.coinPrice,
        },
      },
      select: {
        id: true,
        username: true,
        coins: true,
      },
    });

    // 7. Giảm tồn kho nếu có giới hạn
    if (item.stock !== null) {
      await tx.shopItem.update({
        where: { id: itemId },
        data: {
          stock: {
            decrement: 1,
          },
        },
      });
    }

    // 8. Tạo đơn hàng (vật phẩm thường tự động hoàn thành ngay)
    const order = await tx.shopOrder.create({
      data: {
        userId,
        itemId,
        coinPrice: item.coinPrice,
        isSpecial: item.isSpecial,
        contactInfo: item.isSpecial ? cleanContact : null,
        note: item.isSpecial ? ((note || "").trim() || null) : null,
        status: item.isSpecial ? "PENDING" : "COMPLETED",
      },
      include: {
        item: true,
      },
    });

    // 9. CHỈ TỰ ĐỘNG MỞ VÀO TỦ ĐỒ CHO ĐƠN HÀNG THƯỜNG (!item.isSpecial), KHÔNG MỞ VỚI ĐƠN HÀNG ĐẶC BIỆT
    if (!item.isSpecial && slug) {
      await tx.userItem.upsert({
        where: { userId_itemId: { userId, itemId: slug } },
        create: {
          userId,
          itemId: slug,
          equipped: false,
        },
        update: {},
      });
    }

    return {
      order,
      remainingCoins: updatedUser.coins,
      isOwned: true,
      message: item.isSpecial
        ? `Mua thành công "${item.name}"! Thông tin liên lạc của bạn đã được gửi tới Admin để xử lý.`
        : `Mua thành công "${item.name}"! Món đồ đã được thêm vào Tủ đồ của bạn.`,
    };
  });
}

/**
 * Lịch sử đơn hàng của người dùng hiện tại
 */
async function getUserOrders(userId) {
  return await prisma.shopOrder.findMany({
    where: { userId },
    include: {
      item: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

/**
 * Admin: Xem toàn bộ đơn hàng
 */
async function getAdminOrders({ status, search, page = 1, limit = 50 } = {}) {
  const where = {};
  if (status && status !== "ALL") {
    where.status = status;
  }
  if (search && search.trim()) {
    where.OR = [
      { contactInfo: { contains: search.trim(), mode: "insensitive" } },
      { user: { username: { contains: search.trim(), mode: "insensitive" } } },
      { item: { name: { contains: search.trim(), mode: "insensitive" } } },
    ];
  }

  const [orders, total] = await Promise.all([
    prisma.shopOrder.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            coins: true,
          },
        },
        item: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.shopOrder.count({ where }),
  ]);

  return {
    orders,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Admin: Cập nhật trạng thái đơn hàng (PENDING, PROCESSING, COMPLETED, CANCELLED)
 */
async function updateOrderStatus(orderId, status) {
  const validStatuses = ["PENDING", "PROCESSING", "COMPLETED", "CANCELLED"];
  if (!validStatuses.includes(status)) {
    throw AppError.badRequest(`Trạng thái không hợp lệ. Phải là một trong: ${validStatuses.join(", ")}`);
  }

  const order = await prisma.shopOrder.findUnique({
    where: { id: orderId },
    include: { item: true },
  });
  if (!order) {
    throw AppError.notFound("Không tìm thấy đơn hàng");
  }

  // Nếu chuyển sang COMPLETED và là item trang bị, cấp vào userItem
  if (status === "COMPLETED" && order.item?.imageUrl) {
    const slug = extractItemSlug(order.item.imageUrl);
    if (slug) {
      await prisma.userItem.upsert({
        where: { userId_itemId: { userId: order.userId, itemId: slug } },
        create: {
          userId: order.userId,
          itemId: slug,
          equipped: false,
        },
        update: {},
      });
    }
  }

  // Nếu chuyển sang CANCELLED hoặc trạng thái hủy, gỡ khỏi userItem nếu không có đơn COMPLETED khác
  if (status === "CANCELLED" && order.item?.imageUrl) {
    const slug = extractItemSlug(order.item.imageUrl);
    if (slug) {
      const otherCompleted = await prisma.shopOrder.findFirst({
        where: {
          id: { not: orderId },
          userId: order.userId,
          status: "COMPLETED",
          item: { imageUrl: { contains: slug } },
        },
      });
      if (!otherCompleted) {
        await prisma.userItem.deleteMany({
          where: { userId: order.userId, itemId: slug },
        });
      }
    }
  }

  return await prisma.shopOrder.update({
    where: { id: orderId },
    data: { status },
    include: {
      user: {
        select: {
          id: true,
          username: true,
        },
      },
      item: true,
    },
  });
}

module.exports = {
  extractItemSlug,
  getAvailableAssets,
  getItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  purchaseItem,
  getUserOrders,
  getAdminOrders,
  updateOrderStatus,
};
