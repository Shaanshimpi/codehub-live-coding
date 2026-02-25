# Vercel deployment

## If the build hangs (e.g. 30+ min)

The build can hang if Payload’s migration step shows an interactive prompt (“Would you like to proceed?”) and waits for input. Vercel runs non-interactively, so it never answers and the build never finishes.

### 1. Environment variables (Vercel)

In **Project → Settings → Environment Variables**, add for **Build** (and Production if you use them at runtime):

- **`PAYLOAD_MIGRATING`** = `1`  
  Use this so migration-related logic runs in a non-interactive way.
- **`CI`** = `1`  
  Many tools skip interactive prompts when `CI` is set.
- **`DATABASE_URL`**  
  Must be set and correct. Prefer `sslmode=verify-full` in the query string to avoid SSL warnings and future pg v3 changes:
  - Good: `postgresql://user:pass@host/db?sslmode=verify-full`
  - The app will also normalize `sslmode=require` (and similar) to `verify-full` at runtime.

Redeploy after adding or changing these.

### 2. One-time fix if the DB was used in dev with “push”

If you previously ran the app in **development** against the same database, Payload may have “pushed” the schema (batch = -1). When migrations run in production they detect that and prompt, which causes the hang.

**One-time fix:** run this SQL on your Postgres database (e.g. in Neon’s SQL editor):

```sql
DELETE FROM payload_migrations WHERE batch = -1;
```

Then redeploy. After that, only real migrations (batch ≥ 0) exist and the prompt should not appear.

### 3. What was changed in the repo

- **`src/db/adapter.ts`**
  - **SSL:** Connection string is normalized so `sslmode=require` (and similar) becomes `sslmode=verify-full`, which avoids the Node/pg SSL warning and aligns with future pg v3 behavior.
  - **Production:** `push: false` in production so the adapter never does a “dev push” in prod; only migrations are used. That avoids putting the DB into the “dev mode” state that triggers the prompt.

If the build still hangs after setting the env vars and (if needed) cleaning `batch = -1`, consider running migrations outside the build (e.g. in a separate job or on first request) and ensuring that step is non-interactive.
