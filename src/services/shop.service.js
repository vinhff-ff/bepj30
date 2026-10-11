const { prisma } = require("../config/db");
const { AppError } = require("../utils/AppError");

/**
 * Lấy danh sách sản phẩm trong Cửa hàng
 * @param {Object} options
 * @param {boolean} [options.includeInactive=false]
 * @param {string} [options.search=""]
 */
async function getItems({ includeInactive = false, search = "" } = {}) {
  const where = {};
  if (!includeInactive) {
    where.isActive = true;
  }
  if (search && search.trim()) {
    where.name = { contains: search.trim(), mode: "insensitive" };
  }

  return await prisma.shopItem.findMany({
    where,
    orderBy: [
      { isSpecial: "desc" },
      { createdAt: "desc" },
    ],
  });
}

/**
 * Lấy chi tiết một sản phẩm
 */
async function getItemById(id) {
  const item = await prisma.shopItem.findUnique({
    where: { id },
  });
  if (!item) {
    throw AppError.notFound("Không tìm thấy sản phẩm");
  }
  return item;
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

  return await prisma.shopItem.create({
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

  return await prisma.shopItem.update({
    where: { id },
    data: updateData,
  });
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
 * - Kiểm tra đủ xu
 * - Nếu đồ đặc biệt: bắt buộc có contactInfo
 * - Trừ xu người dùng
 * - Lưu đơn hàng gửi Admin
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

    // 2. Kiểm tra tồn kho
    if (item.stock !== null && item.stock <= 0) {
      throw AppError.badRequest("Vật phẩm này hiện đã hết hàng.");
    }

    // 3. Kiểm tra thông tin liên lạc nếu là đồ đặc biệt
    const cleanContact = (contactInfo || "").trim();
    if (item.isSpecial && !cleanContact) {
      throw AppError.badRequest(
        "Vật phẩm này được đánh dấu là ĐẶC BIỆT! Vui lòng nhập thông tin liên lạc (SĐT, Zalo, Email, Facebook...) để Admin liên hệ trao thưởng.",
        { field: "contactInfo" }
      );
    }

    // 4. Tìm người dùng và kiểm tra số xu
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

    // 5. Trừ xu của người dùng
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

    // 6. Giảm tồn kho nếu có giới hạn
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

    // 7. Tạo đơn hàng (vật phẩm thường tự động hoàn thành ngay, không cần Admin duyệt)
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

    return {
      order,
      remainingCoins: updatedUser.coins,
      message: item.isSpecial
        ? `Mua thành công "${item.name}"! Thông tin liên lạc của bạn đã được gửi tới Admin để xử lý.`
        : `Mua thành công "${item.name}"! Bạn đã thanh toán ${item.coinPrice} xu.`,
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
  });
  if (!order) {
    throw AppError.notFound("Không tìm thấy đơn hàng");
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
