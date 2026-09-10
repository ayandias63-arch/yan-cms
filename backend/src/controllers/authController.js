const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");
const Client = require("../models/Client");

const getUserRole = (user) => user.role || "superadmin";

const createToken = (user) => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET no está configurado");
  }

  return jwt.sign({
    userId: user._id.toString(),
    role: getUserRole(user),
    clientId: user.clientId ? user.clientId.toString() : null
  }, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d"
  });
};

const userResponse = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: getUserRole(user),
  clientId: user.clientId || null,
  createdAt: user.createdAt
});

const register = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "name, email y password son obligatorios" });
  }

  if (await User.exists({})) {
    return res.status(403).json({ message: "El registro público está cerrado" });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    return res.status(409).json({ message: "El email ya está registrado" });
  }

  const user = await User.create({
    name: String(name).trim(),
    email: normalizedEmail,
    password: String(password)
  });

  return res.status(201).json({
    message: "Usuario registrado correctamente",
    token: createToken(user),
    user: userResponse(user)
  });
};

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "email y password son obligatorios" });
  }

  const user = await User.findOne({ email: String(email).trim().toLowerCase() }).select("+password");
  const isPasswordValid = user && await user.comparePassword(String(password));

  if (!isPasswordValid) {
    return res.status(401).json({ message: "Email o password incorrectos" });
  }

  return res.json({
    message: "Login correcto",
    token: createToken(user),
    user: userResponse(user)
  });
};

const me = (req, res) => {
  res.json({ user: userResponse(req.user) });
};

const createClientUser = async (req, res) => {
  const { name, email, password, clientId } = req.body;

  if (!name || !email || !password || !clientId) {
    return res.status(400).json({ message: "name, email, password y clientId son obligatorios" });
  }

  if (!mongoose.isValidObjectId(clientId)) {
    return res.status(400).json({ message: "clientId inválido" });
  }

  const client = await Client.findById(clientId);
  if (!client) {
    return res.status(404).json({ message: "Cliente no encontrado" });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    return res.status(409).json({ message: "El email ya está registrado" });
  }

  const user = await User.create({
    name: String(name).trim(),
    email: normalizedEmail,
    password: String(password),
    role: "client",
    clientId
  });

  return res.status(201).json({
    message: "Usuario cliente creado correctamente",
    user: userResponse(user)
  });
};

module.exports = { register, login, me, createClientUser };
