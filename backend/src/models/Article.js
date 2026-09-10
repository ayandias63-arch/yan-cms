const mongoose = require("mongoose");

const articleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/
    },
    content: {
      type: String,
      required: true
    },
    excerpt: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500
    },
    image: {
      type: String,
      default: "",
      trim: true
    },
    category: {
      type: String,
      default: "",
      trim: true,
      maxlength: 80
    },
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft"
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Article", articleSchema);
