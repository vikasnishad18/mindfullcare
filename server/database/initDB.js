const fs = require("fs");
const path = require("path");
const { getDB, getProvider } = require("../config/db");

async function ensureColumn(db, table, column, definition) {
  const cols = await db.all(`PRAGMA table_info(${table})`);
  const exists = cols.some((c) => c && c.name === column);
  if (exists) return;
  await db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

async function initDB() {
  const provider = getProvider();
  const db = getDB();

  if (provider === "postgres" || provider === "supabase") {
    const schemaPath = path.join(__dirname, "schema.pg.sql");
    const schema = fs.readFileSync(schemaPath, "utf-8");
    await db.query(schema);
    console.log("Database tables initialized (Postgres)");
    return;
  }

  const schemaPath = path.join(__dirname, "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf-8");

  await db.exec("PRAGMA foreign_keys = ON;");
  await db.exec(schema);

  await ensureColumn(db, "users", "role", "TEXT NOT NULL DEFAULT 'user'");
  await ensureColumn(db, "experts", "image", "TEXT");
  await ensureColumn(db, "bookings", "status", "TEXT NOT NULL DEFAULT 'requested'");
  await ensureColumn(db, "bookings", "updated_at", "DATETIME DEFAULT CURRENT_TIMESTAMP");

  console.log("Database tables initialized (SQLite)");
}

module.exports = initDB;
