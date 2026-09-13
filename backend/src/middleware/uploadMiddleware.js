const fs = require("fs");
const path = require("path");
const multer = require("multer");
const mongoose = require("mongoose");

const uploadsRoot = path.join(__dirname, "../../uploads");
const allowedFields = new Set(["logo", "heroImage"]);
const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const articleExtensions = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif" };

const storage = multer.memoryStorage();

const uploadImage = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    if (!allowedFields.has(req.params.field)) {
      return callback(new Error("Campo de imagen inválido"));
    }
    if (!allowedMimeTypes.has(file.mimetype)) {
      return callback(new Error("Solo se permiten imágenes JPG, PNG, WEBP o GIF"));
    }
    callback(null, true);
  }
});

const articleStorage = multer.memoryStorage();

const uploadArticleImage = multer({
  storage: articleStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return callback(new Error("Solo se permiten imágenes JPG, PNG, WEBP o GIF"));
    }
    callback(null, true);
  }
});

const isValidUploadClientId = (req, res, next) => {
  const clientId = req.params.clientId || req.user.clientId;
  if (!mongoose.isValidObjectId(clientId)) {
    return res.status(400).json({ message: "clientId inválido" });
  }
  next();
};

const isValidImageField = (req, res, next) => {
  if (!allowedFields.has(req.params.field)) {
    return res.status(400).json({ message: "Campo de imagen inválido" });
  }
  next();
};

const hasValidImageSignature = (file) => {
  if (!file?.buffer) return false;
  const buffer = file.buffer;
  if (file.mimetype === "image/jpeg") return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (file.mimetype === "image/png") return buffer.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"));
  if (file.mimetype === "image/gif") return buffer.subarray(0, 4).toString("ascii") === "GIF8";
  if (file.mimetype === "image/webp") return buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  return false;
};

const validateImageBuffer = (req, res, next) => {
  if (!hasValidImageSignature(req.file)) {
    return res.status(400).json({ message: "El contenido del archivo no coincide con una imagen válida" });
  }
  next();
};

module.exports = { uploadImage, uploadArticleImage, isValidUploadClientId, isValidImageField, validateImageBuffer, uploadsRoot, articleExtensions };
