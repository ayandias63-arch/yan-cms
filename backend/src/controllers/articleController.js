const mongoose = require("mongoose");
const Article = require("../models/Article");
const Client = require("../models/Client");
const fs = require("fs");
const path = require("path");
const { getUserRole } = require("../middleware/authMiddleware");
const { uploadsRoot } = require("../middleware/uploadMiddleware");

const handleError = (error, res) => {
  if (error.code === 11000) {
    return res.status(409).json({ message: "El slug ya está registrado" });
  }

  if (error.name === "ValidationError") {
    return res.status(400).json({ message: error.message });
  }

  return res.status(500).json({ message: "Error interno del servidor" });
};

const isValidId = (id) => mongoose.isValidObjectId(id);
const isSuperadmin = (req) => getUserRole(req.user) === "superadmin";
const getOwnClientId = (req) => req.user && req.user.clientId ? req.user.clientId.toString() : null;
const articleScope = (req) => (isSuperadmin(req) ? {} : { clientId: getOwnClientId(req) });

const removeStoredArticleImage = (imageUrl) => {
  if (!imageUrl || !imageUrl.startsWith("/uploads/")) return;
  const relativePath = imageUrl.slice("/uploads/".length);
  if (!relativePath.match(/^[^/]+\/articles\/[^/]+$/)) return;
  const filePath = path.resolve(uploadsRoot, relativePath);
  if (filePath.startsWith(path.resolve(uploadsRoot) + path.sep)) fs.unlink(filePath, () => {});
};

const loadArticleForImage = async (req, res, next) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ message: "ID de artículo inválido" });
  const article = await Article.findOne({ _id: req.params.id, ...articleScope(req) });
  if (!article) return res.status(404).json({ message: "Artículo no encontrado" });
  req.article = article;
  next();
};

const clientExists = async (clientId) => {
  return Client.exists({ _id: clientId });
};

const createArticle = async (req, res) => {
  try {
    const requestedClientId = req.body.clientId;
    const clientId = isSuperadmin(req) ? requestedClientId : getOwnClientId(req);

    if (!isSuperadmin(req) && requestedClientId && String(requestedClientId) !== clientId) {
      return res.status(403).json({ message: "No puedes crear contenido para otro cliente" });
    }

    if (!isValidId(clientId)) {
      return res.status(400).json({ message: "clientId inválido" });
    }

    if (!(await clientExists(clientId))) {
      return res.status(404).json({ message: "Cliente no encontrado" });
    }

    const articleData = { ...req.body };
    delete articleData.image;
    const article = await Article.create({ ...articleData, clientId });
    return res.status(201).json(article);
  } catch (error) {
    return handleError(error, res);
  }
};

const listArticles = async (req, res) => {
  try {
    if (req.query.clientId && !isValidId(req.query.clientId)) {
      return res.status(400).json({ message: "clientId inválido" });
    }

    if (!isSuperadmin(req) && req.query.clientId && req.query.clientId !== getOwnClientId(req)) {
      return res.status(403).json({ message: "No puedes consultar contenido de otro cliente" });
    }

    const filter = req.query.clientId ? { clientId: req.query.clientId } : articleScope(req);
    const articles = await Article.find(filter).sort({ createdAt: -1 });
    return res.json(articles);
  } catch (error) {
    return handleError(error, res);
  }
};

const getArticle = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "ID de artículo inválido" });
    }

    const article = await Article.findOne({ _id: req.params.id, ...articleScope(req) });

    if (!article) {
      return res.status(404).json({ message: "Artículo no encontrado" });
    }

    return res.json(article);
  } catch (error) {
    return handleError(error, res);
  }
};

const updateArticle = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "ID de artículo inválido" });
    }

    if (req.body.clientId && !isSuperadmin(req) && String(req.body.clientId) !== getOwnClientId(req)) {
      return res.status(403).json({ message: "No puedes mover contenido a otro cliente" });
    }

    if (req.body.clientId && isSuperadmin(req)) {
      if (!isValidId(req.body.clientId)) {
        return res.status(400).json({ message: "clientId inválido" });
      }

      if (!(await clientExists(req.body.clientId))) {
        return res.status(404).json({ message: "Cliente no encontrado" });
      }
    }

    const currentArticle = await Article.findOne({ _id: req.params.id, ...articleScope(req) });
    if (!currentArticle) {
      return res.status(404).json({ message: "Artículo no encontrado" });
    }

    const bodyData = { ...req.body };
    delete bodyData.image;
    const updateData = isSuperadmin(req) ? bodyData : { ...bodyData, clientId: currentArticle.clientId };
    const article = await Article.findByIdAndUpdate(req.params.id, updateData, {
      returnDocument: "after",
      runValidators: true
    });

    if (!article) {
      return res.status(404).json({ message: "Artículo no encontrado" });
    }

    return res.json(article);
  } catch (error) {
    return handleError(error, res);
  }
};

const deleteArticle = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "ID de artículo inválido" });
    }

    const article = await Article.findOneAndDelete({ _id: req.params.id, ...articleScope(req) });

    if (!article) {
      return res.status(404).json({ message: "Artículo no encontrado" });
    }

    removeStoredArticleImage(article.image);
    return res.json({ message: "Artículo eliminado correctamente" });
  } catch (error) {
    return handleError(error, res);
  }
};

const setPublished = async (req, res) => {
  return updateStatus(req, res, "published");
};

const setDraft = async (req, res) => {
  return updateStatus(req, res, "draft");
};

const updateStatus = async (req, res, status) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "ID de artículo inválido" });
    }

    const article = await Article.findOneAndUpdate(
      { _id: req.params.id, ...articleScope(req) },
      { status },
      { returnDocument: "after", runValidators: true }
    );

    if (!article) {
      return res.status(404).json({ message: "Artículo no encontrado" });
    }

    return res.json(article);
  } catch (error) {
    return handleError(error, res);
  }
};

const uploadArticleImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Debes seleccionar una imagen" });
    const imageUrl = `/uploads/${req.article.clientId}/articles/${req.file.filename}`;
    const previousImage = req.article.image;
    req.article.image = imageUrl;
    await req.article.save();
    removeStoredArticleImage(previousImage);
    return res.json(req.article);
  } catch (error) {
    if (req.file) fs.unlink(req.file.path, () => {});
    return handleError(error, res);
  }
};

const deleteArticleImage = async (req, res) => {
  try {
    const previousImage = req.article.image;
    req.article.image = "";
    await req.article.save();
    removeStoredArticleImage(previousImage);
    return res.json(req.article);
  } catch (error) {
    return handleError(error, res);
  }
};

module.exports = {
  createArticle,
  listArticles,
  getArticle,
  updateArticle,
  deleteArticle,
  setPublished,
  setDraft,
  loadArticleForImage,
  uploadArticleImage,
  deleteArticleImage
};
