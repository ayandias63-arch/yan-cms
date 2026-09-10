const express = require("express");
const { register, login, me, createClientUser } = require("../controllers/authController");
const protect = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, me);
router.post("/client-users", protect, requireRole("superadmin"), createClientUser);

module.exports = router;
