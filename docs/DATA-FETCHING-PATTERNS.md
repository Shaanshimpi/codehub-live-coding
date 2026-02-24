# Data fetching patterns

This doc describes how the app fetches data from the API and how to keep it consistent and efficient.

## Rule: one source per resource

- **Current user:** Use **`useCurrentUser()`** only. Do **not** call `fetch('/api/users/me')` (or any `/api/users/me` URL) from client code. All “am I logged in?” / “who am I?” logic should go through this hook so the app makes at most one request per tab.
- **Workspace folders/files:** Use **`useWorkspaceData(userId?)`**. Do not fetch `/api/folders` or `/api/workspace/files` directly. Use the same hook (and thus same cache) in workspace layout, explorer, and file-selection modal.
- **Session live data:** Use **`useSessionData(sessionCode, options)`**. Use it for both trainer and student session views. Set `refetchInterval: false` when you don’t need polling; use `refetchInterval: 5000` and `pauseOnHidden: true` when you need periodic updates and want to avoid background load.
- **Payment status:** Use **`usePaymentStatus(options)`**. Single shared cache; one request per “session” unless you explicitly invalidate or refetch.
- **Active sessions list:** Use **`useActiveSessionsList(trainerId?)`**. Shared between `/join` and `/trainer/start` so the list is not fetched twice when moving between those pages.
- **File content:** Use **`useFileContent(fileId, options)`**. Caching and refetch options are set so we don’t refetch on window focus.

## Hooks overview

| Hook | Query key (concept) | Typical use |
|------|---------------------|-------------|
| `useCurrentUser()` | `['user','me']` | Layout, nav, “logged in as”, permission checks |
| `useWorkspaceData(userId?)` | `['workspace','data', userId \|\| 'current']` | Workspace tree, explorer, file-selection modal |
| `useSessionData(code, opts)` | `['session','live', code]` | Trainer/student session UIs |
| `usePaymentStatus(opts)` | `['payment','status']` | Payment blocked / due / grace modals |
| `useActiveSessionsList(trainerId?)` | `['sessions','list', trainerId \|\| 'all']` | Join page, trainer start page |
| `useFileContent(fileId, opts)` | `['file', fileId]` | Editor content, file load |

## When data changes

- **After login/logout:** The single `/api/users/me` request is driven by `useCurrentUser`. After logout you redirect; after login, call `refetch()` from `useCurrentUser()` where you handle “visibility” or “storage” (e.g. home page) so the cache updates.
- **After workspace changes (create/rename/delete file or folder):** Call **`invalidateWorkspaceData(queryClient)`** (and optionally `refetch()` from `useWorkspaceData`) so the tree and file list stay in sync.
- **After payment or trial changes:** Invalidate or refetch the payment query only where you know the status changed (e.g. after a successful payment flow).

## Adding new UI that needs “current user”

Use the hook; do not add a new `fetch('/api/users/me')`:

```ts
import { useCurrentUser } from '@/hooks/useCurrentUser'

function MyComponent() {
  const { user, isLoggedIn, isLoading, refetch } = useCurrentUser()
  // ...
}
```

## Adding new UI that needs workspace files/folders

Use the same hook so the list is shared:

```ts
import { useWorkspaceData } from '@/hooks/workspace/useWorkspaceData'

function MyComponent() {
  const { folders, files, isLoading, refetch } = useWorkspaceData()
  // ...
}
```

## Polling (session live data)

If you need live session data to update on a timer (e.g. participant count, output):

```ts
useSessionData(joinCode, {
  refetchInterval: 5000,  // 5 seconds
  pauseOnHidden: true,    // do not poll when tab is hidden
})
```

Use the minimum interval that is acceptable for UX to limit server and DB load.
