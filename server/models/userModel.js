const { query } = require("../config/db");

async function findByEmail(email) {
  const rows = await query(
    "SELECT id, name, email, password_hash, role FROM users WHERE email = ? LIMIT 1",
    [email]
  );
  return rows[0] || null;
}

async function createUser({ name, email, passwordHash }) {
  const result = await query(
    "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
    [name, email, passwordHash]
  );
  return { id: result.insertId, name, email, role: "user" };
}

module.exports = { findByEmail, createUser };
