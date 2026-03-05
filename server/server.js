require("dotenv").config();

const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const expertRoutes = require("./routes/expertRoutes");
const { getPool } = require("./config/db");

const app = express();

/* ---------------- MIDDLEWARE ---------------- */

app.use(express.json());

const allowedOrigins = String(
  process.env.CORS_ORIGIN ||
    "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, cb) {
      // Allow non-browser clients (no Origin header) like curl/Postman.
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked origin: ${origin}`));
    },
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
  console.error(err);
  res.status(500).json({ error: "internal_error" });
});

/* ---------------- SERVER START ---------------- */

const port = Number(process.env.PORT || 5000);

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
