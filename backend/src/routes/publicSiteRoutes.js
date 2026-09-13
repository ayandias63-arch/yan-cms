const express = require("express");
const { getPublicSiteContent, getPublicArticles } = require("../controllers/publicSiteController");

const router = express.Router();

router.get("/site-content/:slug", getPublicSiteContent);
router.get("/articles/:slug", getPublicArticles);

module.exports = router;
