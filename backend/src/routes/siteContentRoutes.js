const express = require("express");
const protect = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/authMiddleware");
const { getSiteContent, updateSiteContent } = require("../controllers/siteContentController");

const router = express.Router();

router.use(protect);
router.get("/", getSiteContent);
router.put("/", updateSiteContent);
router.get("/:clientId", requireRole("superadmin"), getSiteContent);
router.put("/:clientId", requireRole("superadmin"), updateSiteContent);

module.exports = router;
