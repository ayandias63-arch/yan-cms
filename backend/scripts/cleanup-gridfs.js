require("dotenv").config();
const readline = require("readline");
const mongoose = require("mongoose");
const { getBucket, getFileReferences } = require("../src/services/gridfsService");

const isDryRun = process.argv.slice(2).includes("--dry-run");

const askForConfirmation = () => new Promise((resolve) => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question("¿Eliminar estos archivos huérfanos de GridFS? Escribe 'yes' para confirmar: ", (answer) => {
    rl.close();
    resolve(answer.trim().toLowerCase() === "yes");
  });
});

const formatFile = (file) => `${file._id.toString()} (${file.filename || "sin nombre"})`;

const cleanup = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const files = await getBucket().find({}).toArray();
  const orphanedFiles = [];
  let usedFiles = 0;

  for (const file of files) {
    const reference = `/api/media/${file._id.toString()}`;
    const references = await getFileReferences(reference);
    const referenceCount = references.siteContent.length + references.articles.length;
    if (referenceCount > 0) usedFiles += 1;
    else orphanedFiles.push(file);
  }

  console.log(`Archivos GridFS existentes: ${files.length}`);
  console.log(`Archivos utilizados: ${usedFiles}`);
  console.log(`Archivos huérfanos: ${orphanedFiles.length}`);
  if (orphanedFiles.length > 0) {
    console.log("Lista de archivos huérfanos:");
    orphanedFiles.forEach((file) => console.log(`- ${formatFile(file)}`));
  }

  if (isDryRun) {
    console.log("Dry-run: no se eliminó ningún archivo.");
    return;
  }

  if (orphanedFiles.length === 0) return;
  if (!(await askForConfirmation())) {
    console.log("Limpieza cancelada. No se eliminó ningún archivo.");
    return;
  }

  let deletedFiles = 0;
  for (const file of orphanedFiles) {
    const reference = `/api/media/${file._id.toString()}`;
    const references = await getFileReferences(reference);
    if (references.siteContent.length > 0 || references.articles.length > 0) {
      console.log(`Se conserva ${formatFile(file)} porque ahora está referenciado.`);
      continue;
    }
    await getBucket().delete(file._id);
    deletedFiles += 1;
  }
  console.log(`Archivos eliminados: ${deletedFiles}`);
};

cleanup()
  .catch((error) => {
    console.error(`Limpieza no completada: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  });