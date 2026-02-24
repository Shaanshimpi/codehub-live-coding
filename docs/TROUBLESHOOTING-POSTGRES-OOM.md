# PostgreSQL "Out of Memory" (53200) During Schema Pull

## What you see

- Errors like: `[cause]: [error: out of memory] { code: '53200', detail: 'Failed on request of size ... in memory context "MessageContext"' }`
- Log line: `[⡿] Pulling schema from database...` then repeated failures
- Queries shown in the error are long `SELECT` statements against `pg_attribute`, `information_schema.columns`, `information_schema.table_constraints`, etc., for tables such as `platform_settings_available_currencies`, `files`, `forms_emails`, `_pages_v_blocks_content_columns`

## Cause

The failure happens **inside the PostgreSQL server**, not in Node. When Payload (via `@payloadcms/db-postgres`) introspects the database schema, it runs heavy metadata queries. If the Postgres process has very limited memory (e.g. Neon’s smallest compute or a tightly limited container), those queries can exhaust the server’s **MessageContext** or **ExecutorState** and trigger error `53200`.

The `forms_emails` error with a ~607KB allocation suggests that table may have very large column values or many columns, which can make the introspection result set large and increase memory use.

## Fixes

### 1. Give PostgreSQL more memory (primary fix)

- **Neon**: In the [Neon Console](https://console.neon.tech), increase the **compute size** for your project (e.g. from the smallest to the next tier). This raises the memory available to the Postgres process.
- **Self‑hosted / Docker**: Increase the container or VM memory, and/or raise Postgres settings such as `work_mem` / `maintenance_work_mem` in `postgresql.conf` if the server is still memory‑constrained.

### 2. Reduce schema pulls in development (already applied)

In this project, `generateStaticParams` in the following routes returns early in development so Next.js does not trigger Payload/DB on every route when running `pnpm dev`:

- `src/app/(frontend)/[slug]/page.tsx`
- `src/app/(frontend)/posts/page/[pageNumber]/page.tsx`
- `src/app/(frontend)/posts/[slug]/page.tsx`

That reduces how often “Pulling schema from database” runs and can avoid OOM when the database has limited memory.

### 3. If it still happens

- Avoid opening many Admin tabs or tools that each trigger schema introspection at once.
- Ensure you’re on a recent `@payloadcms/db-postgres` (and Payload) version for any introspection/memory fixes.
- If `forms_emails` is large (e.g. big TEXT columns), consider archiving or limiting stored size; very large rows can increase memory use during introspection/constraint queries.
