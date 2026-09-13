const Client = require("../models/Client");
const { getPublicFile, getFileId, openDownloadStream } = require("../services/gridfsService");

const getMedia = async (req, res) => {
  try {
    const file = await getPublicFile(`/api/media/${req.params.fileId}`);
    if (!file || !file.metadata?.clientId) return res.status(404).end();

    const client = await Client.exists({ _id: file.metadata.clientId, status: "active" });
    if (!client) return res.status(404).end();

    res.set({
      "Content-Type": file.contentType || "application/octet-stream",
      "Content-Length": file.length,
      "Cache-Control": "public, max-age=31536000, immutable"
    });
    return openDownloadStream(getFileId(`/api/media/${req.params.fileId}`)).pipe(res);
  } catch (error) {
    return res.status(404).end();
  }
};

module.exports = { getMedia };