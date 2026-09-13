const express = require("express");
const protect = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/authMiddleware");
const { uploadImage, isValidUploadClientId, isValidImageField, validateImageBuffer } = require("../middleware/uploadMiddleware");
const { uploadSiteImage, deleteSiteImage } = require("../controllers/imageController");

const router = express.Router();

router.post("/:field", protect, isValidUploadClientId, uploadImage.single("image"), validateImageBuffer, uploadSiteImage);
router.post("/:clientId/:field", protect, requireRole("superadmin"), isValidUploadClientId, uploadImage.single("image"), validateImageBuffer, uploadSiteImage);
router.delete("/:field", protect, isValidImageField, isValidUploadClientId, deleteSiteImage);
router.delete("/:clientId/:field", protect, requireRole("superadmin"), isValidImageField, isValidUploadClientId, deleteSiteImage);

module.exports = router;
