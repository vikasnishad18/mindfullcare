const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { createUser, findByEmail } = require("../models/userModel");
const { getProvider, query } = require("../config/db");

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
    const provider = getProvider();
    if (provider === "postgres" || provider === "supabase") {
      return res.status(410).json({ error: "use_supabase_auth" });
    }

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
    const provider = getProvider();
    if (provider === "postgres" || provider === "supabase") {
      return res.status(410).json({ error: "use_supabase_auth" });
    }

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
    const provider = getProvider();
    if (provider === "postgres" || provider === "supabase") {
      return res.status(410).json({ error: "use_supabase_auth" });
    }

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

async function me(req, res, next) {
  try {
    if (!req.user?.id) return res.status(401).json({ error: "missing_token" });

    const provider = getProvider();
    if (provider === "postgres" || provider === "supabase") {
      const rows = await query("SELECT id, name, role FROM profiles WHERE id = ? LIMIT 1", [
        String(req.user.id),
      ]);
      const profile = rows?.[0];
      if (!profile) {
        return res.status(404).json({ error: "profile_not_found" });
      }
      return res.json({
        user: { id: profile.id, name: profile.name, email: req.user.email, role: profile.role },
      });
    }

    return res.json({
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role || "user",
      },
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { register, login, adminLogin, me };
