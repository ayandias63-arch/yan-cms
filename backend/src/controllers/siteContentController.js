const mongoose = require("mongoose");
const SiteContent = require("../models/SiteContent");
const Client = require("../models/Client");
const { getUserRole } = require("../middleware/authMiddleware");
const { deleteOwnedFile, isGridFsReference } = require("../services/gridfsService");

const isSuperadmin = (req) => getUserRole(req.user) === "superadmin";

const getScopedClientId = (req) => {
  if (isSuperadmin(req)) return req.params.clientId;
  return req.user.clientId;
};

const normalizeContent = (body, clientId) => ({
  clientId,
  logo: body.logo || "",
  heroImage: body.heroImage || "",
  mainTitle: body.mainTitle || "",
  description: body.description || "",
  sectionTexts: Array.isArray(body.sectionTexts) ? body.sectionTexts : [],
  contact: {
    email: body.contact?.email || "",
    phone: body.contact?.phone || "",
    address: body.contact?.address || ""
  },
  whatsapp: body.whatsapp || "",
  socialLinks: {
    instagram: body.socialLinks?.instagram || "",
    facebook: body.socialLinks?.facebook || "",
    linkedin: body.socialLinks?.linkedin || "",
    youtube: body.socialLinks?.youtube || "",
    twitter: body.socialLinks?.twitter || ""
  },
  services: Array.isArray(body.services) ? body.services : []
});

const validateClientScope = async (req, res) => {
  const clientId = getScopedClientId(req);

  if (!mongoose.isValidObjectId(clientId)) {
    res.status(400).json({ message: "clientId inválido" });
    return null;
  }

  if (!isSuperadmin(req) && String(clientId) !== String(req.user.clientId)) {
    res.status(404).json({ message: "Contenido del sitio no encontrado" });
    return null;
  }

  if (!(await Client.exists({ _id: clientId }))) {
    res.status(404).json({ message: "Cliente no encontrado" });
    return null;
  }

  return clientId;
};

const getSiteContent = async (req, res) => {
  try {
    const clientId = await validateClientScope(req, res);
    if (!clientId) return;

    const content = await SiteContent.findOne({ clientId });
    return res.json(content || normalizeContent({}, clientId));
  } catch (error) {
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

const updateSiteContent = async (req, res) => {
  try {
    const clientId = await validateClientScope(req, res);
    if (!clientId) return;

    const previousContent = await SiteContent.findOne({ clientId }).select("logo heroImage").lean();
    const content = await SiteContent.findOneAndUpdate(
      { clientId },
      normalizeContent(req.body, clientId),
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    );

    const previousImages = previousContent ? [previousContent.logo, previousContent.heroImage] : [];
    const currentImages = [content.logo, content.heroImage];
    for (const previousImage of previousImages) {
      if (isGridFsReference(previousImage) && !currentImages.includes(previousImage)) {
        await deleteOwnedFile(previousImage, clientId);
      }
    }

    return res.json(content);
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

module.exports = { getSiteContent, updateSiteContent };
