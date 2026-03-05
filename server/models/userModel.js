const { query } = require("../config/db");

async function findByEmail(email) {
  try {
    const rows = await query(
      "SELECT id, name, email, password_hash, role FROM users WHERE email = ? LIMIT 1",
      [email]
    );
    return rows[0] || null;
  } catch (err) {
    if (err && err.code === "ER_BAD_FIELD_ERROR") {
      const rows = await query(
        "SELECT id, name, email, password_hash FROM users WHERE email = ? LIMIT 1",
        [email]
      );
      const user = rows[0] || null;
      return user ? { ...user, role: "user" } : null;
    }
    throw err;
  }
}

async function createUser({ name, email, passwordHash }) {
  const result = await query(
    "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
    [name, email, passwordHash]
  );
  return { id: result.insertId, name, email, role: "user" };
}

module.exports = { findByEmail, createUser };
