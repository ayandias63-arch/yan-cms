const express = require("express");
const protect = require("../middleware/authMiddleware");
const { uploadArticleImage, validateImageBuffer } = require("../middleware/uploadMiddleware");
const {
  createArticle,
  listArticles,
  getArticle,
  updateArticle,
  deleteArticle,
  setPublished,
  setDraft,
  loadArticleForImage,
  uploadArticleImage: saveArticleImage,
  deleteArticleImage
} = require("../controllers/articleController");

const router = express.Router();

router.use(protect);
router.post("/", createArticle);
router.get("/", listArticles);
router.get("/:id", getArticle);
router.put("/:id", updateArticle);
router.post("/:id/image", loadArticleForImage, uploadArticleImage.single("image"), validateImageBuffer, saveArticleImage);
router.delete("/:id/image", loadArticleForImage, deleteArticleImage);
router.patch("/:id/publish", setPublished);
router.patch("/:id/unpublish", setDraft);
router.delete("/:id", deleteArticle);

module.exports = router;
