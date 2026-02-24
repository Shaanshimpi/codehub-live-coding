# Observability and load validation

How to measure API usage and validate that Phase 1 optimizations are effective.

## Development

### 1. Browser Network tab

- Open DevTools → **Network**.
- Filter by **Fetch/XHR** or by path (e.g. `users/me`, `folders`, `workspace/files`, `sessions`).
- Clear the log, then perform a user flow (e.g. open home → workspace → join).
- **Check:** Count requests per endpoint. After Phase 1 you should see at most one `/api/users/me` per tab, one `/api/folders` and one `/api/workspace/files` for the workspace flow, etc.

### 2. Dev-only API logs

In development, the app logs API fetches via `logApiFetch` (see `src/utilities/devApiLogger.ts`). You’ll see lines like:

- `[API] useCurrentUser → /api/users/me`
- `[API ok] useSessionData → /api/sessions/ABC123/live`

Use these to confirm which hook triggered a request and whether it succeeded. In production, nothing is logged.

### 3. React Query Devtools

With `@tanstack/react-query-devtools` (enabled in dev in `src/providers/index.tsx`):

- Inspect **query cache** and **query keys** (`user`, `workspace`, `session`, `payment`, `sessions`, `file`).
- Confirm that the same key is reused across components (e.g. `['user','me']` for layout and home).
- Use **refetch** / **invalidate** from the devtools to test cache behavior.

## Production / Vercel

- **Vercel → Project → Analytics / Logs:** Inspect serverless invocations and response times. Correlate spikes with deploys or specific routes.
- **Vercel → Functions:** Check invocations per route (e.g. `/api/users/me`, `/api/sessions/[code]/live`) to ensure no unexpected duplication.

## Database (Neon)

- **Neon dashboard:** Monitor compute usage, connection count, and query volume.
- After Phase 1, a single user opening `/workspace` should generate a small, bounded number of queries (e.g. one “me”, one folders, one workspace files, plus any file content for the selected file).
- If you see high read volume on cold start, ensure you use the **pooled** `DATABASE_URL` on Vercel and consider increasing compute size if you still hit OOM (see `TROUBLESHOOTING-POSTGRES-OOM.md`).

## Baseline vs after Phase 1

Record approximate request counts for a **single user, single tab** flow and compare before/after:

| Flow | Before (approx.) | After Phase 1 (target) |
|------|-------------------|------------------------|
| Load home + workspace | 11× `/api/users/me`, 4× folders, 4× workspace/files | 1× me, 1× folders, 1× workspace/files |
| Home → join → trainer/start | Multiple me, multiple sessions/list | 1× me, 1× sessions/list (shared cache) |
| Student session page | 2× session live, 2× payment-status | 1× session live, 1× payment-status |

Use the Phase 1 test doc (`PHASE1-API-OPTIMIZATION-TESTS.md`) to validate these numbers in your environment.
