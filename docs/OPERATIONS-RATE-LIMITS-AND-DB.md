# Operations: rate limits and database efficiency

Recommendations to keep API and DB load predictable under high concurrency (e.g. many students on one NAT or a spike after a deploy).

## Rate limiting (optional)

- **Where it helps:** Endpoints that can be hit very often in a short window, e.g.:
  - `GET /api/sessions/[code]/live` (polling from many students in one session)
  - `GET /api/users/me` (already deduplicated per tab via Phase 1; rate limit is a second line of defense)
- **Options:**
  - **Vercel:** Use [Vercel Firewall](https://vercel.com/docs/security/firewall) or edge middleware to throttle by IP or path (e.g. cap requests per minute per IP to `/api/sessions/*/live`).
  - **Application:** Add a small in-memory or Redis-backed rate limiter in route handlers for the live session endpoint (e.g. per session code or per IP). Return `429 Too Many Requests` with `Retry-After` when over limit.
- **Client:** Phase 1 already reduced duplicate calls. If you add polling, use `refetchInterval` ≥ 5s and `pauseOnHidden: true` in `useSessionData` so background tabs don’t poll.

## Database efficiency

- **Indexes:** Ensure tables used by high-traffic APIs have indexes on:
  - Session lookups: e.g. `live_sessions` by join code (or whatever column backs `/api/sessions/[code]/live`).
  - User/session relations and any filters used in list endpoints.
- **Queries:** In Payload and custom route handlers:
  - Avoid N+1: use `depth` and `limit` wisely; fetch related data in one or few queries where possible.
  - Prefer selecting only needed fields if Payload allows it, to reduce payload size and DB work.
- **Neon:** Use the **pooled** `DATABASE_URL` for serverless (Vercel). If you still see OOM (53200) during schema introspection or under load, increase compute size and/or see `TROUBLESHOOTING-POSTGRES-OOM.md`.

## After a deploy or traffic spike

1. Check **Vercel** function invocations and latency per route.
2. Check **Neon** compute usage and connection count.
3. Use **OBSERVABILITY-AND-LOAD.md** to confirm client-side request counts match expectations (e.g. one “me” per tab, shared session list cache).

If spikes persist, consider:
- Edge caching for read-heavy, non-personalized endpoints (if applicable).
- Short-term rate limiting on the heaviest endpoints until client and DB optimizations are in place.
