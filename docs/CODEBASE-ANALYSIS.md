# Codehub Live Coding Platform — Codebase Analysis

This document maps the **live-coding** `src/` structure, identifies duplicate or near-duplicate code, and recommends reuse opportunities. It focuses on the app, session, workspace, monitor, and dashboard areas.

---

## Table of Contents

1. [Full Codebase Inventory](#1-full-codebase-inventory) — Directory-by-directory overview
2. [Duplicate or Near-Duplicate Code](#2-duplicate-or-near-duplicate-code) — Functions/components to consolidate
3. [Reuse Opportunities (by area)](#3-reuse-opportunities-by-area) — Student, Trainer, Workspace, Session, Monitor, Dashboard
4. [Cross-Cutting Concerns](#4-cross-cutting-concerns) — Auth, API, types, theme
5. [Summary of concrete next steps](#5-summary-of-concrete-next-steps)
6. [Appendix: Complete File Listing](#appendix-complete-file-listing) — All `src/` files (ts/tsx/js/jsx)

---

## 1. Full Codebase Inventory

### 1.1 `src/` (root)

| File / Directory | Description |
|------------------|-------------|
| `payload.config.ts` | Payload CMS config: collections, db, admin, plugins. |
| `payload-types.ts` | Auto-generated Payload types (Users, Media, etc.). |
| `environment.d.ts` | TypeScript env declarations. |
| `cssVariables.js` | CSS variable definitions. |
| `middleware.ts` | Next.js middleware (auth, redirects). |

### 1.2 `src/access/`

| File | Description |
|------|-------------|
| `adminOnly.ts` | Payload access: admin only. |
| `anyone.ts` | Payload access: public. |
| `authenticated.ts` | Payload access: authenticated users. |
| `authenticatedOrPublished.ts` | Payload access: authenticated or published. |

### 1.3 `src/app/`

Next.js App Router: route segments and page/client components.

#### `(app)/` — Authenticated app shell

| Path | Description |
|------|-------------|
| `layout.tsx` | App layout (wraps dashboard, session, join, etc.). |
| **Dashboard** | |
| `dashboard/layout.tsx` | Dashboard layout (nav, sidebar). |
| `dashboard/page.tsx` | Dashboard home route. |
| `dashboard/DashboardHomeClient.tsx` | Dashboard home: stats, quick links, current user. |
| `dashboard/users/page.tsx` | Users list page. |
| `dashboard/users/UsersListClient.tsx` | Users list: search, pagination, role filter, CRUD. |
| `dashboard/users/[id]/page.tsx` | User detail page. |
| `dashboard/users/[id]/UserDetailClient.tsx` | User detail view. |
| `dashboard/users/[id]/edit/page.tsx` | User edit page. |
| `dashboard/users/new/page.tsx` | New user page. |
| `dashboard/fees/page.tsx` | Fees list page. |
| `dashboard/fees/FeesListClient.tsx` | Fees list: search, filters, pagination. |
| `dashboard/fees/[id]/page.tsx` | Fee detail page. |
| `dashboard/fees/[id]/FeeDetailClient.tsx` | Fee detail and installments. |
| `dashboard/fees/[id]/edit/page.tsx` | Fee edit page. |
| `dashboard/fees/new/page.tsx` | New fee page. |
| `dashboard/workspaces/page.tsx` | Workspaces list page. |
| `dashboard/workspaces/WorkspacesListClient.tsx` | Workspaces list: student sidebar, empty state. |
| `dashboard/workspaces/[userId]/layout.tsx` | Workspace view layout. |
| `dashboard/workspaces/[userId]/page.tsx` | User workspace page. |
| `dashboard/workspaces/[userId]/WorkspaceViewClient.tsx` | Renders WorkspaceLayout for a user. |
| `dashboard/files/page.tsx` | Files list page. |
| `dashboard/folders/page.tsx` | Folders list page. |
| `dashboard/settings/page.tsx` | Settings page. |
| `dashboard/settings/SettingsClient.tsx` | Settings form client. |
| **Join & Session** | |
| `join/page.tsx` | Join session page. |
| `join/JoinSessionClient.tsx` | Join: code input, session list, payment modals. |
| `session/[code]/page.tsx` | Legacy session route (student). |
| `session/[code]/StudentSessionClient.tsx` | Legacy student session: scratchpad + trainer tab (no workspace). |
| `student/session/[code]/page.tsx` | Student session page (workspace-based). |
| `student/session/[code]/StudentSessionClient.tsx` | Student session client: uses StudentSessionWorkspace. |
| `trainer/start/page.tsx` | Trainer start session page. |
| `trainer/start/TrainerStartClient.tsx` | Trainer start: session list, create session. |
| `trainer/session/[code]/page.tsx` | Trainer session page. |
| `trainer/session/[code]/TrainerSessionClient.tsx` | Trainer session client: uses TrainerSessionWorkspace. |
| **Workspace** | |
| `workspace/page.tsx` | Workspace root page. |
| `workspace/WorkspacePageClient.tsx` | Own workspace: payment check, WorkspaceLayout. |
| `workspace/explorer/[slug]/page.tsx` | Folder explorer page. |
| `workspace/explorer/[slug]/FolderExplorerPageClient.tsx` | Folder explorer client (scoped workspace). |
| `workspace/folder/[slug]/page.tsx` | Folder workspace page. |
| **Staff / Monitor** | |
| `staff/monitor/page.tsx` | Monitor selection page. |
| `staff/monitor/MonitorSelectionClient.tsx` | Monitor: session list (custom fetch), manual code entry. |
| `staff/monitor/[code]/page.tsx` | Monitor session page. |
| `staff/monitor/[code]/MonitorViewClient.tsx` | Monitor view: loads session, students; renders MonitorWorkspace. |

#### `(frontend)/` — Public frontend (marketing, posts)

| Path | Description |
|------|-------------|
| `layout.tsx` | Frontend layout. |
| `page.tsx`, `page-client.tsx` | Home page. |
| `[slug]/page.tsx`, `page.client.tsx` | Dynamic page by slug. |
| `posts/page.tsx`, `posts/page.client.tsx` | Posts list. |
| `posts/[slug]/page.tsx`, `page.client.tsx` | Post detail. |
| `posts/page/[pageNumber]/page.tsx`, `page.client.tsx` | Posts pagination. |
| `search/page.client.tsx` | Search page. |
| `signup/page.tsx` | Signup page. |
| `not-found.tsx` | 404. |

#### `(live)/` — Live lecture (alternative live flow)

| Path | Description |
|------|-------------|
| `layout.tsx` | Live layout. |
| `Live/page.tsx` | Live lecture list/entry. |
| `Live/LiveLectureClient.tsx` | Live lecture client. |
| `Live/[lectureId]/page.tsx` | Single lecture page. |

#### `(payload)/` — Payload admin

| Path | Description |
|------|-------------|
| `layout.tsx` | Payload layout. |
| `admin/[[...segments]]/page.tsx` | Payload admin app. |
| `admin/[[...segments]]/not-found.tsx` | Admin 404. |
| `admin/importMap.js` | Import map for admin. |
| `api/[...slug]/route.ts` | Payload API proxy. |
| `api/graphql/route.ts` | GraphQL. |
| `api/graphql-playground/route.ts` | GraphQL playground. |

#### `api/` — Next.js API routes (app API, not Payload)

| Path | Description |
|------|-------------|
| `execute/route.ts` | Code execution proxy (e.g. OneCompiler). |
| `sessions/list/route.ts` | List active sessions (optional trainerId). |
| `sessions/start/route.ts` | Start a session. |
| `sessions/[code]/live/route.ts` | Get session live data. |
| `sessions/[code]/metadata/route.ts` | Session metadata. |
| `sessions/[code]/join/route.ts` | Join session. |
| `sessions/[code]/leave/route.ts` | Leave session. |
| `sessions/[code]/end/route.ts` | End session. |
| `sessions/[code]/broadcast/route.ts` | Broadcast trainer code. |
| `sessions/[code]/students/route.ts` | List students in session. |
| `sessions/[code]/scratchpad/route.ts` | Scratchpad get/put. |
| `workspace/files/route.ts` | Workspace files CRUD. |
| `workspace/upload/route.ts` | Workspace upload. |
| `workspace/download/route.ts` | Workspace download. |
| `files/route.ts`, `files/[id]/route.ts`, `files/[id]/delete/route.ts` | File APIs. |
| `folders/[id]/route.ts`, `folders/[id]/delete/route.ts` | Folder APIs. |
| `dashboard/users/route.ts`, `dashboard/users/[id]/route.ts` | Dashboard users. |
| `dashboard/fees/route.ts`, `dashboard/fees/[id]/route.ts`, `dashboard/fees/[id]/installments/...` | Dashboard fees. |
| `dashboard/workspace/[userId]/files/route.ts`, `.../folders/route.ts` | Dashboard workspace files/folders. |
| `dashboard/stats/route.ts` | Dashboard stats. |
| `dashboard/activity/route.ts` | Dashboard activity. |
| `dashboard/settings/route.ts` | Dashboard settings. |
| `user/payment-status/route.ts` | User payment status. |
| `ai/live-assistant/route.ts` | AI live assistant. |
| `cron/deactivate-sessions/route.ts` | Cron: deactivate stale sessions. |
| `test-payment-guard/route.ts` | Test payment guard. |

### 1.4 `src/auth/`

| File | Description |
|------|-------------|
| `getMeUser.ts` | Server-side: get current user from Payload auth (cookies/headers). |

### 1.5 `src/blocks/` (Payload blocks for frontend)

| Path | Description |
|------|-------------|
| `ArchiveBlock/` | Archive block component + config. |
| `Banner/` | Banner component + config. |
| `CallToAction/` | CTA component + config. |
| `Code/` | Code block (Component, Component.client, config, CopyButton). |
| `Content/` | Content block + config. |
| `Form/` | Form block (Checkbox, Country, Email, Error, Message, Number, Select, State, Text, Textarea, Width, etc.). |
| `MediaBlock/` | Media block + config. |
| `RelatedPosts/` | Related posts + config. |
| `RenderBlocks.tsx` | Renders block list. |

### 1.6 `src/collections/`

| Path | Description |
|------|-------------|
| `Users/index.ts` | Users collection config. |
| `Categories.ts` | Categories collection. |
| `Fees.ts` | Fees collection. |
| `Files.ts` | Files collection. |
| `Folders.ts` | Folders collection. |
| `Languages.ts` | Languages collection. |
| `LiveSessions.ts` | Live sessions collection. |
| `Media.ts` | Media collection. |
| `Pages/index.ts` | Pages collection; `hooks/revalidatePage.ts`. |
| `Posts/index.ts` | Posts collection; `hooks/revalidatePost.ts`, `populateAuthors.ts`. |

### 1.7 `src/components/`

#### Session & SessionWorkspace

| File | Description |
|------|-------------|
| `Session/ActiveSessionsList.tsx` | List of active sessions (uses useActiveSessionsList); refresh, select action. |
| `Session/FileSelectionModal.tsx` | Modal to pick a workspace file (e.g. for trainer broadcast). |
| `Session/SessionMetadataModal.tsx` | Modal showing session metadata. |
| `Session/SimpleCodeViewer.tsx` | Read-only code viewer (no Monaco), plain &lt;pre&gt;. |
| `Session/index.ts` | Re-exports Session components. |
| `SessionWorkspace/StudentSessionWorkspace.tsx` | Student session UI: trainer tab + my code tab, workspace editor, file explorer, output, AI. |
| `SessionWorkspace/TrainerSessionWorkspace.tsx` | Trainer session UI: editor, students panel, student code viewer, broadcast, end session. |

#### Workspace

| File | Description |
|------|-------------|
| `Workspace/WorkspaceLayout.tsx` | Full workspace layout: explorer, editor, output, AI, payment modals. |
| `Workspace/WorkspaceModeLayout.tsx` | Shared 3-column layout (explorer | editor | output+AI). |
| `Workspace/WorkspaceHeader.tsx` | Workspace header (title, nav). |
| `Workspace/WorkspaceEditor.tsx` | Editor wrapper (Monaco via LiveCodePlayground). |
| `Workspace/WorkspaceEditorHeader.tsx` | Editor header (language, run, etc.). |
| `Workspace/WorkspaceViewControls.tsx` | Toggles for explorer, output, AI. |
| `Workspace/WorkspaceModeToggle.tsx` | Toggle explorer vs workspace mode. |
| `Workspace/FileExplorer.tsx` | File tree for workspace. |
| `Workspace/FileExplorerSidebar.tsx` | Sidebar that wraps FileExplorer + controls. |
| `Workspace/FileTreeItem.tsx` | Single file/folder tree item. |
| `Workspace/FolderExplorerView.tsx` | Folder-centric explorer view. |
| `Workspace/NoFileSelectedView.tsx` | Empty state when no file selected. |
| `Workspace/OutputPanelWrapper.tsx` | Wraps OutputPanel in workspace layout. |
| `Workspace/AIAssistantPanelWrapper.tsx` | Wraps AI panel in workspace/session. |
| `Workspace/FileSwitchingOverlay.tsx` | Overlay during file switch. |
| `Workspace/ViewToggleButton.tsx` | Generic view toggle button. |
| `Workspace/CreateFileModal.tsx` | Create file modal. |
| `Workspace/CreateFolderModal.tsx` | Create folder modal. |
| `Workspace/RenameItemModal.tsx` | Rename file/folder modal. |
| `Workspace/MoveItemModal.tsx` | Move file/folder modal. |
| `Workspace/UploadModal.tsx` | Upload modal. |
| `Workspace/index.ts` | Re-exports Workspace components. |

#### LiveCodePlayground & AI

| File | Description |
|------|-------------|
| `LiveCodePlayground/LiveCodePlayground.tsx` | Monaco editor + run + optional output (single-file playground). |
| `LiveCodePlayground/OutputPanel.tsx` | Displays execution result (stdout, stderr, status). |
| `LiveCodePlayground/types.ts` | SUPPORTED_LANGUAGES, playground types. |
| `LiveCodePlayground/index.ts` | Re-exports. |
| `AIAssistant/AIAssistantPanel.tsx` | AI assistant panel (chat, code help). |
| `AIAssistant/index.ts` | Re-exports. |

#### LiveLecture (alternative live flow)

| File | Description |
|------|-------------|
| `LiveLecture/StudentView.tsx` | Student view: trainer code + scratchpad (liveSessionStore). |
| `LiveLecture/TrainerView.tsx` | Trainer view: editor, save, broadcast. |
| `LiveLecture/index.ts` | Re-exports. |

#### Monitor

| File | Description |
|------|-------------|
| `Monitor/MonitorWorkspace.tsx` | Monitor layout: UserSidebar + CodeViewer. |
| `Monitor/CodeViewer.tsx` | Read-only Monaco + run + output for one user (trainer or student). |
| `Monitor/UserSidebar.tsx` | Sidebar list of users (trainer + students) for monitor. |

#### Dashboard

| File | Description |
|------|-------------|
| `Dashboard/DashboardLayout.tsx` | Dashboard layout wrapper. |
| `Dashboard/DashboardNav.tsx` | Dashboard navigation. |
| `Dashboard/StatsCard.tsx` | Stats card component. |
| `Dashboard/RecentActivity.tsx` | Recent activity list. |
| `Dashboard/StudentListSidebar.tsx` | Student list sidebar (e.g. workspaces list). |
| `Dashboard/UserForm.tsx` | User create/edit form. |
| `Dashboard/FeeForm.tsx` | Fee form. |
| `Dashboard/SettingsForm.tsx` | Settings form. |

#### Payment

| File | Description |
|------|-------------|
| `Payment/PaymentBlocked.tsx` | Blocking UI when payment is required. |
| `Payment/PaymentDueModal.tsx` | Payment due modal. |
| `Payment/PaymentGracePeriodModal.tsx` | Grace period modal. |
| `Payment/TrialEndingSoonModal.tsx` | Trial ending soon modal. |
| `Payment/TrialGracePeriodModal.tsx` | Trial grace period modal. |

#### Shared / UI / Other

| File | Description |
|------|-------------|
| `ui/button.tsx`, `card.tsx`, `checkbox.tsx`, `input.tsx`, `label.tsx`, `pagination.tsx`, `select.tsx`, `textarea.tsx` | Shared UI primitives. |
| `FloatingLogout/index.tsx` | Floating logout button. |
| `AuthErrorHandler/AuthErrorHandler.tsx` | Handles auth errors. |
| `BeforeDashboard/index.tsx` | Pre-dashboard gate. |
| `BeforeLogin/index.tsx` | Pre-login gate. |
| `AdminBar/index.tsx` | Admin bar. |
| `Card/index.tsx` | Card component. |
| `Link/index.tsx` | Link component. |
| `Logo/Logo.tsx` | Logo. |
| `Media/` | Media display (ImageMedia, VideoMedia, types). |
| `Pagination/index.tsx`, `PageRange/index.tsx` | Pagination helpers. |
| `PayloadRedirects/index.tsx` | Payload redirects. |
| `RichText/index.tsx` | Rich text renderer. |
| `LivePreviewListener/index.tsx` | Live preview listener. |

### 1.8 `src/db/`

| File | Description |
|------|-------------|
| `adapter.ts` | Payload DB adapter (e.g. Drizzle). |

### 1.9 `src/endpoints/`

| Path | Description |
|------|-------------|
| `seed/*.ts` | Seed endpoints (contact, home, images, posts, etc.). |

### 1.10 `src/fields/`

| File | Description |
|------|-------------|
| `defaultLexical.ts` | Default Lexical editor config. |
| `link.ts`, `linkGroup.ts` | Link field configs. |

### 1.11 `src/hooks/`

| File | Description |
|------|-------------|
| `useCurrentUser.ts` | React Query: current user (GET /api/users/me). |
| `useFileSave.ts` | File save helper. |
| `useFileSelectionModal.ts` | File selection modal state. |
| `useCodeExecution.ts` | Code execution hook. |
| **session/** | |
| `session/useSessionData.ts` | React Query: session live data (polling, pause on hidden). |
| `session/useSessionCache.ts` | Session cache (localStorage). |
| `session/useActiveSessionsList.ts` | React Query: active sessions list. |
| **workspace/** | |
| `workspace/useWorkspaceData.ts` | Workspace root folders + invalidation. |
| `workspace/useExplorerData.ts` | Explorer data (folders/files for tree). |
| `workspace/useFileSelection.ts` | Selected file, switch file, auto-save before switch. |
| `workspace/useFileContent.ts` | Load/save file content. |
| `workspace/useSaveCode.ts` | Save code to current file. |
| `workspace/useSaveAndRun.ts` | Save + run. |
| `workspace/useWorkspaceCodeExecution.ts` | Run current file (language, code from state). |
| `workspace/useWorkspaceImportExport.ts` | Import/export workspace. |
| `workspace/useFolderExplorerHandlers.ts` | Create/rename/move/delete folder handlers. |
| **payment/** | |
| `payment/usePaymentStatus.ts` | React Query: user payment status. |

### 1.12 `src/providers/`

| File | Description |
|------|-------------|
| `index.tsx` | Composes providers (Query, Theme, etc.). |
| `Theme/index.tsx` | Theme provider. |
| `Theme/InitTheme/index.tsx` | Theme init from storage. |
| `Theme/ThemeSelector/` | Theme selector UI. |
| `Theme/shared.ts`, `Theme/types.ts` | Theme shared types. |
| `HeaderTheme/index.tsx` | Header theme. |

### 1.13 `src/services/`

| File | Description |
|------|-------------|
| `codeExecution.ts` | executeCode() via /api/execute; ExecutionResult type. |
| `liveSessionStore.ts` | In-memory store for live lecture (getCurrentSnapshot, subscribeToEvents). |

### 1.14 `src/types/`

| File | Description |
|------|-------------|
| `workspace.ts` | Workspace types (e.g. WorkspaceFileWithContent). |
| `ai-assistant.ts` | AI assistant types. |
| `live-session.ts` | Live session / CodeSnapshot types. |

### 1.15 `src/utilities/`

| File | Description |
|------|-------------|
| `getURL.ts` | getServerSideURL(), getClientSideURL(). |
| `joinCode.ts` | generateJoinCode(), isValidJoinCode(). |
| `languageInference.ts` | inferLanguageFromFileName(). |
| `workspaceScope.ts` | buildFolderPathChain, BasicFolderRef, scope helpers. |
| `sessionExpiration.ts` | Session expiration helpers. |
| `sessionFileFetcher.ts` | Fetch session-related files. |
| `paymentGuard.ts` | Payment guard helpers. |
| `checkPaymentStatusServer.ts` | Server-side payment check. |
| `accessStatus.ts`, `accessStatusCore.ts` | Access status (trial, grace, etc.). |
| `dashboardAccess.ts` | hasFullAccess, etc. |
| `devApiLogger.ts` | logApiFetch for dev. |
| `apiErrorResponse.ts` | API error response helper. |
| `ui.ts` | cn() and other UI utils. |
| `canUseDOM.ts` | SSR-safe DOM check. |
| `deepMerge.ts` | Deep merge. |
| `formatAuthors.ts`, `formatDateTime.ts` | Formatting. |
| `generateMeta.ts`, `mergeOpenGraph.ts` | Meta/OG. |
| `generatePreviewPath.ts` | Preview path. |
| `getDocument.ts`, `getGlobals.ts` | DOM/globals. |
| `getMediaUrl.ts` | Media URL. |
| `getRedirects.ts` | Redirects. |
| `toKebabCase.ts` | String to kebab-case. |
| `useDebounce.ts` | Debounce hook. |
| `useClickableCard.ts` | Clickable card hook. |
| `useFolderFileFilter.ts` | Filter folder/files. |
| **aiAssistant/** | |
| `aiAssistant/index.ts` | AI assistant utils. |
| `aiAssistant/codeFrameGenerator.ts` | Code frame generation. |
| `aiAssistant/dryRunParser.ts` | Dry run parser. |
| `aiAssistant/errorClassifier.ts` | Error classification. |
| `aiAssistant/errorParser.ts` | Error parsing. |
| `aiAssistant/promptBuilder.ts` | Prompt building. |
| `aiAssistant/responseValidator.ts` | Response validation. |

### 1.16 `src/migrations/`

| File | Description |
|------|-------------|
| `index.ts` | Migrations index. |
| `20260127_102817_initial_schema.ts` | Initial DB schema. |

### 1.17 `src/plugins/`

| File | Description |
|------|-------------|
| `index.ts` | Payload plugins. |

### 1.18 `src/Settings/`

| File | Description |
|------|-------------|
| `config.ts` | Payload settings config. |

### 1.19 `src/search/`

| File | Description |
|------|-------------|
| `beforeSync.ts` | Search beforeSync. |
| `Component.tsx` | Search component. |
| `fieldOverrides.ts` | Search field overrides. |

### 1.20 `src/Footer/`, `src/Header/`, `src/heros/`

Layout and hero components for frontend (Footer, Header, heros with configs and revalidation hooks).

---

## 2. Duplicate or Near-Duplicate Code

### 2.1 Route param normalization — `normalizeCodeParam`

**Locations:**

- `src/app/(app)/session/[code]/StudentSessionClient.tsx`
- `src/app/(app)/student/session/[code]/StudentSessionClient.tsx`
- `src/app/(app)/trainer/session/[code]/TrainerSessionClient.tsx`
- `src/app/(app)/staff/monitor/[code]/MonitorViewClient.tsx`

**Suggestion:** Extract to a shared util, e.g. `src/utilities/sessionParams.ts`:

```ts
export function normalizeCodeParam(codeParam: string | string[] | undefined): string {
  const code = Array.isArray(codeParam) ? codeParam[0] : codeParam
  return (code || '').toUpperCase()
}
```

Use this in all four clients.

---

### 2.2 Output mapping — `mapOutputToExecutionResult`

**Locations:**

- `src/app/(app)/session/[code]/StudentSessionClient.tsx`
- `src/app/(app)/staff/monitor/[code]/MonitorViewClient.tsx`

**Suggestion:** Move to `src/services/codeExecution.ts` (or a small `src/utilities/executionResult.ts`) and reuse in both. Keeps OneCompiler-shaped output → `ExecutionResult` in one place.

---

### 2.3 Cancellation error check — `isCancellationError`

**Location:** `src/components/SessionWorkspace/StudentSessionWorkspace.tsx` (inline helper).

**Suggestion:** Extract to e.g. `src/utilities/cancellationError.ts` and use in any component that needs to ignore AbortError/cancel (e.g. future trainer or shared fetch logic).

---

### 2.4 Two student session entry points

- **Legacy:** `(app)/session/[code]/StudentSessionClient.tsx` — scratchpad + trainer tab, no workspace.
- **Workspace-based:** `(app)/student/session/[code]/StudentSessionClient.tsx` — uses `StudentSessionWorkspace`.

**Suggestion:** Decide a single student session UX (recommended: workspace-based). Then either:

- Redirect `session/[code]` → `student/session/[code]`, or  
- Remove the legacy route and client and point all “join session” links to `student/session/[code]`.

---

### 2.5 Two code viewers

| Component | Path | Role |
|-----------|------|------|
| **SimpleCodeViewer** | `Session/SimpleCodeViewer.tsx` | Read-only, no Monaco; plain &lt;pre&gt;. |
| **CodeViewer** (Monitor) | `Monitor/CodeViewer.tsx` | Read-only Monaco + run + output for one user. |

**Suggestion:** Keep both but document:

- Use **SimpleCodeViewer** when you only need to show code (e.g. trainer scratchpad in trainer tab, small previews).
- Use **Monitor/CodeViewer** when you need full editor + run (monitor view). Optionally, have Monitor/CodeViewer accept an optional “simple” mode that renders SimpleCodeViewer for consistency when run is not needed.

---

### 2.6 Session list fetching: hook vs custom fetch

- **useActiveSessionsList** (`hooks/session/useActiveSessionsList.ts`): React Query, used by `ActiveSessionsList` (Join, Trainer Start).
- **MonitorSelectionClient**: Own `fetchSessions`, `useState` for sessions/loading/error, no React Query.

**Suggestion:** Use `useActiveSessionsList` in MonitorSelectionClient and render `ActiveSessionsList` (or a variant with “Monitor” action). That gives one cache, consistent loading/error/refresh and less duplicated fetch/state logic.

---

### 2.7 Payment modals repeated in multiple clients

Same set of payment modals and similar “show on paymentStatus” logic appear in:

- `WorkspaceLayout.tsx`
- `session/[code]/StudentSessionClient.tsx`
- `student/session/[code]/StudentSessionClient.tsx`

**Suggestion:** Extract a small component or hook, e.g. `PaymentModals` or `usePaymentModals(sessionCode?)`, that:

- Uses `usePaymentStatus` (and optionally session payment status),
- Sets which modal to show (due, grace, trial ending, trial grace),
- Renders `PaymentBlocked`, `PaymentDueModal`, `PaymentGracePeriodModal`, `TrialEndingSoonModal`, `TrialGracePeriodModal`.

Then use that in the three places above so payment UX and copy stay in one place.

---

### 2.8 Loading / error copy for sessions

Similar strings used in several places:

- “Loading session…”, “Session not found.”, “Failed to load session.”, “Invalid session code”

**Locations:** StudentSessionClient (both), TrainerSessionClient, MonitorViewClient, JoinSessionClient, ActiveSessionsList, SessionMetadataModal, API routes.

**Suggestion:** Add a small `src/utilities/sessionMessages.ts` (or constants) for user-facing session messages and use it in clients and optionally in API responses. Reduces copy-paste and keeps wording consistent.

---

### 2.9 Refresh button + success state

Same pattern in:

- `Session/ActiveSessionsList.tsx`
- `MonitorSelectionClient.tsx`
- (conceptually similar in TrainerSessionWorkspace / StudentSessionWorkspace for “Refresh” actions)

**Suggestion:** Extract a reusable `RefreshButton` (or `useRefreshWithSuccess`) that handles: loading, disabled, “Refreshed!” feedback with timeout. Reuse in ActiveSessionsList, MonitorSelectionClient, and any other refresh actions.

---

### 2.10 Shared button/link styles

Repeated class strings for:

- “flex items-center gap-1.5 rounded-md border px-3 py-1.5 …” (secondary-style buttons)
- “bg-primary text-primary-foreground … hover:bg-primary/90” (primary buttons)

**Locations:** StudentSessionWorkspace, TrainerSessionWorkspace, ActiveSessionsList, MonitorSelectionClient, FileSelectionModal, FolderExplorerView, FeesListClient, UsersListClient, etc.

**Suggestion:** Prefer `components/ui/button.tsx` variants (e.g. `default`, `secondary`, `outline`) everywhere and remove ad-hoc long class strings. If needed, add one more variant (e.g. “refresh”) instead of duplicating the same classes.

---

### 2.11 Dashboard list clients: similar structure

`UsersListClient` and `FeesListClient` share:

- Local state: list, loading, error, search, filters, page, totalPages, totalDocs
- fetch on mount and when filters/page change
- Pagination UI (ChevronLeft/ChevronRight, “Loading…”)
- Table/card list + actions (view, edit, delete, etc.)

**Suggestion:** Introduce a generic `useListQuery` or small data-table component (or reuse a shared table + pagination) parameterized by endpoint, columns, and filters. At minimum, share pagination and “Loading…” UI so behavior and styling are consistent.

---

## 3. Reuse Opportunities (by area)

### 3.1 Student view (StudentSessionWorkspace, student-specific)

- **Payment:** Use the shared Payment modals component/hook (see 2.7) so student session and workspace both get the same payment UX.
- **Session code:** Use shared `normalizeCodeParam` and, if applicable, session messages util (2.1, 2.8).
- **Cancellation:** Use shared `isCancellationError` (2.3) if you add more async flows (e.g. trainer refresh).
- **Buttons:** Prefer `Button` from `ui/button` with variants instead of raw class strings (2.10).

### 3.2 Trainer view (TrainerSessionWorkspace, trainer-specific)

- **Session code:** Use shared `normalizeCodeParam` in `TrainerSessionClient` (2.1).
- **Layout:** Already reuses `WorkspaceModeLayout`, `FileExplorerSidebar`, `WorkspaceEditor`, `OutputPanelWrapper`, `AIAssistantPanelWrapper`, `NoFileSelectedView`, `FileSwitchingOverlay`, `WorkspaceEditorHeader`, `WorkspaceViewControls`, `ViewToggleButton`, `FolderExplorerView`, `WorkspaceModeToggle`, `WorkspaceHeader` — good.
- **Student code display:** Trainer uses `SimpleCodeViewer` for student scratchpad; keep that. For “run student code” in trainer view, you already use execution service; ensure any output mapping uses shared `mapOutputToExecutionResult` if you add similar logic elsewhere (2.2).
- **Buttons:** Same as student — use `Button` variants (2.10).

### 3.3 Workspace (SessionWorkspace vs WorkspaceLayout)

- **Layout:** `WorkspaceModeLayout` is already shared by WorkspaceLayout, StudentSessionWorkspace, and TrainerSessionWorkspace — no change needed.
- **Payment:** Use the same Payment modals/hook in `WorkspaceLayout` as in student/trainer session clients (2.7).
- **Explorer, editor, output, AI:** All three use the same Workspace subcomponents; no extra reuse needed beyond the payment consolidation.

### 3.4 Session (session components, SimpleCodeViewer, types)

- **ActiveSessionsList:** Use it in Monitor (replace custom fetch in MonitorSelectionClient) so session list is consistent and cached (2.6).
- **SimpleCodeViewer:** Keep as the shared “no Monaco” viewer; document when to use it vs Monitor/CodeViewer (2.5).
- **Session types:** `useSessionData` already exposes `SessionLiveData` and `PaymentStatus`; use these types in all session clients and avoid redefining local `PaymentStatus` (e.g. in JoinSessionClient) — import from hook or a shared types file.

### 3.5 Monitor (monitoring/overview)

- **Session list:** Use `useActiveSessionsList` + `ActiveSessionsList` (or a “Monitor” variant) in MonitorSelectionClient instead of custom fetch (2.6).
- **Session code / errors:** Use `normalizeCodeParam` and shared session messages in MonitorViewClient (2.1, 2.8).
- **Output mapping:** Use shared `mapOutputToExecutionResult` in MonitorViewClient (2.2).
- **CodeViewer:** Keep Monitor/CodeViewer for “user + run” view; optionally use SimpleCodeViewer in a compact “preview” mode if you add one.

### 3.6 Dashboard (dashboard components)

- **Lists:** Share list/pagination pattern between UsersListClient and FeesListClient (2.11); consider a small `useDashboardList` or shared table component.
- **Forms:** UserForm, FeeForm, SettingsForm are already separate; no immediate duplication.
- **Workspace view:** WorkspaceViewClient correctly uses WorkspaceLayout; no change.

---

## 4. Cross-Cutting Concerns

### 4.1 Auth

- **Server:** `auth/getMeUser.ts` uses Payload `payload.auth({ headers })` and is the single place for “get me” on the server. Keep using it from layout/protected routes.
- **Client:** `useCurrentUser` (React Query) is used in Dashboard, TrainerStart, Join (indirectly), FloatingLogout. Ensure any new protected UI uses either getMeUser (server) or useCurrentUser (client), not ad-hoc fetch.

**Recommendation:** Document in a short “Auth” section in README or CONTRIBUTING: use getMeUser for server components and useCurrentUser for client; avoid new direct `/api/users/me` or equivalent without going through these.

### 4.2 API client

- No single “API client” module: callers use `fetch()` with `/api/...` and credentials. React Query hooks (`useSessionData`, `useActiveSessionsList`, `usePaymentStatus`, `useCurrentUser`) encapsulate most of this.
- **Recommendation:** Keep using React Query for session, payment, user, and (after refactor) monitor session list. If you add more API surface, consider a thin `apiClient` (e.g. base URL + credentials + error handling) and use it inside React Query `queryFn`s, or keep `queryFn`s as they are and only centralize URL building if needed (e.g. getClientSideURL() already exists in getURL.ts).

### 4.3 Types

- **Payload:** `payload-types.ts` is the source of truth for collections.
- **Session / payment:** `useSessionData` exports `SessionLiveData` and `PaymentStatus`; use these in app code instead of redefining (e.g. JoinSessionClient).
- **Execution:** `ExecutionResult` in `services/codeExecution.ts`; use it everywhere execution result is shown. Consolidate `mapOutputToExecutionResult` there or in a small util (2.2).
- **Workspace:** `types/workspace.ts` (e.g. WorkspaceFileWithContent); SessionWorkspace and WorkspaceLayout already use it.

**Recommendation:** Add a short “Types” section: prefer payload-types, useSessionData types, ExecutionResult, and workspace types; avoid duplicate local interfaces for the same domain.

### 4.4 Theming

- Theme is centralized in `providers/Theme`; LiveCodePlayground and Monitor/CodeViewer use `useTheme()` for Monaco (vs-dark vs vs). No duplication issue.

### 4.5 Logging / dev

- `devApiLogger.ts` (`logApiFetch`) is used in useSessionData, useActiveSessionsList, usePaymentStatus, useCurrentUser. Keep using it in new hooks for consistency.

---

## 5. Summary of concrete next steps

| Priority | Action |
|----------|--------|
| High | Extract `normalizeCodeParam` to `utilities/sessionParams.ts` and use in all four session/monitor clients. |
| High | Use `useActiveSessionsList` and `ActiveSessionsList` (or variant) in MonitorSelectionClient; remove custom session fetch. |
| High | Unify student session entry: redirect or remove `session/[code]` in favor of `student/session/[code]`. |
| Medium | Extract `mapOutputToExecutionResult` to codeExecution or a small util; use in session and monitor clients. |
| Medium | Add `PaymentModals` (or `usePaymentModals`) and use it in WorkspaceLayout and both StudentSessionClients. |
| Medium | Extract `isCancellationError` to utilities; use in StudentSessionWorkspace (and elsewhere if needed). |
| Medium | Introduce shared `RefreshButton` or `useRefreshWithSuccess`; use in ActiveSessionsList and MonitorSelectionClient. |
| Low | Standardize on `Button` variants; replace repeated long button classes. |
| Low | Add `sessionMessages` (or constants) for “Loading session…”, “Session not found.”, etc. |
| Low | Consider shared list/pagination pattern for UsersListClient and FeesListClient. |

---

## Appendix: Complete File Listing

All source files under `src/` (TypeScript/JavaScript), sorted by path. Use this for quick lookup and to ensure no area is missed when refactoring.

```
src/access/adminOnly.ts
src/access/anyone.ts
src/access/authenticated.ts
src/access/authenticatedOrPublished.ts
src/app/(app)/dashboard/DashboardHomeClient.tsx
src/app/(app)/dashboard/fees/[id]/edit/page.tsx
src/app/(app)/dashboard/fees/[id]/FeeDetailClient.tsx
src/app/(app)/dashboard/fees/[id]/page.tsx
src/app/(app)/dashboard/fees/FeesListClient.tsx
src/app/(app)/dashboard/fees/new/page.tsx
src/app/(app)/dashboard/fees/page.tsx
src/app/(app)/dashboard/files/page.tsx
src/app/(app)/dashboard/folders/page.tsx
src/app/(app)/dashboard/layout.tsx
src/app/(app)/dashboard/page.tsx
src/app/(app)/dashboard/settings/page.tsx
src/app/(app)/dashboard/settings/SettingsClient.tsx
src/app/(app)/dashboard/users/[id]/edit/page.tsx
src/app/(app)/dashboard/users/[id]/page.tsx
src/app/(app)/dashboard/users/[id]/UserDetailClient.tsx
src/app/(app)/dashboard/users/new/page.tsx
src/app/(app)/dashboard/users/page.tsx
src/app/(app)/dashboard/users/UsersListClient.tsx
src/app/(app)/dashboard/workspaces/[userId]/layout.tsx
src/app/(app)/dashboard/workspaces/[userId]/page.tsx
src/app/(app)/dashboard/workspaces/[userId]/WorkspaceViewClient.tsx
src/app/(app)/dashboard/workspaces/page.tsx
src/app/(app)/dashboard/workspaces/WorkspacesListClient.tsx
src/app/(app)/join/JoinSessionClient.tsx
src/app/(app)/join/page.tsx
src/app/(app)/layout.tsx
src/app/(app)/session/[code]/page.tsx
src/app/(app)/session/[code]/StudentSessionClient.tsx
src/app/(app)/staff/monitor/[code]/MonitorViewClient.tsx
src/app/(app)/staff/monitor/[code]/page.tsx
src/app/(app)/staff/monitor/MonitorSelectionClient.tsx
src/app/(app)/staff/monitor/page.tsx
src/app/(app)/student/session/[code]/page.tsx
src/app/(app)/student/session/[code]/StudentSessionClient.tsx
src/app/(app)/trainer/session/[code]/page.tsx
src/app/(app)/trainer/session/[code]/TrainerSessionClient.tsx
src/app/(app)/trainer/start/page.tsx
src/app/(app)/trainer/start/TrainerStartClient.tsx
src/app/(app)/workspace/explorer/[slug]/FolderExplorerPageClient.tsx
src/app/(app)/workspace/explorer/[slug]/page.tsx
src/app/(app)/workspace/folder/[slug]/page.tsx
src/app/(app)/workspace/page.tsx
src/app/(app)/workspace/WorkspacePageClient.tsx
src/app/(frontend)/(sitemaps)/pages-sitemap.xml/route.ts
src/app/(frontend)/(sitemaps)/posts-sitemap.xml/route.ts
src/app/(frontend)/[slug]/page.client.tsx
src/app/(frontend)/[slug]/page.tsx
src/app/(frontend)/layout.tsx
src/app/(frontend)/next/exit-preview/route.ts
src/app/(frontend)/next/preview/route.ts
src/app/(frontend)/next/seed/route.ts
src/app/(frontend)/not-found.tsx
src/app/(frontend)/page.tsx
src/app/(frontend)/page-client.tsx
src/app/(frontend)/posts/[slug]/page.client.tsx
src/app/(frontend)/posts/[slug]/page.tsx
src/app/(frontend)/posts/page.client.tsx
src/app/(frontend)/posts/page.tsx
src/app/(frontend)/posts/page/[pageNumber]/page.client.tsx
src/app/(frontend)/posts/page/[pageNumber]/page.tsx
src/app/(frontend)/search/page.client.tsx
src/app/(frontend)/signup/page.tsx
src/app/(live)/layout.tsx
src/app/(live)/Live/[lectureId]/page.tsx
src/app/(live)/Live/LiveLectureClient.tsx
src/app/(live)/Live/page.tsx
src/app/(payload)/admin/[[...segments]]/not-found.tsx
src/app/(payload)/admin/[[...segments]]/page.tsx
src/app/(payload)/admin/importMap.js
src/app/(payload)/api/[...slug]/route.ts
src/app/(payload)/api/graphql/route.ts
src/app/(payload)/api/graphql-playground/route.ts
src/app/(payload)/layout.tsx
src/app/api/ai/live-assistant/route.ts
src/app/api/cron/deactivate-sessions/route.ts
src/app/api/dashboard/activity/route.ts
src/app/api/dashboard/fees/[id]/installments/[installmentIndex]/route.ts
src/app/api/dashboard/fees/[id]/route.ts
src/app/api/dashboard/fees/route.ts
src/app/api/dashboard/settings/route.ts
src/app/api/dashboard/stats/route.ts
src/app/api/dashboard/users/[id]/route.ts
src/app/api/dashboard/users/route.ts
src/app/api/dashboard/workspace/[userId]/files/route.ts
src/app/api/dashboard/workspace/[userId]/folders/route.ts
src/app/api/execute/route.ts
src/app/api/files/[id]/delete/route.ts
src/app/api/files/[id]/route.ts
src/app/api/files/route.ts
src/app/api/folders/[id]/delete/route.ts
src/app/api/folders/[id]/route.ts
src/app/api/sessions/[code]/broadcast/route.ts
src/app/api/sessions/[code]/end/route.ts
src/app/api/sessions/[code]/join/route.ts
src/app/api/sessions/[code]/leave/route.ts
src/app/api/sessions/[code]/live/route.ts
src/app/api/sessions/[code]/metadata/route.ts
src/app/api/sessions/[code]/scratchpad/route.ts
src/app/api/sessions/[code]/students/route.ts
src/app/api/sessions/list/route.ts
src/app/api/sessions/start/route.ts
src/app/api/test-payment-guard/route.ts
src/app/api/user/payment-status/route.ts
src/app/api/workspace/download/route.ts
src/app/api/workspace/files/route.ts
src/app/api/workspace/upload/route.ts
src/auth/getMeUser.ts
src/blocks/ArchiveBlock/Component.tsx
src/blocks/ArchiveBlock/config.ts
src/blocks/Banner/Component.tsx
src/blocks/Banner/config.ts
src/blocks/CallToAction/Component.tsx
src/blocks/CallToAction/config.ts
src/blocks/Code/Component.client.tsx
src/blocks/Code/Component.tsx
src/blocks/Code/config.ts
src/blocks/Code/CopyButton.tsx
src/blocks/Content/Component.tsx
src/blocks/Content/config.ts
src/blocks/Form/Checkbox/index.tsx
src/blocks/Form/Component.tsx
src/blocks/Form/config.ts
src/blocks/Form/Country/index.tsx
src/blocks/Form/Country/options.ts
src/blocks/Form/Email/index.tsx
src/blocks/Form/Error/index.tsx
src/blocks/Form/fields.tsx
src/blocks/Form/Message/index.tsx
src/blocks/Form/Number/index.tsx
src/blocks/Form/Select/index.tsx
src/blocks/Form/State/index.tsx
src/blocks/Form/State/options.ts
src/blocks/Form/Text/index.tsx
src/blocks/Form/Textarea/index.tsx
src/blocks/Form/Width/index.tsx
src/blocks/MediaBlock/Component.tsx
src/blocks/MediaBlock/config.ts
src/blocks/RelatedPosts/Component.tsx
src/blocks/RenderBlocks.tsx
src/collections/Categories.ts
src/collections/Fees.ts
src/collections/Files.ts
src/collections/Folders.ts
src/collections/Languages.ts
src/collections/LiveSessions.ts
src/collections/Media.ts
src/collections/Pages/hooks/revalidatePage.ts
src/collections/Pages/index.ts
src/collections/Posts/hooks/populateAuthors.ts
src/collections/Posts/hooks/revalidatePost.ts
src/collections/Posts/index.ts
src/collections/Users/index.ts
src/components/AdminBar/index.tsx
src/components/AIAssistant/AIAssistantPanel.tsx
src/components/AIAssistant/index.ts
src/components/AuthErrorHandler/AuthErrorHandler.tsx
src/components/BeforeDashboard/index.tsx
src/components/BeforeLogin/index.tsx
src/components/Card/index.tsx
src/components/CollectionArchive/index.tsx
src/components/Dashboard/DashboardLayout.tsx
src/components/Dashboard/DashboardNav.tsx
src/components/Dashboard/FeeForm.tsx
src/components/Dashboard/RecentActivity.tsx
src/components/Dashboard/SettingsForm.tsx
src/components/Dashboard/StatsCard.tsx
src/components/Dashboard/StudentListSidebar.tsx
src/components/Dashboard/UserForm.tsx
src/components/FloatingLogout/index.tsx
src/components/Link/index.tsx
src/components/LiveCodePlayground/index.ts
src/components/LiveCodePlayground/LiveCodePlayground.tsx
src/components/LiveCodePlayground/OutputPanel.tsx
src/components/LiveCodePlayground/types.ts
src/components/LiveLecture/index.ts
src/components/LiveLecture/StudentView.tsx
src/components/LiveLecture/TrainerView.tsx
src/components/LivePreviewListener/index.tsx
src/components/Logo/Logo.tsx
src/components/Media/ImageMedia/index.tsx
src/components/Media/index.tsx
src/components/Media/types.ts
src/components/Media/VideoMedia/index.tsx
src/components/Monitor/CodeViewer.tsx
src/components/Monitor/MonitorWorkspace.tsx
src/components/Monitor/UserSidebar.tsx
src/components/PageRange/index.tsx
src/components/Pagination/index.tsx
src/components/PayloadRedirects/index.tsx
src/components/Payment/PaymentBlocked.tsx
src/components/Payment/PaymentDueModal.tsx
src/components/Payment/PaymentGracePeriodModal.tsx
src/components/Payment/TrialEndingSoonModal.tsx
src/components/Payment/TrialGracePeriodModal.tsx
src/components/RichText/index.tsx
src/components/Session/ActiveSessionsList.tsx
src/components/Session/FileSelectionModal.tsx
src/components/Session/index.ts
src/components/Session/SessionMetadataModal.tsx
src/components/Session/SimpleCodeViewer.tsx
src/components/SessionWorkspace/StudentSessionWorkspace.tsx
src/components/SessionWorkspace/TrainerSessionWorkspace.tsx
src/components/ui/button.tsx
src/components/ui/card.tsx
src/components/ui/checkbox.tsx
src/components/ui/input.tsx
src/components/ui/label.tsx
src/components/ui/pagination.tsx
src/components/ui/select.tsx
src/components/ui/textarea.tsx
src/components/Workspace/AIAssistantPanelWrapper.tsx
src/components/Workspace/CreateFileModal.tsx
src/components/Workspace/CreateFolderModal.tsx
src/components/Workspace/FileExplorer.tsx
src/components/Workspace/FileExplorerSidebar.tsx
src/components/Workspace/FileSwitchingOverlay.tsx
src/components/Workspace/FileTreeItem.tsx
src/components/Workspace/FolderExplorerView.tsx
src/components/Workspace/index.ts
src/components/Workspace/MoveItemModal.tsx
src/components/Workspace/NoFileSelectedView.tsx
src/components/Workspace/OutputPanelWrapper.tsx
src/components/Workspace/RenameItemModal.tsx
src/components/Workspace/UploadModal.tsx
src/components/Workspace/ViewToggleButton.tsx
src/components/Workspace/WorkspaceEditor.tsx
src/components/Workspace/WorkspaceEditorHeader.tsx
src/components/Workspace/WorkspaceHeader.tsx
src/components/Workspace/WorkspaceLayout.tsx
src/components/Workspace/WorkspaceModeLayout.tsx
src/components/Workspace/WorkspaceModeToggle.tsx
src/components/Workspace/WorkspaceViewControls.tsx
src/cssVariables.js
src/db/adapter.ts
src/endpoints/seed/contact-form.ts
src/endpoints/seed/contact-page.ts
src/endpoints/seed/home.ts
src/endpoints/seed/home-static.ts
src/endpoints/seed/image-1.ts
src/endpoints/seed/image-2.ts
src/endpoints/seed/image-3.ts
src/endpoints/seed/image-hero-1.ts
src/endpoints/seed/index.ts
src/endpoints/seed/post-1.ts
src/endpoints/seed/post-2.ts
src/endpoints/seed/post-3.ts
src/environment.d.ts
src/fields/defaultLexical.ts
src/fields/link.ts
src/fields/linkGroup.ts
src/Footer/Component.tsx
src/Footer/config.ts
src/Footer/hooks/revalidateFooter.ts
src/Footer/RowLabel.tsx
src/Header/Component.client.tsx
src/Header/Component.tsx
src/Header/config.ts
src/Header/hooks/revalidateHeader.ts
src/Header/Nav/index.tsx
src/Header/RowLabel.tsx
src/heros/config.ts
src/heros/HighImpact/index.tsx
src/heros/LowImpact/index.tsx
src/heros/MediumImpact/index.tsx
src/heros/PostHero/index.tsx
src/heros/RenderHero.tsx
src/hooks/payment/usePaymentStatus.ts
src/hooks/populatePublishedAt.ts
src/hooks/revalidateRedirects.ts
src/hooks/session/useActiveSessionsList.ts
src/hooks/session/useSessionCache.ts
src/hooks/session/useSessionData.ts
src/hooks/useCodeExecution.ts
src/hooks/useCurrentUser.ts
src/hooks/useFileSave.ts
src/hooks/useFileSelectionModal.ts
src/hooks/workspace/useExplorerData.ts
src/hooks/workspace/useFileContent.ts
src/hooks/workspace/useFileSelection.ts
src/hooks/workspace/useFolderExplorerHandlers.ts
src/hooks/workspace/useSaveAndRun.ts
src/hooks/workspace/useSaveCode.ts
src/hooks/workspace/useWorkspaceCodeExecution.ts
src/hooks/workspace/useWorkspaceData.ts
src/hooks/workspace/useWorkspaceImportExport.ts
src/middleware.ts
src/migrations/20260127_102817_initial_schema.ts
src/migrations/index.ts
src/payload.config.ts
src/payload-types.ts
src/plugins/index.ts
src/providers/HeaderTheme/index.tsx
src/providers/index.tsx
src/providers/Theme/index.tsx
src/providers/Theme/InitTheme/index.tsx
src/providers/Theme/shared.ts
src/providers/Theme/ThemeSelector/index.tsx
src/providers/Theme/ThemeSelector/types.ts
src/providers/Theme/types.ts
src/search/beforeSync.ts
src/search/Component.tsx
src/search/fieldOverrides.ts
src/services/codeExecution.ts
src/services/liveSessionStore.ts
src/Settings/config.ts
src/types/ai-assistant.ts
src/types/live-session.ts
src/types/workspace.ts
src/utilities/accessStatus.ts
src/utilities/accessStatusCore.ts
src/utilities/aiAssistant/codeFrameGenerator.ts
src/utilities/aiAssistant/dryRunParser.ts
src/utilities/aiAssistant/errorClassifier.ts
src/utilities/aiAssistant/errorParser.ts
src/utilities/aiAssistant/index.ts
src/utilities/aiAssistant/promptBuilder.ts
src/utilities/aiAssistant/responseValidator.ts
src/utilities/apiErrorResponse.ts
src/utilities/canUseDOM.ts
src/utilities/checkPaymentStatusServer.ts
src/utilities/dashboardAccess.ts
src/utilities/deepMerge.ts
src/utilities/devApiLogger.ts
src/utilities/formatAuthors.ts
src/utilities/formatDateTime.ts
src/utilities/generateMeta.ts
src/utilities/generatePreviewPath.ts
src/utilities/getDocument.ts
src/utilities/getGlobals.ts
src/utilities/getMediaUrl.ts
src/utilities/getRedirects.ts
src/utilities/getURL.ts
src/utilities/joinCode.ts
src/utilities/languageInference.ts
src/utilities/mergeOpenGraph.ts
src/utilities/paymentGuard.ts
src/utilities/sessionExpiration.ts
src/utilities/sessionFileFetcher.ts
src/utilities/toKebabCase.ts
src/utilities/ui.ts
src/utilities/useClickableCard.ts
src/utilities/useDebounce.ts
src/utilities/useFolderFileFilter.ts
src/utilities/workspaceScope.ts
```

**Total:** ~280+ source files under `src/`.

---

*Generated from the live-coding `src/` tree. Update this doc when adding new routes, components, or shared logic.*
