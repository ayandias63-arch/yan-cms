const mongoose = require("mongoose");
const { GridFSBucket, ObjectId } = require("mongodb");
const SiteContent = require("../models/SiteContent");
const Article = require("../models/Article");

const bucketName = "yanCMS";

const getBucket = () => {
  if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
    throw new Error("MongoDB no está conectado");
  }

  return new GridFSBucket(mongoose.connection.db, { bucketName });
};

const isGridFsReference = (value) => typeof value === "string" && /^\/api\/media\/[a-f\d]{24}$/i.test(value);

const getFileId = (reference) => {
  if (!isGridFsReference(reference)) return null;
  return new ObjectId(reference.split("/").pop());
};

const getFileReferences = async (reference) => {
  const fileId = getFileId(reference);
  if (!fileId) return { siteContent: [], articles: [] };

  const [siteContent, articles] = await Promise.all([
    SiteContent.find({ $or: [{ logo: reference }, { heroImage: reference }] })
      .select("_id clientId logo heroImage")
      .lean(),
    Article.find({ image: reference }).select("_id clientId image").lean()
  ]);

  return {
    siteContent: siteContent.filter((content) => content.logo === reference || content.heroImage === reference),
    articles
  };
};

const isFileReferenced = async (reference) => {
  const references = await getFileReferences(reference);
  return references.siteContent.length > 0 || references.articles.length > 0;
};

const uploadImage = ({ buffer, filename, contentType, clientId, kind }) => new Promise((resolve, reject) => {
  const bucket = getBucket();
  const fileId = new ObjectId();
  const uploadStream = bucket.openUploadStreamWithId(fileId, filename, {
    contentType,
    metadata: { clientId: new ObjectId(clientId), kind }
  });

  uploadStream.on("error", reject);
  uploadStream.on("finish", () => resolve(`/api/media/${fileId.toString()}`));
  uploadStream.end(buffer);
});

const findOwnedFile = async (reference, clientId) => {
  const fileId = getFileId(reference);
  if (!fileId) return null;

  return getBucket().find({
    _id: fileId,
    "metadata.clientId": new ObjectId(clientId)
  }).next();
};

const deleteOwnedFile = async (reference, clientId) => {
  const file = await findOwnedFile(reference, clientId);
  if (!file) return false;
  if (await isFileReferenced(reference)) return false;

  await getBucket().delete(file._id);
  return true;
};

const deleteFileByReference = async (reference) => {
  const fileId = getFileId(reference);
  if (!fileId) return false;
  if (await isFileReferenced(reference)) return false;
  try {
    await getBucket().delete(fileId);
    return true;
  } catch (error) {
    if (error.code === 260) return false;
    throw error;
  }
};

const getPublicFile = async (reference) => {
  const fileId = getFileId(reference);
  if (!fileId) return null;
  return getBucket().find({ _id: fileId }).next();
};

const openDownloadStream = (fileId) => getBucket().openDownloadStream(fileId);

module.exports = {
  bucketName,
  getBucket,
  isGridFsReference,
  getFileId,
  getFileReferences,
  isFileReferenced,
  uploadImage,
  findOwnedFile,
  deleteOwnedFile,
  deleteFileByReference,
  getPublicFile,
  openDownloadStream
};