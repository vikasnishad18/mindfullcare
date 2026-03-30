## MindfullCare (React + Express + SQLite)

### 1) Choose a Database

- **SQLite (default):** local file at `server/database/mindfullcare.db`
- **Supabase (Postgres):** managed Postgres database (recommended for deploy)

### 2) SQLite Database Setup

The backend stores data in a local SQLite file at `server/database/mindfullcare.db` (created automatically).

Initialize tables:

```powershell
cd server
npm run db:init
```

### 3) Supabase (Postgres + Auth) Database Setup

1) Create a Supabase project

2) Apply the schema

- Option A (Supabase Dashboard): open **SQL Editor** and run `supabase_migrations/20260330120100_init_auth.sql`
- Option B (Supabase CLI): run the SQL from `supabase_migrations/`

Note: `supabase/migrations/20260330120000_init.sql` is the older (non-Supabase-Auth) schema and can be ignored.

3) (Optional) Move existing SQLite data

Important: **Passwords cannot be migrated** to Supabase Auth. Existing users must set a new password (invite/reset flow).

Option A: use the migration script (recommended):

```powershell
cd server
npm run supabase:migrate-sqlite
```

Option B: export CSVs from the existing SQLite DB:

```powershell
sqlite3 server/database/mindfullcare.db ".headers on" ".mode csv" ".once users.csv" "select * from users;"
sqlite3 server/database/mindfullcare.db ".headers on" ".mode csv" ".once experts.csv" "select * from experts;"
sqlite3 server/database/mindfullcare.db ".headers on" ".mode csv" ".once bookings.csv" "select * from bookings;"
```

Then import those CSVs in Supabase (**Table Editor → Import data**) or via `copy` in SQL.

If you import IDs explicitly, re-sync identity values:

```sql
select setval(pg_get_serial_sequence('public.users','id'), (select coalesce(max(id), 1) from public.users));
select setval(pg_get_serial_sequence('public.experts','id'), (select coalesce(max(id), 1) from public.experts));
select setval(pg_get_serial_sequence('public.bookings','id'), (select coalesce(max(id), 1) from public.bookings));
```

### 4) Configure Backend Env

Create `server/.env` by copying `server/.env.example`, then update `JWT_SECRET`.

```env
PORT=5000
JWT_SECRET=change_me
```

For Supabase Postgres, also set:

```env
DB_PROVIDER=postgres
DATABASE_URL=postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres
SUPABASE_URL=https://<project-ref>.supabase.co
```

Optional: create/update an admin user (used by the Admin Dashboard):

```env
ADMIN_NAME=Admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=change_me
```

```powershell
cd server
npm run db:seed-admin
```

### 5) Run Backend

```powershell
cd server
npm install
npm run dev
```

Health check:

```powershell
curl http://localhost:5000/
```

### 6) Run Frontend

```powershell
cd client
npm install
npm start
```

Open `http://localhost:3000`.

### 7) Deploy (Render + Vercel)

- **Backend (Render)**
  - Set Render env vars using `server/.env.example` as a reference (do **not** commit real secrets).
  - Ensure `DATABASE_URL` points to a reachable Supabase host (pooler is usually best).

- **Frontend (Vercel)**
  - This repo includes `vercel.json` so Vercel builds the React app from `client/` and enables SPA routing.
  - Set Vercel env vars (Build + Runtime):
    - `REACT_APP_SUPABASE_URL`
    - `REACT_APP_SUPABASE_ANON_KEY`
    - `REACT_APP_API_URL` (optional; defaults to `https://mindfullcare.onrender.com/api`)
  - Redeploy after changing env vars (CRA bakes them at build time).

### Notes

- Backend supports **SQLite** and **Postgres/Supabase** via `server/config/db.js`.
- SQLite schema: `server/database/schema.sql`
- Postgres schema: `supabase_migrations/20260330120100_init_auth.sql` (also mirrored in `server/database/schema.pg.sql`)
- When using Supabase Auth, the frontend logs in via Supabase and the backend validates the Supabase JWT.
