const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Client = require("../models/Client");
const SiteContent = require("../models/SiteContent");
const { uploadsRoot } = require("../middleware/uploadMiddleware");
const { getUserRole } = require("../middleware/authMiddleware");
const { uploadImage, deleteOwnedFile, deleteFileByReference, isGridFsReference } = require("../services/gridfsService");

const getTargetClientId = (req) => getUserRole(req.user) === "superadmin" ? req.params.clientId : req.user.clientId;

const removeStoredImage = (imageUrl, clientId) => {
  if (!imageUrl || !imageUrl.startsWith("/uploads/")) return;

  const relativePath = imageUrl.slice("/uploads/".length);
  const [storedClientId] = relativePath.split("/");
  if (String(storedClientId) !== String(clientId)) return;

  const filePath = path.resolve(uploadsRoot, relativePath);
  if (filePath.startsWith(path.resolve(uploadsRoot) + path.sep)) {
    fs.unlink(filePath, () => {});
  }
};

const uploadSiteImage = async (req, res) => {
  try {
    const clientId = getTargetClientId(req);
    if (!mongoose.isValidObjectId(clientId)) {
      removeUploadedFile(req.file);
      return res.status(400).json({ message: "clientId inválido" });
    }

    if (getUserRole(req.user) !== "superadmin" && String(clientId) !== String(req.user.clientId)) {
      removeUploadedFile(req.file);
      return res.status(403).json({ message: "No puedes subir imágenes para otro cliente" });
    }

    if (!(await Client.exists({ _id: clientId }))) {
      removeUploadedFile(req.file);
      return res.status(404).json({ message: "Cliente no encontrado" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Debes seleccionar una imagen" });
    }

    const imageUrl = await uploadImage({
      buffer: req.file.buffer,
      filename: req.file.originalname,
      contentType: req.file.mimetype,
      clientId,
      kind: req.params.field
    });
    const previousContent = await SiteContent.findOne({ clientId }).select(req.params.field).lean();
    let content;
    try {
      content = await SiteContent.findOneAndUpdate(
        { clientId },
        { clientId, [req.params.field]: imageUrl },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    } catch (error) {
      await deleteFileByReference(imageUrl);
      throw error;
    }

    const previousImage = previousContent?.[req.params.field];
    if (isGridFsReference(previousImage)) await deleteOwnedFile(previousImage, clientId);
    else removeStoredImage(previousImage, clientId);

    return res.json({ field: req.params.field, url: imageUrl, content });
  } catch (error) {
    removeUploadedFile(req.file);
    return res.status(400).json({ message: error.message || "No se pudo subir la imagen" });
  }
};

const deleteSiteImage = async (req, res) => {
  try {
    const clientId = getTargetClientId(req);
    if (!mongoose.isValidObjectId(clientId)) {
      return res.status(400).json({ message: "clientId inválido" });
    }

    if (getUserRole(req.user) !== "superadmin" && String(clientId) !== String(req.user.clientId)) {
      return res.status(403).json({ message: "No puedes eliminar imágenes de otro cliente" });
    }

    if (!(await Client.exists({ _id: clientId }))) {
      return res.status(404).json({ message: "Cliente no encontrado" });
    }

    const content = await SiteContent.findOne({ clientId });
    if (!content) return res.json({ field: req.params.field, url: "" });

    const previousImage = content[req.params.field];
    content[req.params.field] = "";
    await content.save();
    if (isGridFsReference(previousImage)) await deleteOwnedFile(previousImage, clientId);
    else removeStoredImage(previousImage, clientId);

    return res.json({ field: req.params.field, url: "", content });
  } catch (error) {
    return res.status(400).json({ message: error.message || "No se pudo eliminar la imagen" });
  }
};

const removeUploadedFile = (file) => {
  if (file?.path) fs.unlink(file.path, () => {});
};

module.exports = { uploadSiteImage, deleteSiteImage };
