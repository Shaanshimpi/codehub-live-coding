# Phase 1 API optimization – tests to run

After the Phase 1 changes, run these tests to confirm behavior and that duplicate API calls are reduced.

## 1. Current user (`/api/users/me`) – one call per tab

**Goal:** Only one request to `/api/users/me` per full page load in the app.

### Steps

1. Open DevTools → Network, filter by “users/me” (or XHR/Fetch).
2. Clear network log and refresh.
3. **Home (`/`)**  
   - Load the home page (logged out or logged in).  
   - **Expect:** At most **1** request to `/api/users/me` (FloatingLogout + HomePageClient share cache).
4. **Workspace (`/workspace`)**  
   - Navigate to `/workspace` (or open in new tab and reload).  
   - **Expect:** At most **1** request to `/api/users/me` (from shared `useCurrentUser`).
5. **Trainer start (`/trainer/start`)**  
   - Go to `/trainer/start`.  
   - **Expect:** No extra `/api/users/me` (uses same cache; may see 0 if already loaded).
6. **Join (`/join`)**  
   - Go to `/join`.  
   - **Expect:** No extra `/api/users/me` if you came from another app page.
7. **Dashboard**  
   - Go to `/dashboard` and then `/dashboard/users`.  
   - **Expect:** At most one `/api/users/me` for the dashboard section (shared cache).

**Pass:** No page in the app triggers more than one `/api/users/me` per load (and often 0 when navigating within the app).

---

## 2. Workspace data (`/api/folders`, `/api/workspace/files`) – single source

**Goal:** One request each for folders and workspace files when opening workspace/explorer/file modal.

### Steps

1. Clear network, then go to **`/workspace`**.
2. **Expect:**  
   - **1** request to `/api/folders` (or equivalent with query params).  
   - **1** request to `/api/workspace/files`.
3. Navigate to **`/workspace/explorer/[some-folder-slug]`** (or open a folder in explorer).
4. **Expect:** No second `/api/folders` or `/api/workspace/files` (data from cache).
5. From workspace, open the **file selection modal** (e.g. in a session flow that uses `FileSelectionModal`).
6. **Expect:** No new `/api/folders` or `/api/workspace/files` when the modal opens (uses same cache).

**Pass:** Only one pair of folder + workspace file requests for the workspace flow; modal does not refetch.

---

## 3. File content (`/api/files/:id`) – no refetch on tab focus

**Goal:** Switching tabs and returning to the app does not refetch the same file again.

### Steps

1. Go to `/workspace`, select a file so that `/api/files/:id` is called. Note the request count for that file ID.
2. Switch to another browser tab or app, then switch back to the workspace tab.
3. **Expect:** No additional request to `/api/files/:id` for the same file (refetch on window focus disabled).

**Pass:** No extra `/api/files/:id` when refocusing the window.

---

## 4. Active sessions list (`/api/sessions/list`) – cached between pages

**Goal:** Visiting both join and trainer/start does not double session-list requests within a short time.

### Steps

1. Clear network. Go to **`/join`** (with a user that can see the list).
2. **Expect:** **1** request to `/api/sessions/list`.
3. Without refreshing, navigate to **`/trainer/start`**.
4. **Expect:** No new `/api/sessions/list` (or at most one if cache was stale) within ~1 minute.
5. Click **Refresh** on the sessions list.
6. **Expect:** **1** new request to `/api/sessions/list`.

**Pass:** One list request serves both pages until stale or manual refresh.

---

## 5. Student session (`/student/session/[code]`) – shared hooks

**Goal:** Session and payment data come from shared hooks; no duplicate session or payment calls.

### Steps

1. Clear network. Open **`/student/session/[valid-code]`** (valid join code).
2. **Expect:**  
   - **1** request to `/api/sessions/[code]/live`.  
   - **1** request to `/api/user/payment-status` (shared with other pages that use `usePaymentStatus`).
3. Navigate away and back to the same student session URL (or open the same URL in a new tab).
4. **Expect:** No duplicate `/api/sessions/[code]/live` or `/api/user/payment-status` while cache is fresh.

**Pass:** Single session + single payment-status request per “logical” load; no duplicate fetches from this page.

---

## 6. Smoke tests (no regressions)

- **Home:** Logged-in user sees Workspace / Start Session / Join Session / Dashboard (if staff). Logged-out user sees Login and Join Session.
- **Workspace:** Folder tree and file list load; opening a file shows content; saving works.
- **Workspace explorer:** `/workspace/explorer/[slug]` shows correct folder and children; back link works.
- **Trainer start:** Form loads; “Logged in as …” shows; starting a session redirects to trainer session; active sessions list shows and Refresh works.
- **Join:** Active sessions list loads; selecting a session and joining works.
- **Student session:** `/student/session/[code]` loads the session UI; payment modals appear when applicable; payment blocked screen appears when applicable.
- **Dashboard:** Dashboard home and users list load; permission-based links and actions behave as before.

---

## Quick checklist

| Test | Pass |
|------|------|
| 1. `/api/users/me` at most once per tab | ☐ |
| 2. `/api/folders` and `/api/workspace/files` single source | ☐ |
| 3. No extra `/api/files/:id` on window focus | ☐ |
| 4. `/api/sessions/list` shared between /join and /trainer/start | ☐ |
| 5. Student session uses shared session + payment hooks | ☐ |
| 6. Smoke tests (no regressions) | ☐ |
