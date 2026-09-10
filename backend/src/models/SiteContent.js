const mongoose = require("mongoose");

const siteContentSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
      unique: true,
      index: true
    },
    logo: { type: String, default: "", trim: true },
    heroImage: { type: String, default: "", trim: true },
    mainTitle: { type: String, default: "", trim: true, maxlength: 200 },
    description: { type: String, default: "", trim: true, maxlength: 1000 },
    sectionTexts: { type: [String], default: [] },
    contact: {
      email: { type: String, default: "", trim: true },
      phone: { type: String, default: "", trim: true },
      address: { type: String, default: "", trim: true }
    },
    whatsapp: { type: String, default: "", trim: true },
    socialLinks: {
      instagram: { type: String, default: "", trim: true },
      facebook: { type: String, default: "", trim: true },
      linkedin: { type: String, default: "", trim: true },
      youtube: { type: String, default: "", trim: true },
      twitter: { type: String, default: "", trim: true }
    },
    services: { type: [String], default: [] }
  },
  { timestamps: true }
);

module.exports = mongoose.model("SiteContent", siteContentSchema);
