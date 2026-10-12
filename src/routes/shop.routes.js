const router = require("express").Router();
const shopController = require("../controllers/shop.controller");
const { requireAuth, requireRole, optionalAuth } = require("../middlewares/auth");

// 1. Danh sách sản phẩm (công khai, nếu có token thì kiểm tra trạng thái sở hữu)
router.get("/items", optionalAuth, shopController.listItems);
router.get("/items/:id", optionalAuth, shopController.getItem);

// 2. Mua hàng và xem lịch sử mua (cần đăng nhập)
router.post("/purchase", requireAuth, shopController.purchaseItem);
router.get("/my-orders", requireAuth, shopController.getMyOrders);

// 3. Quản trị viên (ADMIN)
router.get("/admin/available-assets", requireAuth, requireRole("ADMIN"), shopController.getAvailableAssets);
router.post("/admin/items", requireAuth, requireRole("ADMIN"), shopController.createItem);
router.put("/admin/items/:id", requireAuth, requireRole("ADMIN"), shopController.updateItem);
router.delete("/admin/items/:id", requireAuth, requireRole("ADMIN"), shopController.deleteItem);

router.get("/admin/orders", requireAuth, requireRole("ADMIN"), shopController.getAdminOrders);
router.put("/admin/orders/:id/status", requireAuth, requireRole("ADMIN"), shopController.updateOrderStatus);

module.exports = router;
