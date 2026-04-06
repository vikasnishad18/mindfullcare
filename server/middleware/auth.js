const jwt = require("jsonwebtoken");
const { createRemoteJWKSet, jwtVerify } = require("jose");
const { getProvider, query } = require("../config/db");

function parseBearerToken(req) {
  const header = String(req.headers.authorization || "").trim();
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const token = String(match[1] || "").trim();
  return token || null;
}

function normalizeSupabaseIssuer(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  const noTrailingSlash = raw.replace(/\/+$/, "");

  if (/\/auth\/v1$/i.test(noTrailingSlash)) return noTrailingSlash;
  if (/\/auth\/v$/i.test(noTrailingSlash)) return `${noTrailingSlash}1`;
  if (/\/auth$/i.test(noTrailingSlash)) return `${noTrailingSlash}/v1`;

  return `${noTrailingSlash}/auth/v1`;
}

function getSupabaseIssuer() {
  const fromEnv = normalizeSupabaseIssuer(process.env.SUPABASE_JWT_ISSUER);
  if (fromEnv) return fromEnv;

  const supabaseUrl = String(process.env.SUPABASE_URL || "").trim();
  const fromUrl = normalizeSupabaseIssuer(supabaseUrl);
  if (fromUrl) return fromUrl;

  return null;
}

let jwks;
function getJWKS() {
  if (jwks) return jwks;
  const issuer = getSupabaseIssuer();
  if (!issuer) return null;
  try {
    jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));
  } catch {
    jwks = null;
  }
  return jwks;
}

async function decodeSupabaseToken(token) {
  const issuer = getSupabaseIssuer();
  const keySet = getJWKS();
  if (!issuer || !keySet) throw new Error("supabase_auth_not_configured");

  const audience = process.env.SUPABASE_JWT_AUDIENCE
    ? String(process.env.SUPABASE_JWT_AUDIENCE)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : "authenticated";

  const { payload } = await jwtVerify(token, keySet, {
    issuer,
    audience,
  });

  const userMetadata = payload.user_metadata || payload.userMetadata || {};
  return {
    id: payload.sub,
    email: payload.email,
    name: userMetadata.name,
    role: "user",
  };
}

function decodeLegacyToken(token) {
  const secret = process.env.JWT_SECRET || "dev_secret";
  const payload = jwt.verify(token, secret);
  return {
    id: payload.sub,
    email: payload.email,
    name: payload.name,
    role: payload.role || "user",
  };
}

async function decodeToken(token) {
  const provider = getProvider();
  if (provider === "postgres" || provider === "supabase") {
    return decodeSupabaseToken(token);
  }
  return decodeLegacyToken(token);
}

async function optionalAuth(req, res, next) {
  const token = parseBearerToken(req);
  if (!token) return next();

  try {
    req.user = await decodeToken(token);
  } catch (err) {
    // Ignore invalid token for optional auth paths.
  }
  return next();
}

async function requireAuth(req, res, next) {
  const token = parseBearerToken(req);
  if (!token) return res.status(401).json({ error: "missing_token" });

  try {
    req.user = await decodeToken(token);
    return next();
  } catch (err) {
    return res.status(401).json({ error: "invalid_token" });
  }
}

async function requireAdmin(req, res, next) {
  await requireAuth(req, res, async () => {
    try {
      const provider = getProvider();

      if (provider === "postgres" || provider === "supabase") {
        const rows = await query("SELECT role FROM profiles WHERE id = ? LIMIT 1", [
          String(req.user.id),
        ]);
        const role = String(rows?.[0]?.role || "user").toLowerCase();
        if (role !== "admin") return res.status(403).json({ error: "admin_only" });
        req.user.role = "admin";
        return next();
      }

      if (req.user?.role !== "admin") {
        return res.status(403).json({ error: "admin_only" });
      }
      return next();
    } catch (err) {
      return next(err);
    }
  });
}

module.exports = { optionalAuth, requireAuth, requireAdmin };
