# Code Deduplication — Multiphase Plan

This plan addresses the duplicates and reuse opportunities from [CODEBASE-ANALYSIS.md](./CODEBASE-ANALYSIS.md). Each phase is self-contained so you can execute and verify one at a time.

### Test types

- **Manual:** Run the app, open the listed URLs/flows, and confirm behavior (no regressions).
- **Build:** Run `pnpm build` (or `npm run build`) after each phase to catch TypeScript and build errors.
- **Unit (optional):** For new utilities (`normalizeCodeParam`, `isCancellationError`, `mapOutputToExecutionResult`, `sessionMessages`) you can add tests in e.g. `src/utilities/__tests__/` or `*.test.ts` next to the module; not required for phase success but recommended for regression safety.

---

## Table of Contents

1. [Phase 1: Session params & single student entry](#phase-1-session-params--single-student-entry)
2. [Phase 2: Monitor session list](#phase-2-monitor-session-list)
3. [Phase 3: Execution & cancellation utilities](#phase-3-execution--cancellation-utilities)
4. [Phase 4: Payment modals](#phase-4-payment-modals)
5. [Phase 5: Refresh button & session messages](#phase-5-refresh-button--session-messages)
6. [Phase 6: UI consistency (buttons & dashboard lists)](#phase-6-ui-consistency-buttons--dashboard-lists)
7. [Phase completion checklist](#phase-completion-checklist)

---

## Phase 1: Session params & single student entry

**Goal:** One place for session code normalization and one student session entry (workspace-based).

### 1.1 Extract `normalizeCodeParam`

| Step | Action |
|------|--------|
| 1 | Create `src/utilities/sessionParams.ts` with `normalizeCodeParam(codeParam: string \| string[] \| undefined): string`. |
| 2 | Replace inline logic in `session/[code]/StudentSessionClient.tsx` with import. |
| 3 | Replace inline logic in `student/session/[code]/StudentSessionClient.tsx` with import. |
| 4 | Replace inline logic in `trainer/session/[code]/TrainerSessionClient.tsx` with import. |
| 5 | Replace inline logic in `staff/monitor/[code]/MonitorViewClient.tsx` with import. |

**Files touched:** 1 new file, 4 clients.

### 1.2 Unify student session entry

| Step | Action |
|------|--------|
| 1 | In `src/app/(app)/session/[code]/page.tsx`, add a redirect to `student/session/[code]` (or return a redirect component). |
| 2 | Update any links/navigation that point to `session/[code]` to use `student/session/[code]` (e.g. JoinSessionClient, ActiveSessionsList). |
| 3 | (Optional) After verification, remove `session/[code]/StudentSessionClient.tsx` and keep only the redirect in `session/[code]/page.tsx`. |

**Files touched:** `session/[code]/page.tsx`, JoinSessionClient, ActiveSessionsList, any other references to `/session/`.

---

### Verification tests — Phase 1

| # | Test | How to verify | Pass criteria |
|---|------|----------------|----------------|
| 1.1 | **normalizeCodeParam** | Run unit test or manual: pass `"abc"`, `["abc"]`, `undefined` → expect `"ABC"`, `"ABC"`, `""`. | Shared util returns correct uppercase string for all callers. |
| 1.2 | **Student session (legacy URL)** | Open `/session/ABC123` (or your app’s base + session path). | Browser redirects to `/student/session/ABC123` and student workspace loads. |
| 1.3 | **Student session (canonical URL)** | Open `/student/session/ABC123` with valid session code. | StudentSessionWorkspace loads; code is normalized (e.g. uppercase in API calls). |
| 1.4 | **Trainer session** | Open `/trainer/session/CODE` with valid code. | Trainer session loads; session code in requests is normalized. |
| 1.5 | **Monitor session** | Open `/staff/monitor/CODE`. | Monitor view loads; session code is normalized. |
| 1.6 | **Join flow** | From Join page, select or enter a session and go to session. | Link goes to `student/session/[code]` and session loads. |
| 1.7 | **Build** | `pnpm build` (or `npm run build`). | No TypeScript or build errors. |

---

## Phase 2: Monitor session list

**Goal:** Monitor uses the same session list as Join/Trainer (one cache, consistent UX).

### 2.1 Use `useActiveSessionsList` in Monitor

| Step | Action |
|------|--------|
| 1 | In `MonitorSelectionClient.tsx`, remove local `fetchSessions`, `useState` for sessions/loading/error. |
| 2 | Use `useActiveSessionsList` (e.g. with optional `trainerId` if needed for monitor). |
| 3 | Render `ActiveSessionsList` (or a variant that supports “Open in Monitor” action). If the list component doesn’t support monitor action, add an optional prop or a wrapper that adds “Monitor” button. |
| 4 | Use the same refresh behavior as Join/Trainer (refetch from hook). |

**Files touched:** `staff/monitor/MonitorSelectionClient.tsx`, optionally `Session/ActiveSessionsList.tsx` if you add a monitor action.

---

### Verification tests — Phase 2

| # | Test | How to verify | Pass criteria |
|---|------|----------------|----------------|
| 2.1 | **Monitor list loads** | Open `/staff/monitor`. | List of active sessions appears (same data as Join/Trainer start). |
| 2.2 | **Refresh** | Click refresh on monitor page. | List refetches; loading state then updated list. |
| 2.3 | **Open session** | Click a session to open in monitor (or enter code). | Navigates to monitor view for that session. |
| 2.4 | **Cache consistency** | Open Join page, then Monitor (or vice versa). | Same sessions shown without redundant fetch if cache is fresh. |
| 2.5 | **Build** | `pnpm build`. | No TypeScript or build errors. |

---

## Phase 3: Execution & cancellation utilities

**Goal:** Centralize execution result mapping and cancellation-error handling.

### 3.1 Extract `mapOutputToExecutionResult`

| Step | Action |
|------|--------|
| 1 | Add `mapOutputToExecutionResult` to `src/services/codeExecution.ts` (or create `src/utilities/executionResult.ts`). Implement the same logic as in the two clients (OneCompiler-shaped output → `ExecutionResult`). |
| 2 | In `session/[code]/StudentSessionClient.tsx` (if still present) or `student/session/[code]/StudentSessionClient.tsx`, remove local mapping and import from service/util. |
| 3 | In `staff/monitor/[code]/MonitorViewClient.tsx`, remove local mapping and import from service/util. |

**Files touched:** `codeExecution.ts` or new util, 2 clients.

### 3.2 Extract `isCancellationError`

| Step | Action |
|------|--------|
| 1 | Create `src/utilities/cancellationError.ts` with `isCancellationError(error: unknown): boolean` (e.g. check for `AbortError`, `name === 'AbortError'`, or cancel-like message). |
| 2 | In `StudentSessionWorkspace.tsx`, replace inline check with import. |
| 3 | Use the same util anywhere else that ignores Abort/cancel (e.g. future trainer refresh). |

**Files touched:** 1 new file, `StudentSessionWorkspace.tsx`.

---

### Verification tests — Phase 3

| # | Test | How to verify | Pass criteria |
|---|------|----------------|----------------|
| 3.1 | **Execution result mapping** | In student session or monitor, run code and get output. | Stdout/stderr/status display correctly (same as before refactor). |
| 3.2 | **Monitor run** | In monitor view, run code for a user. | Output panel shows execution result (mapped correctly). |
| 3.3 | **Cancellation** | In student session, trigger an action that can be aborted (e.g. switch tab or leave while request in flight). | No unhandled rejection; no error toast for AbortError. |
| 3.4 | **Build** | `pnpm build`. | No TypeScript or build errors. |

---

## Phase 4: Payment modals

**Goal:** One component or hook for payment modals used in workspace and session clients.

### 4.1 Create `PaymentModals` or `usePaymentModals`

| Step | Action |
|------|--------|
| 1 | Create `src/components/Payment/PaymentModals.tsx` (or hook `usePaymentModals(sessionCode?: string)`). It should: use `usePaymentStatus`, decide which modal to show (due, grace, trial ending, trial grace), render `PaymentBlocked`, `PaymentDueModal`, `PaymentGracePeriodModal`, `TrialEndingSoonModal`, `TrialGracePeriodModal`. |
| 2 | Use `PaymentModals` in `WorkspaceLayout.tsx` instead of inline modal logic. |
| 3 | Use `PaymentModals` in `student/session/[code]/StudentSessionClient.tsx` instead of inline modal logic. |
| 4 | If legacy `session/[code]/StudentSessionClient.tsx` still exists, use `PaymentModals` there too; otherwise skip. |

**Files touched:** 1 new component (or hook + small wrapper), `WorkspaceLayout.tsx`, one or two StudentSessionClient files.

---

### Verification tests — Phase 4

| # | Test | How to verify | Pass criteria |
|---|------|----------------|----------------|
| 4.1 | **Workspace payment** | As user with payment due/grace/trial state, open `/workspace`. | Correct payment modal or blocking UI appears (same as before). |
| 4.2 | **Student session payment** | As same user, join a session and open student session page. | Same payment modal/blocking behavior. |
| 4.3 | **Modal copy** | Check all payment modals (due, grace, trial ending, trial grace). | Copy and behavior match previous implementation. |
| 4.4 | **Build** | `pnpm build`. | No TypeScript or build errors. |

---

## Phase 5: Refresh button & session messages

**Goal:** Shared refresh button behavior and consistent session copy.

### 5.1 Shared `RefreshButton` or `useRefreshWithSuccess`

| Step | Action |
|------|--------|
| 1 | Create `src/components/ui/RefreshButton.tsx` (or hook in `hooks/useRefreshWithSuccess.ts`) that: accepts `onRefresh` (async), shows loading, disabled state, and “Refreshed!” feedback with timeout. |
| 2 | Use it in `ActiveSessionsList.tsx` instead of inline refresh logic. |
| 3 | Use it in `MonitorSelectionClient.tsx` instead of inline refresh logic. |

**Files touched:** 1 new component or hook, `ActiveSessionsList.tsx`, `MonitorSelectionClient.tsx`.

### 5.2 Session messages constant

| Step | Action |
|------|--------|
| 1 | Create `src/utilities/sessionMessages.ts` with constants like `LOADING_SESSION`, `SESSION_NOT_FOUND`, `FAILED_TO_LOAD_SESSION`, `INVALID_SESSION_CODE`. |
| 2 | Replace hardcoded strings in StudentSessionClient(s), TrainerSessionClient, MonitorViewClient, JoinSessionClient, ActiveSessionsList, SessionMetadataModal (and API routes if desired). |

**Files touched:** 1 new file, multiple clients and optionally API routes.

---

### Verification tests — Phase 5

| # | Test | How to verify | Pass criteria |
|---|------|----------------|----------------|
| 5.1 | **Refresh on Join** | On Join page, click refresh. | Loading → “Refreshed!” (or similar) → list updates. |
| 5.2 | **Refresh on Monitor** | On Monitor page, click refresh. | Same behavior as Join. |
| 5.3 | **Session messages** | Force “session not found” and “invalid code” (e.g. wrong code). | User sees the same messages as before (from shared constants). |
| 5.4 | **Build** | `pnpm build`. | No TypeScript or build errors. |

---

## Phase 6: UI consistency (buttons & dashboard lists)

**Goal:** Use shared Button variants everywhere; optional shared list/pagination for dashboard.

### 6.1 Standardize on `Button` variants

| Step | Action |
|------|--------|
| 1 | Audit StudentSessionWorkspace, TrainerSessionWorkspace, ActiveSessionsList, MonitorSelectionClient, FileSelectionModal, FolderExplorerView, FeesListClient, UsersListClient for long button class strings. |
| 2 | Replace with `<Button variant="secondary">`, `<Button variant="outline">`, etc. from `components/ui/button.tsx`. Add a variant (e.g. `refresh`) if needed. |
| 3 | Remove ad-hoc duplicate class strings. |

**Files touched:** Multiple components (see CODEBASE-ANALYSIS.md §2.10).

### 6.2 (Optional) Shared dashboard list pattern

| Step | Action |
|------|--------|
| 1 | Introduce a small `useDashboardList` or shared table/pagination component for list + filters + pagination. |
| 2 | Refactor `UsersListClient` and `FeesListClient` to use it so loading, pagination, and “Loading…” UI are consistent. |

**Files touched:** New hook or component, `UsersListClient.tsx`, `FeesListClient.tsx`.

---

### Verification tests — Phase 6

| # | Test | How to verify | Pass criteria |
|---|------|----------------|----------------|
| 6.1 | **Button styles** | Visually check Join, Monitor, Session workspaces, Dashboard lists. | Buttons look correct (primary/secondary/outline) and consistent. |
| 6.2 | **Dashboard users list** | Open dashboard users list; search, filter, paginate. | Same behavior as before; no layout or style regressions. |
| 6.3 | **Dashboard fees list** | Open dashboard fees list; search, filter, paginate. | Same behavior; consistent with users list if shared pattern used. |
| 6.4 | **Build** | `pnpm build`. | No TypeScript or build errors. |

---

## Phase completion checklist

Use this to track progress. Mark when a phase is done and verified.

| Phase | Done | Verified (tests passed) | Notes |
|-------|------|------------------------|-------|
| 1 – Session params & student entry | ☐ | ☐ | |
| 2 – Monitor session list | ☐ | ☐ | |
| 3 – Execution & cancellation utils | ☐ | ☐ | |
| 4 – Payment modals | ☐ | ☐ | |
| 5 – Refresh & session messages | ☐ | ☐ | |
| 6 – UI consistency | ☐ | ☐ | |

---

## Recommended order

- **Phase 1** first (foundation for session code and URLs).
- **Phase 2** next (reduces duplication in monitor and keeps cache consistent).
- **Phases 3–5** can be done in any order; 3 and 4 are medium impact, 5 is low.
- **Phase 6** last (cosmetic and optional list refactor).

After each phase, run the phase’s verification tests and the full app build before moving on.

---

*This plan is derived from [CODEBASE-ANALYSIS.md](./CODEBASE-ANALYSIS.md). Update both docs when you complete phases or change the approach.*
