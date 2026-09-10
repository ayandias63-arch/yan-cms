const jwt = require("jsonwebtoken");
const User = require("../models/User");

const getUserRole = (user) => user.role || "superadmin";

const protect = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization;

    if (!authorization || !authorization.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Token de autenticación requerido" });
    }

    const token = authorization.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ message: "Usuario no encontrado" });
    }

    user.role = getUserRole(user);
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token inválido o expirado" });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(getUserRole(req.user))) {
    return res.status(403).json({ message: "No tienes permisos para realizar esta acción" });
  }

  next();
};

module.exports = protect;
module.exports.requireRole = requireRole;
module.exports.getUserRole = getUserRole;
