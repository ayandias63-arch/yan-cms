const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/database");
const authRoutes = require("./routes/authRoutes");
const clientRoutes = require("./routes/clientRoutes");
const articleRoutes = require("./routes/articleRoutes");
const siteContentRoutes = require("./routes/siteContentRoutes");
const publicSiteRoutes = require("./routes/publicSiteRoutes");
const imageRoutes = require("./routes/imageRoutes");
const { getMedia } = require("./controllers/mediaController");

const app = express();

const PORT = process.env.PORT || 5000;
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Origen no permitido por CORS"));
  }
};

// Middlewares
app.use(cors(corsOptions));
app.use(express.json());
app.use("/uploads", express.static(require("path").join(__dirname, "../uploads")));
app.use("/api/auth", authRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/articles", articleRoutes);
app.use("/api/site-content", siteContentRoutes);
app.use("/api/public", publicSiteRoutes);
app.use("/api/site-images", imageRoutes);
app.get("/api/media/:fileId", getMedia);

// Ruta de prueba
app.get("/", (req, res) => {
  res.json({
    message: "Yan CMS API funcionando correctamente 🚀"
  });
});

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("No se pudo iniciar el servidor:", error.message);
    process.exit(1);
  }
};

startServer();