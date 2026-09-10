const Client = require("../models/Client");
const SiteContent = require("../models/SiteContent");

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

module.exports = { getPublicSiteContent };
