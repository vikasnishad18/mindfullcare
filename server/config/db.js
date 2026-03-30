const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const { Pool } = require("pg");
const dns = require("dns");

let sqliteDb;
let pgPool;

function getProvider() {
  const explicit = String(process.env.DB_PROVIDER || "").trim().toLowerCase();
  if (explicit) return explicit;
  if (process.env.DATABASE_URL) return "postgres";
  return "sqlite";
}

function isSelectLike(sql) {
  return /^\s*(select|with|pragma)\b/i.test(String(sql || ""));
}

function convertQmToPgPlaceholders(sql) {
  let i = 0;
  let out = "";
  let inSingle = false;
  let inDouble = false;

  for (let idx = 0; idx < sql.length; idx++) {
    const ch = sql[idx];

    if (ch === "'" && !inDouble) {
      // Handle escaped '' inside strings
      const next = sql[idx + 1];
      if (inSingle && next === "'") {
        out += "''";
        idx++;
        continue;
      }
      inSingle = !inSingle;
      out += ch;
      continue;
    }

    if (ch === '"' && !inSingle) {
      inDouble = !inDouble;
      out += ch;
      continue;
    }

    if (ch === "?" && !inSingle && !inDouble) {
      i += 1;
      out += `$${i}`;
      continue;
    }

    out += ch;
  }

  return out;
}

function withReturningId(sql) {
  const trimmed = String(sql || "").trim().replace(/;+\s*$/, "");
  if (!/^\s*insert\b/i.test(trimmed)) return { sql: trimmed, added: false };
  if (/\breturning\b/i.test(trimmed)) return { sql: trimmed, added: false };
  return { sql: `${trimmed} RETURNING id`, added: true };
}

function maskConnectionString(connectionString) {
  try {
    const url = new URL(connectionString);
    if (url.password) url.password = "******";
    return url.toString();
  } catch {
    return "[invalid DATABASE_URL]";
  }
}

async function preflightDns(connectionString) {
  let hostname;
  try {
    hostname = new URL(connectionString).hostname;
  } catch {
    throw new Error("Invalid DATABASE_URL (must be a valid URL)");
  }

  if (!hostname) throw new Error("Invalid DATABASE_URL (missing hostname)");

  try {
    const results = await dns.promises.lookup(hostname, { all: true });
    const families = new Set(results.map((r) => r.family));

    const nodeOptions = String(process.env.NODE_OPTIONS || "");
    const forcesIpv4First = nodeOptions.includes("--dns-result-order=ipv4first");

    if (!families.has(4) && families.has(6) && forcesIpv4First) {
      const safe = maskConnectionString(connectionString);
      throw new Error(
        `Database host "${hostname}" resolves only to IPv6 (AAAA), but NODE_OPTIONS forces IPv4-first. ` +
          `Remove "--dns-result-order=ipv4first" or use an IPv4-capable DB hostname. ` +
          `DATABASE_URL=${safe}`
      );
    }
  } catch (err) {
    if (err && (err.code === "ENOTFOUND" || err.code === "EAI_AGAIN")) {
      const safe = maskConnectionString(connectionString);
      throw new Error(
        `DNS lookup failed for database host "${hostname}" (${err.code}). ` +
          `This is usually a network/DNS/VPN/firewall issue or a typo in DATABASE_URL. ` +
          `DATABASE_URL=${safe}`
      );
    }
    throw err;
  }
}

async function connectDB() {
  const provider = getProvider();

  if (provider === "postgres" || provider === "supabase") {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("Missing DATABASE_URL for Postgres/Supabase connection");
    }

    await preflightDns(connectionString);

    pgPool = new Pool({ connectionString });
    try {
      await pgPool.query("select 1 as ok");
    } catch (err) {
      if (err && err.code === "ENOTFOUND") {
        const safe = maskConnectionString(connectionString);
        throw new Error(
          `Unable to resolve database host "${err.hostname || "unknown"}" (ENOTFOUND). ` +
            `Check your network/DNS and verify DATABASE_URL. DATABASE_URL=${safe}`
        );
      }
      throw err;
    }

    console.log("Postgres connected");
    return;
  }

  sqliteDb = await open({
    filename: process.env.SQLITE_FILENAME
      ? path.resolve(process.env.SQLITE_FILENAME)
      : path.join(__dirname, "../database/mindfullcare.db"),
    driver: sqlite3.Database,
  });

  console.log("SQLite connected");
}

function getDB() {
  const provider = getProvider();
  return provider === "postgres" || provider === "supabase" ? pgPool : sqliteDb;
}

async function closeDB() {
  const provider = getProvider();
  if (provider === "postgres" || provider === "supabase") {
    if (pgPool) await pgPool.end();
    pgPool = null;
    return;
  }

  if (sqliteDb) await sqliteDb.close();
  sqliteDb = null;
}

async function query(sql, params = []) {
  const provider = getProvider();

  if (provider === "postgres" || provider === "supabase") {
    if (!pgPool) throw new Error("Postgres pool not initialized (call connectDB first)");

    const { sql: sqlWithReturning, added } = withReturningId(sql);
    const converted = convertQmToPgPlaceholders(sqlWithReturning);

    const result = await pgPool.query(converted, params);

    if (isSelectLike(sqlWithReturning)) return result.rows;

    const insertId = added ? result.rows?.[0]?.id : undefined;
    return {
      insertId,
      affectedRows: result.rowCount,
      changes: result.rowCount,
    };
  }

  if (!sqliteDb) throw new Error("SQLite db not initialized (call connectDB first)");

  if (isSelectLike(sql)) return sqliteDb.all(sql, params);

  const res = await sqliteDb.run(sql, params);
  return {
    insertId: res.lastID,
    affectedRows: res.changes,
    changes: res.changes,
  };
}

module.exports = { connectDB, getDB, closeDB, query, getProvider };
