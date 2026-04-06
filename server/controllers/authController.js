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
      const id = String(req.user.id);

      try {
        const rows = await query("SELECT id, name, role FROM profiles WHERE id = ? LIMIT 1", [id]);
        const profile = rows?.[0] || null;

        if (!profile) {
          // If the trigger didn't create the profile (or it was deleted), create a minimal one.
          const fallbackName = String(req.user.name || req.user.email || "").trim() || null;
          await query(
            `INSERT INTO profiles (id, name, role)
             VALUES (?, ?, ?)
             ON CONFLICT (id) DO UPDATE SET name = COALESCE(EXCLUDED.name, profiles.name)`,
            [id, fallbackName, "user"]
          );

          const rows2 = await query("SELECT id, name, role FROM profiles WHERE id = ? LIMIT 1", [id]);
          const created = rows2?.[0] || null;
          if (created) {
            return res.json({
              user: { id: created.id, name: created.name, email: req.user.email, role: created.role },
            });
          }
        }

        if (profile) {
          return res.json({
            user: { id: profile.id, name: profile.name, email: req.user.email, role: profile.role },
          });
        }
      } catch (err) {
        // If profiles table isn't available for some reason, fall back to JWT claims.
        console.warn("Auth /me: profile lookup failed, falling back to token claims:", err?.message || err);
      }

      return res.json({
        user: { id, name: req.user.name || null, email: req.user.email || null, role: "user" },
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
