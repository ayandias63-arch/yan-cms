const Client = require("../models/Client");
const SiteContent = require("../models/SiteContent");
const Article = require("../models/Article");

const getPublicSiteContent = async (req, res) => {
  try {
    const client = await Client.findOne({ slug: req.params.slug, status: "active" }).select("name slug domain logo status");

    if (!client) {
      return res.status(404).json({ message: "Site não encontrado" });
    }

    const content = await SiteContent.findOne({ clientId: client._id }).lean();
    return res.json({
      client,
      content: content || {
        clientId: client._id,
        logo: client.logo || "",
        heroImage: "",
        mainTitle: client.name,
        description: "",
        sectionTexts: [],
        contact: { email: "", phone: "", address: "" },
        whatsapp: "",
        socialLinks: { instagram: "", facebook: "", linkedin: "", youtube: "", twitter: "" },
        services: []
      }
    });
  } catch (error) {
    return res.status(500).json({ message: "Erro interno do servidor" });
  }
};

const getPublicArticles = async (req, res) => {
  try {
    const client = await Client.findOne({ slug: req.params.slug, status: "active" }).select("_id");

    if (!client) {
      return res.status(404).json({ message: "Site não encontrado" });
    }

    const articles = await Article.find({
      clientId: client._id,
      status: "published"
    })
      .select("_id title slug content excerpt image category status createdAt updatedAt")
      .sort({ createdAt: -1 })
      .lean();

    return res.json(articles);
  } catch (error) {
    return res.status(500).json({ message: "Erro interno do servidor" });
  }
};

module.exports = { getPublicSiteContent, getPublicArticles };
