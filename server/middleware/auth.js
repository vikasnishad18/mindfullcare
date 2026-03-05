const jwt = require("jsonwebtoken");

function parseBearerToken(req) {
  const header = req.headers.authorization || "";
  const [kind, token] = header.split(" ");
  if (kind !== "Bearer" || !token) return null;
  return token;
}

function decodeToken(token) {
  const secret = process.env.JWT_SECRET || "dev_secret";
  const payload = jwt.verify(token, secret);
  return {
    id: payload.sub,
    email: payload.email,
    name: payload.name,
    role: payload.role || "user",
  };
}

function optionalAuth(req, res, next) {
  const token = parseBearerToken(req);
  if (!token) return next();

  try {
    req.user = decodeToken(token);
  } catch (err) {
    // Ignore invalid token for optional auth paths.
  }
  return next();
}

function requireAuth(req, res, next) {
  const token = parseBearerToken(req);
  if (!token) return res.status(401).json({ error: "missing_token" });

  try {
    req.user = decodeToken(token);
    return next();
  } catch (err) {
    return res.status(401).json({ error: "invalid_token" });
  }
}

function requireAdmin(req, res, next) {
  return requireAuth(req, res, () => {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ error: "admin_only" });
    }
    return next();
  });
}

module.exports = { optionalAuth, requireAuth, requireAdmin };
