const shopService = require("../services/shop.service");
const { sendSuccess, sendError } = require("../utils/response");

async function listItems(req, res) {
  try {
    const includeInactive = req.user?.role === "ADMIN" && req.query.all === "true";
    const items = await shopService.getItems({
      includeInactive,
      search: req.query.search,
      userId: req.user?.id,
    });
    return sendSuccess(res, items, "Lấy danh sách sản phẩm thành công");
  } catch (error) {
    return sendError(res, error);
  }
}

async function getAvailableAssets(req, res) {
  try {
    const assets = shopService.getAvailableAssets();
    return sendSuccess(res, assets, "Lấy danh sách vật phẩm có sẵn thành công");
  } catch (error) {
    return sendError(res, error);
  }
}

async function getItem(req, res) {
  try {
    const item = await shopService.getItemById(req.params.id, req.user?.id);
    return sendSuccess(res, item, "Lấy thông tin sản phẩm thành công");
  } catch (error) {
    return sendError(res, error);
  }
}

async function purchaseItem(req, res) {
  try {
    const userId = req.user.id;
    const { itemId, contactInfo, note } = req.body;
    const result = await shopService.purchaseItem({
      userId,
      itemId,
      contactInfo,
      note,
    });
    return sendSuccess(res, result, result.message);
  } catch (error) {
    return sendError(res, error);
  }
}

async function getMyOrders(req, res) {
  try {
    const userId = req.user.id;
    const orders = await shopService.getUserOrders(userId);
    return sendSuccess(res, orders, "Lấy lịch sử mua hàng thành công");
  } catch (error) {
    return sendError(res, error);
  }
}

async function createItem(req, res) {
  try {
    const item = await shopService.createItem(req.body);
    return sendSuccess(res, item, "Thêm sản phẩm mới thành công", 201);
  } catch (error) {
    return sendError(res, error);
  }
}

async function updateItem(req, res) {
  try {
    const item = await shopService.updateItem(req.params.id, req.body);
    return sendSuccess(res, item, "Cập nhật sản phẩm thành công");
  } catch (error) {
    return sendError(res, error);
  }
}

async function deleteItem(req, res) {
  try {
    await shopService.deleteItem(req.params.id);
    return sendSuccess(res, null, "Xoá sản phẩm thành công");
  } catch (error) {
    return sendError(res, error);
  }
}

async function getAdminOrders(req, res) {
  try {
    const { status, search, page, limit } = req.query;
    const result = await shopService.getAdminOrders({
      status,
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
    return sendSuccess(res, result, "Lấy danh sách đơn hàng thành công");
  } catch (error) {
    return sendError(res, error);
  }
}

async function updateOrderStatus(req, res) {
  try {
    const { status } = req.body;
    const order = await shopService.updateOrderStatus(req.params.id, status);
    return sendSuccess(res, order, "Cập nhật trạng thái đơn hàng thành công");
  } catch (error) {
    return sendError(res, error);
  }
}

module.exports = {
  listItems,
  getAvailableAssets,
  getItem,
  purchaseItem,
  getMyOrders,
  createItem,
  updateItem,
  deleteItem,
  getAdminOrders,
  updateOrderStatus,
};
