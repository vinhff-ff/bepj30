const router = require("express").Router();
const groupController = require("../controllers/group.controller");
const { requireAuth } = require("../middlewares/auth");

// Tất cả thao tác nhóm đều cần đăng nhập
router.use(requireAuth);

// Nhóm của chính mình, tạo nhóm mới, rời nhóm
router.get("/my", groupController.getMyGroup);
router.post("/", groupController.createGroup);
router.post("/leave", groupController.leaveGroup);

// Tìm bạn để mời vào nhóm
router.get("/friends/search", groupController.searchFriends);

// Lời mời nhận được: hiện trên trang bạn bè
router.get("/invitations/received", groupController.listReceivedInvitations);
router.get("/invitations/sent", groupController.listSentInvitations);
router.patch("/invitations/:id", groupController.respondToInvitation);

// Mời thêm thành viên vào nhóm mình làm chủ
router.post("/:id/invitations", groupController.inviteToGroup);

module.exports = router;
