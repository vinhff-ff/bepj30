const router = require("express").Router();
const journalImageController = require("../controllers/journalImage.controller");
const { requireAuth } = require("../middlewares/auth");

router.get("/", requireAuth, journalImageController.listImages);
router.post("/", requireAuth, journalImageController.createImage);
router.get("/:id", requireAuth, journalImageController.getImage);
router.put("/:id", requireAuth, journalImageController.updateImage);
router.delete("/:id", requireAuth, journalImageController.deleteImage);

module.exports = router;
