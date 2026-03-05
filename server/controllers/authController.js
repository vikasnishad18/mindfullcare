const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { createUser, findByEmail } = require("../models/userModel");

function signToken(user) {
  const secret = process.env.JWT_SECRET || "dev_secret";
  return jwt.sign(
    { email: user.email, name: user.name, role: user.role || "user" },
    secret,
    { subject: String(user.id), expiresIn: "7d" }
  );
}

async function register(req, res, next) {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ error: "missing_fields" });
    }

    const existing = await findByEmail(String(email));
    if (existing) return res.status(409).json({ error: "email_in_use" });

    const passwordHash = await bcrypt.hash(String(password), 10);
    const user = await createUser({
      name: String(name),
      email: String(email),
      passwordHash,
    });
    const token = signToken(user);

    return res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role || "user" },
    });
  } catch (err) {
    return next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "missing_fields" });
    }

    const user = await findByEmail(String(email));
    if (!user) return res.status(401).json({ error: "invalid_credentials" });

    const ok = await bcrypt.compare(String(password), String(user.password_hash));
    if (!ok) return res.status(401).json({ error: "invalid_credentials" });

    const token = signToken({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role || "user",
    });
    return res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role || "user" },
    });
  } catch (err) {
    return next(err);
  }
}

async function adminLogin(req, res, next) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "missing_fields" });
    }

    const user = await findByEmail(String(email));
    if (!user) return res.status(401).json({ error: "invalid_credentials" });

    const ok = await bcrypt.compare(String(password), String(user.password_hash));
    if (!ok) return res.status(401).json({ error: "invalid_credentials" });

    if ((user.role || "user") !== "admin") {
      return res.status(401).json({ error: "invalid_credentials" });
    }

    const token = signToken({
      id: user.id,
      name: user.name,
      email: user.email,
      role: "admin",
    });

    return res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: "admin" },
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { register, login, adminLogin };
