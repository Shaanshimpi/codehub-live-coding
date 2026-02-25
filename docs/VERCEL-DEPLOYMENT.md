# Vercel deployment

## If the build hangs on “Would you like to proceed? (y/N)”

Payload’s migrate step shows an interactive prompt when it finds a **dev-pushed** migration record (`batch = -1`) in `payload_migrations`. Vercel runs non-interactively, so it never answers and the build hangs. **Payload does not check `PAYLOAD_MIGRATING` or `CI` before showing this prompt** — the only fix is to remove that record from the database.

### 1. Required: run this SQL on your Postgres database

Run this **once** on the same database your Vercel app uses (e.g. Neon SQL editor, TablePlus, or `psql`):

```sql
DELETE FROM payload_migrations WHERE batch = -1;
```

If your schema was applied by dev push (so tables/enums already exist), also mark the initial migration as applied so the app doesn’t try to run it and hit “already exists” on first start:

```sql
INSERT INTO payload_migrations (name, batch, updated_at, created_at)
VALUES ('20260127_102817_initial_schema', 1, now(), now());
```

(Run the INSERT only once; skip it if that migration name already exists in the table.)

Then trigger a new deploy. After this, the prompt will not appear and the build can finish.

### 2. Environment variables (Vercel)

In **Project → Settings → Environment Variables**, for **Build** (and Production if needed):

- **`DATABASE_URL`**  
  Must be set. Prefer `sslmode=verify-full` to avoid SSL warnings:
  - Example: `postgresql://user:pass@host/db?sslmode=verify-full`
- **`PAYLOAD_MIGRATING`** = `1`  
  Stops the adapter from doing a dev schema push in non-production; does **not** skip the “Would you like to proceed?” prompt (that is only fixed by the SQL above).
- **`CI`** = `1`  
  Optional; some tooling skips prompts when this is set.

### 3. What was changed in the repo

- **`src/db/adapter.ts`**
  - **SSL:** Connection string is normalized so `sslmode=require` (and similar) becomes `sslmode=verify-full`, which avoids the Node/pg SSL warning and aligns with future pg v3 behavior.
  - **Production:** `push: false` in production so the adapter never does a “dev push” in prod; only migrations are used. That avoids putting the DB into the “dev mode” state that triggers the prompt.

If the build still hangs after setting the env vars and (if needed) cleaning `batch = -1`, consider running migrations outside the build (e.g. in a separate job or on first request) and ensuring that step is non-interactive.
