require("dotenv").config();

const bcrypt = require("bcryptjs");
const { connectDB, closeDB, query } = require("../config/db");
const initDB = require("./initDB");

async function seedAdmin() {
  const name = String(process.env.ADMIN_NAME || "").trim();
  const email = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = String(process.env.ADMIN_PASSWORD || "");

  if (!email || !password) {
    console.error("Missing ADMIN_EMAIL or ADMIN_PASSWORD in server/.env");
    process.exitCode = 1;
    return;
  }

  await connectDB();
  await initDB();

  const passwordHash = await bcrypt.hash(password, 10);

  const existing = await query("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
  if (existing[0]?.id) {
    await query(
      "UPDATE users SET name = COALESCE(NULLIF(?, ''), name), password_hash = ?, role = 'admin' WHERE id = ?",
      [name, passwordHash, existing[0].id]
    );
    console.log(`Admin updated: ${email}`);
    await closeDB();
    return;
  }

  await query("INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')", [
    name || "Admin",
    email,
    passwordHash,
  ]);

  console.log(`Admin created: ${email}`);
  await closeDB();
}

seedAdmin().catch((err) => {
  console.error("Seed admin failed:", err);
  process.exitCode = 1;
});
