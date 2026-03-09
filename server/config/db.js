const mysql = require("mysql2/promise");

let pool;

function isTruthyEnv(value) {
  return ["1", "true", "yes", "on"].includes(String(value || "").toLowerCase());
}

function poolOptions() {
  return {
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
  };
}

function parseMysqlUrl(databaseUrl) {
  const url = new URL(databaseUrl);
  const dbName = url.pathname ? url.pathname.replace(/^\//, "") : "";
  if (!dbName) throw new Error("DATABASE_URL missing database name");

  const sslParam =
    url.searchParams.get("ssl") ||
    url.searchParams.get("ssl-mode") ||
    url.searchParams.get("sslmode");

  const sslEnabled =
    isTruthyEnv(process.env.DB_SSL) ||
    ["required", "true", "1", "yes", "on"].includes(
      String(sslParam || "").toLowerCase()
    );

  return {
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username || ""),
    password: decodeURIComponent(url.password || ""),
    database: dbName,
    ...(sslEnabled ? { ssl: {} } : null),
  };
}

function createPoolFromEnv() {
  const databaseUrl =
    process.env.DATABASE_URL || process.env.MYSQL_URL || process.env.DB_URL;

  if (databaseUrl) {
    return mysql.createPool({ ...parseMysqlUrl(databaseUrl), ...poolOptions() });
  }

  const host = process.env.DB_HOST;
  const user = process.env.DB_USER;
  const database = process.env.DB_NAME;

  const missing = [];
  if (!host) missing.push("DB_HOST");
  if (!user) missing.push("DB_USER");
  if (!database) missing.push("DB_NAME");
  if (missing.length) {
    throw new Error(
      `Missing DB env vars: ${missing.join(", ")} (or set DATABASE_URL)`
    );
  }

  return mysql.createPool({
    host,
    port: Number(process.env.DB_PORT || 3306),
    user,
    password: process.env.DB_PASSWORD,
    database,
    ...poolOptions(),
  });
}

function getPool() {
  if (!pool) {
    pool = createPoolFromEnv();

    pool
      .getConnection()
      .then((conn) => {
        conn.release();
        console.log("MySQL connected");
      })
      .catch((err) => console.error("DB error:", err?.message || err));
  }

  return pool;
}

async function query(sql, params = []) {
  const [rows] = await getPool().execute(sql, params);
  return rows;
}

module.exports = { getPool, query };
