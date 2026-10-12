const router = require("express").Router();
const authRoutes = require("./auth.routes");
const userRoutes = require("./user.routes");
const journalImageRoutes = require("./journalImage.routes");
const groupRoutes = require("./group.routes");
const roomRoutes = require("./room.routes");
const lessonRoutes = require("./lesson.routes");
const inventoryRoutes = require("./inventory.routes");
const labRoutes = require("./lab.routes");
const levelRoutes = require("./level.routes");
const articleRoutes = require("./article.routes");
const dailyRewardRoutes = require("./dailyReward.routes");
const shopRoutes = require("./shop.routes");
const socialPageRoutes = require("./socialPage.routes");
const { sendSuccess } = require("../utils/response");

// Route kiểm tra tình trạng API, không cần token
router.get("/health", function health(req, res) {
  return sendSuccess(res, { status: "ok", timestamp: new Date().toISOString() }, "API đang hoạt động");
});

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/journal-images", journalImageRoutes);
router.use("/groups", groupRoutes);
router.use("/rooms", roomRoutes);
router.use("/lessons", lessonRoutes);
router.use("/inventory", inventoryRoutes);
router.use("/lab", labRoutes);
router.use("/levels", levelRoutes);
router.use("/articles", articleRoutes);
router.use("/daily-rewards", dailyRewardRoutes);
router.use("/shop", shopRoutes);
router.use("/social-page", socialPageRoutes);

module.exports = router;

