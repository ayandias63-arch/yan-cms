const fs = require("fs");
const path = require("path");
const multer = require("multer");
const mongoose = require("mongoose");

const uploadsRoot = path.join(__dirname, "../../uploads");
const allowedFields = new Set(["logo", "heroImage"]);
const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    const clientId = req.params.clientId || req.user.clientId;
    const destination = path.join(uploadsRoot, String(clientId));
    fs.mkdirSync(destination, { recursive: true });
    callback(null, destination);
  },
  filename: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, `${req.params.field}-${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`);
  }
});

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

module.exports = { uploadImage, isValidUploadClientId, isValidImageField, uploadsRoot };
