require("dotenv").config();

const express = require("express");
const cors = require("cors");

const { connectDB } = require("./config/db");
const initDB = require("./database/initDB");

const authRoutes = require("./routes/authRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const expertRoutes = require("./routes/expertRoutes");

const app = express();
const port = process.env.PORT || 5000;
const dbOptional =
  String(process.env.DB_CONNECT_OPTIONAL || "").toLowerCase() === "true" ||
  String(process.env.SKIP_DB || "").toLowerCase() === "true";
let dbReady = false;

/* Middleware */

app.use(express.json());
app.use(cors());

/* Routes */

app.get("/", (req, res) => {
  res.send("MindfullCare API running");
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    dbReady,
    dbProvider: process.env.DB_PROVIDER || (process.env.DATABASE_URL ? "postgres" : "sqlite"),
  });
});

// If DB didn't connect, fail API calls fast (unless user explicitly wants to start without DB)
app.use((req, res, next) => {
  if (!dbReady && req.path.startsWith("/api/")) {
    return res.status(503).json({ error: "db_unavailable" });
  }
  next();
});

app.use("/api/auth", authRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/experts", expertRoutes);

/* Error handler */

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "internal_server_error" });
});

/* Start server */

async function startServer() {
  try {
    try {
      await connectDB();
      await initDB();
      dbReady = true;
    } catch (err) {
      if (!dbOptional) throw err;
      console.error("DB init skipped (DB_CONNECT_OPTIONAL/SKIP_DB enabled):", err?.message || err);
    }

    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
    });
  } catch (err) {
    console.error("Server start failed:", err);
  }
}

startServer();
