const { z } = require("zod");
const router = require("express").Router();

const inventoryController = require("../controllers/inventory.controller");
const { requireAuth } = require("../middlewares/auth");
const { parseOrThrow } = require("../utils/validate");

// itemId là slug của đồ trong catalog.json (ví dụ "hat_circle"), không tin client
const itemIdSchema = z.object({
  itemId: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9_]+$/, "itemId chỉ gồm chữ thường, số và dấu gạch dưới"),
});

// Tủ đồ là dữ liệu riêng của tài khoản -> luôn yêu cầu token
router.get("/", requireAuth, inventoryController.getInventory);

router.post(
  "/equip",
  requireAuth,
  function validateEquip(req, res, next) {
    req.body = parseOrThrow(itemIdSchema, req.body);
    return next();
  },
  inventoryController.equipItem,
);

router.post(
  "/unequip",
  requireAuth,
  function validateUnequip(req, res, next) {
    req.body = parseOrThrow(itemIdSchema, req.body);
    return next();
  },
  inventoryController.unequipItem,
);

module.exports = router;
