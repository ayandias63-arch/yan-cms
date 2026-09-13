require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Article = require("../src/models/Article");
const SiteContent = require("../src/models/SiteContent");
const { uploadImage, isGridFsReference } = require("../src/services/gridfsService");
const { uploadsRoot } = require("../src/middleware/uploadMiddleware");

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const detectMimeType = (buffer) => {
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"))) return "image/png";
  if (buffer.subarray(0, 4).toString("ascii") === "GIF8") return "image/gif";
  if (buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  return null;
};

const localFileForReference = (reference) => {
  if (typeof reference !== "string" || !reference.startsWith("/uploads/")) return null;
  const filePath = path.resolve(uploadsRoot, reference.slice("/uploads/".length));
  const root = `${path.resolve(uploadsRoot)}${path.sep}`;
  return filePath.startsWith(root) ? filePath : null;
};

const migrateReference = async (reference, clientId, kind) => {
  if (!localFileForReference(reference) || isGridFsReference(reference)) return reference;
  const filePath = localFileForReference(reference);
  if (!fs.existsSync(filePath)) {
    console.warn(`No existe, se conserva la referencia: ${reference}`);
    return reference;
  }

  const buffer = fs.readFileSync(filePath);
  const contentType = detectMimeType(buffer);
  if (!allowedMimeTypes.has(contentType) || buffer.length > 5 * 1024 * 1024) {
    console.warn(`Archivo no válido, se conserva la referencia: ${reference}`);
    return reference;
  }

  const migratedReference = await uploadImage({
    buffer,
    filename: path.basename(filePath),
    contentType,
    clientId,
    kind
  });
  console.log(`${reference} -> ${migratedReference}`);
  return migratedReference;
};

const migrate = async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  const siteContents = await SiteContent.find({ $or: [{ logo: /^\/uploads\// }, { heroImage: /^\/uploads\// }] });
  for (const content of siteContents) {
    const logo = await migrateReference(content.logo, content.clientId, "logo");
    const heroImage = await migrateReference(content.heroImage, content.clientId, "heroImage");
    if (logo !== content.logo || heroImage !== content.heroImage) {
      content.logo = logo;
      content.heroImage = heroImage;
      await content.save();
    }
  }

  const articles = await Article.find({ image: /^\/uploads\// });
  for (const article of articles) {
    const image = await migrateReference(article.image, article.clientId, "article");
    if (image !== article.image) {
      article.image = image;
      await article.save();
    }
  }
};

migrate()
  .then(async () => {
    await mongoose.disconnect();
    console.log("Migración terminada. No se eliminaron archivos de /uploads.");
  })
  .catch(async (error) => {
    console.error("Migración no completada:", error.message);
    await mongoose.disconnect();
    process.exitCode = 1;
  });