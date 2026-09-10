const express = require("express");
const protect = require("../middleware/authMiddleware");
const {
  createArticle,
  listArticles,
  getArticle,
  updateArticle,
  deleteArticle,
  setPublished,
  setDraft
} = require("../controllers/articleController");

const router = express.Router();

router.use(protect);
router.post("/", createArticle);
router.get("/", listArticles);
router.get("/:id", getArticle);
router.put("/:id", updateArticle);
router.patch("/:id/publish", setPublished);
router.patch("/:id/unpublish", setDraft);
router.delete("/:id", deleteArticle);

module.exports = router;
