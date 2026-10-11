const inventoryService = require("../services/inventory.service");
const { sendSuccess } = require("../utils/response");

// GET /api/inventory -> { owned, equipped }
async function getInventory(req, res) {
  const inventory = await inventoryService.listInventory(req.user.id);
  return sendSuccess(res, inventory, "Tủ đồ");
}

// POST /api/inventory/equip { itemId } -> { equipped }
async function equipItem(req, res) {
  const result = await inventoryService.equipItem(req.user.id, req.body.itemId);
  return sendSuccess(res, result, "Đã trang bị");
}

// POST /api/inventory/unequip { itemId } -> { equipped }
async function unequipItem(req, res) {
  const result = await inventoryService.unequipItem(req.user.id, req.body.itemId);
  return sendSuccess(res, result, "Đã tháo đồ");
}

module.exports = { getInventory, equipItem, unequipItem };
