const express = require("express");
const { getPublicSiteContent } = require("../controllers/publicSiteController");

const router = express.Router();

router.get("/site-content/:slug", getPublicSiteContent);

module.exports = router;
