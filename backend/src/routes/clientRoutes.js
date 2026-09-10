const express = require("express");
const protect = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/authMiddleware");
const {
  createClient,
  listClients,
  getClient,
  updateClient,
  deleteClient
} = require("../controllers/clientController");

const router = express.Router();

router.use(protect);
router.post("/", requireRole("superadmin"), createClient);
router.get("/", listClients);
router.get("/:id", getClient);
router.put("/:id", updateClient);
router.delete("/:id", requireRole("superadmin"), deleteClient);

module.exports = router;
