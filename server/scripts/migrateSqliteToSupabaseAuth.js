require("dotenv").config();

const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const { Client } = require("pg");
const { createClient } = require("@supabase/supabase-js");

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

async function openSqlite() {
  const filename = process.env.SQLITE_FILENAME
    ? path.resolve(process.env.SQLITE_FILENAME)
    : path.join(__dirname, "../database/mindfullcare.db");

  return open({ filename, driver: sqlite3.Database });
}

async function openPostgres() {
  const connectionString = requireEnv("DATABASE_URL");
  const client = new Client({ connectionString });
  await client.connect();
  return client;
}

async function ensureSchema(pg) {
  // Best-effort: verify the expected tables exist
  const { rows } = await pg.query(
    "select to_regclass('public.profiles') as profiles, to_regclass('public.experts') as experts, to_regclass('public.bookings') as bookings"
  );
  const missing = Object.entries(rows[0] || {})
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (missing.length) {
    throw new Error(`Missing tables in Postgres: ${missing.join(", ")}. Run the Supabase SQL first.`);
  }
}

async function getOrCreateAuthUser({ supabaseAdmin, pg, email, name }) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) throw new Error("invalid_email");

  const inviteRes = await supabaseAdmin.auth.admin.inviteUserByEmail(normalizedEmail, {
    data: { name: String(name || "").trim() || undefined },
  });

  if (!inviteRes.error && inviteRes.data?.user?.id) {
    return inviteRes.data.user.id;
  }

  // If the user already exists (or invite fails), fall back to querying auth.users by email.
  const { rows } = await pg.query("select id from auth.users where email = $1 limit 1", [
    normalizedEmail,
  ]);
  if (rows[0]?.id) return rows[0].id;

  const msg = inviteRes.error?.message || "invite_failed";
  throw new Error(`Failed to create/find auth user for ${normalizedEmail}: ${msg}`);
}

async function upsertProfile(pg, { id, name, role }) {
  await pg.query(
    `insert into public.profiles (id, name, role)
     values ($1, $2, $3)
     on conflict (id) do update set name = excluded.name, role = excluded.role`,
    [id, name || null, role || "user"]
  );
}

async function upsertExpert(pg, expert) {
  await pg.query(
    `insert into public.experts (id, name, specialization, experience, image, created_at)
     overriding system value
     values ($1, $2, $3, $4, $5, $6)
     on conflict (id) do update set
       name = excluded.name,
       specialization = excluded.specialization,
       experience = excluded.experience,
       image = excluded.image,
       created_at = excluded.created_at`,
    [
      expert.id,
      expert.name,
      expert.specialization,
      Number(expert.experience || 0),
      expert.image || null,
      expert.created_at || null,
    ]
  );
}

async function upsertBooking(pg, booking, userIdMap) {
  const mappedUserId =
    booking.user_id != null && userIdMap.has(Number(booking.user_id))
      ? userIdMap.get(Number(booking.user_id))
      : null;

  await pg.query(
    `insert into public.bookings (
       id, user_id, name, email, therapist_name,
       session_date, session_time, notes, status, created_at, updated_at
     )
     overriding system value
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     on conflict (id) do update set
       user_id = excluded.user_id,
       name = excluded.name,
       email = excluded.email,
       therapist_name = excluded.therapist_name,
       session_date = excluded.session_date,
       session_time = excluded.session_time,
       notes = excluded.notes,
       status = excluded.status,
       created_at = excluded.created_at,
       updated_at = excluded.updated_at`,
    [
      booking.id,
      mappedUserId,
      booking.name,
      booking.email,
      booking.therapist_name,
      booking.session_date,
      booking.session_time,
      booking.notes || null,
      booking.status || "requested",
      booking.created_at || null,
      booking.updated_at || booking.created_at || null,
    ]
  );
}

async function resetIdentitySequences(pg) {
  await pg.query(
    "select setval(pg_get_serial_sequence('public.experts','id'), (select coalesce(max(id), 1) from public.experts))"
  );
  await pg.query(
    "select setval(pg_get_serial_sequence('public.bookings','id'), (select coalesce(max(id), 1) from public.bookings))"
  );
}

async function main() {
  const supabaseUrl = requireEnv("SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const sqlite = await openSqlite();
  const pg = await openPostgres();

  try {
    await ensureSchema(pg);

    const users = await sqlite.all(
      "select id, name, email, role, created_at from users order by id asc"
    );
    const experts = await sqlite.all(
      "select id, name, specialization, experience, image, created_at from experts order by id asc"
    );
    const bookings = await sqlite.all(
      "select id, user_id, name, email, therapist_name, session_date, session_time, notes, status, created_at, updated_at from bookings order by id asc"
    );

    console.log(
      `SQLite rows: users=${users.length}, experts=${experts.length}, bookings=${bookings.length}`
    );

    const userIdMap = new Map(); // sqlite user.id (number) -> auth.users.id (uuid)

    for (const u of users) {
      const authId = await getOrCreateAuthUser({
        supabaseAdmin,
        pg,
        email: u.email,
        name: u.name,
      });
      userIdMap.set(Number(u.id), authId);
      await upsertProfile(pg, { id: authId, name: u.name, role: u.role || "user" });
      process.stdout.write(".");
    }
    if (users.length) process.stdout.write("\n");

    for (const ex of experts) {
      await upsertExpert(pg, ex);
    }

    for (const b of bookings) {
      await upsertBooking(pg, b, userIdMap);
    }

    await resetIdentitySequences(pg);

    console.log("Done. Users were invited (passwords are NOT migrated).");
    console.log("Next: set admin roles in `public.profiles` if needed, then login via Supabase.");
  } finally {
    await sqlite.close();
    await pg.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

