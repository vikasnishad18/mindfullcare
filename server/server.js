if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const expertRoutes = require("./routes/expertRoutes");
const { getPool } = require("./config/db");

const app = express();

if (process.env.NODE_ENV === "production") {
  if (!process.env.JWT_SECRET) {
    console.warn("Warning: JWT_SECRET is not set (tokens will use a dev secret).");
  }
  if (!process.env.CORS_ORIGIN) {
    console.warn(
      "Warning: CORS_ORIGIN is not set; using built-in defaults. Set it to your frontend URL(s)."
    );
  }
}

/* ---------------- MIDDLEWARE ---------------- */

app.set("trust proxy", 1);
app.use(express.json());

const corsOriginRaw = String(
  process.env.CORS_ORIGIN ||
    [
      "https://mindfullcare.onrender.com",
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://localhost:5173",
      "http://127.0.0.1:5173",
    ].join(",")
).trim();

const allowAllOrigins = corsOriginRaw === "*";
const allowedOrigins = allowAllOrigins
  ? []
  : corsOriginRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

app.use(
  cors({
    origin(origin, cb) {
      // Allow non-browser clients (no Origin header) like curl/Postman.
      if (!origin) return cb(null, true);
      if (allowAllOrigins) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked origin: ${origin}`));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400,
  })
);

/* ---------------- ROOT ROUTE ---------------- */

app.get("/", (req, res) => {
  res.send("MindfullCare API is running 🚀");
});

/* ---------------- HEALTH CHECK ---------------- */

app.get("/api/health", async (req, res) => {
  try {
    await getPool().execute("SELECT 1");
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: "db_unreachable" });
  }
});

/* ---------------- ROUTES ---------------- */

app.use("/api/auth", authRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/experts", expertRoutes);

/* ---------------- ERROR HANDLER ---------------- */

app.use((err, req, res, next) => {
  if (
    err &&
    typeof err.message === "string" &&
    err.message.startsWith("CORS blocked origin:")
  ) {
    return res.status(403).json({ error: "cors_blocked", detail: err.message });
  }
  if (err && err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "invalid_json" });
  }
  console.error(err);
  return res.status(500).json({ error: "internal_error" });
});

/* ---------------- SERVER START ---------------- */

const port = Number(process.env.PORT || 5000);

app.listen(port, () => {
  console.log(
    `API listening on port ${port} (${process.env.NODE_ENV || "development"})`
  );
});
