const mongoose = require("mongoose");
const Client = require("../models/Client");
const { getUserRole } = require("../middleware/authMiddleware");

const isSuperadmin = (req) => getUserRole(req.user) === "superadmin";
const ownClientFilter = (req) => (isSuperadmin(req) ? {} : { _id: req.user.clientId });

const handleError = (error, res) => {
  if (error.code === 11000) {
    return res.status(409).json({ message: "El slug ya está registrado" });
  }

  if (error.name === "ValidationError") {
    return res.status(400).json({ message: error.message });
  }

  return res.status(500).json({ message: "Error interno del servidor" });
};

const createClient = async (req, res) => {
  try {
    const client = await Client.create(req.body);
    return res.status(201).json(client);
  } catch (error) {
    return handleError(error, res);
  }
};

const listClients = async (req, res) => {
  try {
    const clients = await Client.find(ownClientFilter(req)).sort({ createdAt: -1 });
    return res.json(clients);
  } catch (error) {
    return handleError(error, res);
  }
};

const getClient = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "ID de cliente inválido" });
    }

    if (!isSuperadmin(req) && String(req.params.id) !== String(req.user.clientId)) {
      return res.status(404).json({ message: "Cliente no encontrado" });
    }

    const client = await Client.findOne({ _id: req.params.id, ...ownClientFilter(req) });

    if (!client) {
      return res.status(404).json({ message: "Cliente no encontrado" });
    }

    return res.json(client);
  } catch (error) {
    return handleError(error, res);
  }
};

const updateClient = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "ID de cliente inválido" });
    }

    if (!isSuperadmin(req) && String(req.params.id) !== String(req.user.clientId)) {
      return res.status(404).json({ message: "Cliente no encontrado" });
    }

    const client = await Client.findOneAndUpdate({ _id: req.params.id, ...ownClientFilter(req) }, req.body, {
      returnDocument: "after",
      runValidators: true
    });

    if (!client) {
      return res.status(404).json({ message: "Cliente no encontrado" });
    }

    return res.json(client);
  } catch (error) {
    return handleError(error, res);
  }
};

const deleteClient = async (req, res) => {
  try {
    if (!isSuperadmin(req)) {
      return res.status(403).json({ message: "Los usuarios cliente no pueden eliminar clientes" });
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "ID de cliente inválido" });
    }

    const client = await Client.findOneAndDelete({ _id: req.params.id, ...ownClientFilter(req) });

    if (!client) {
      return res.status(404).json({ message: "Cliente no encontrado" });
    }

    return res.json({ message: "Cliente eliminado correctamente" });
  } catch (error) {
    return handleError(error, res);
  }
};

module.exports = {
  createClient,
  listClients,
  getClient,
  updateClient,
  deleteClient
};
