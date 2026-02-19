# Workspace API Documentation

This document describes the API endpoints used by workspace components.

## Code Execution

### POST /api/execute
Execute code using OneCompiler API (proxied through Next.js).

**Request Body:**
```json
{
  "language": "javascript",
  "code": "console.log('Hello World');",
  "input": ""
}
```

**Response:**
```json
{
  "stdout": "Hello World\n",
  "stderr": "",
  "status": "success",
  "executionTime": 123,
  "memory": 1024,
  "exitCode": 0
}
```

**Used By:**
- `src/services/codeExecution.ts` → `executeCode()` function
- All workspace components for code execution

---

## Workspace Files

### GET /api/workspace/files
Get all workspace files for the authenticated user.

**Response:**
```json
{
  "files": [
    {
      "id": "123",
      "name": "script.js",
      "content": "console.log('Hello');",
      "folder": {
        "id": "456",
        "name": "src",
        "slug": "src-folder"
      }
    }
  ],
  "paymentStatus": { ... } // Optional, for students
}
```

**Used By:**
- `useExplorerData` hook
- `WorkspaceLayout` component

---

### GET /api/files/:fileId
Get a specific file by ID.

**Response:**
```json
{
  "id": "123",
  "name": "script.js",
  "content": "console.log('Hello');",
  "language": "javascript",
  "folder": { ... }
}
```

**Used By:**
- `useFileSelection` hook
- File selection handlers

---

### PATCH /api/files/:fileId
Update file content.

**Request Body:**
```json
{
  "content": "console.log('Updated');"
}
```

**Used By:**
- `useFileSave` hook
- Save code handlers

---

## Folders

### GET /api/folders?limit=1000&depth=2
Get all folders for the authenticated user.

**Response:**
```json
{
  "docs": [
    {
      "id": "456",
      "name": "src",
      "slug": "src-folder",
      "parentFolder": null
    }
  ]
}
```

**Used By:**
- `useExplorerData` hook
- Explorer mode components

---

## Sessions

### POST /api/sessions/:code/broadcast
Broadcast trainer code/output to session (trainer only).

**Request Body:**
```json
{
  "workspaceFileId": "123",
  "workspaceFileName": "script.js",
  "languageSlug": "javascript",
  "currentOutput": { ... } // Optional
}
```

**Response:**
```json
{
  "success": true,
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

**Used By:**
- `useFileSave` hook (trainer sessions)
- `useWorkspaceCodeExecution` hook (trainer sessions)

---

### POST /api/sessions/:code/scratchpad
Update student's scratchpad code/output (student only).

**Request Body:**
```json
{
  "workspaceFileId": "123",
  "workspaceFileName": "script.js",
  "language": "javascript",
  "output": { ... } // Optional
}
```

**Response:**
```json
{
  "success": true
}
```

**Used By:**
- `useFileSave` hook (student sessions)
- `useWorkspaceCodeExecution` hook (student sessions)

---

### GET /api/sessions/:code/live
Get live session data.

**Response:**
```json
{
  "trainerWorkspaceFileId": "123",
  "trainerWorkspaceFileName": "script.js",
  "code": "console.log('Hello');",
  "language": "javascript",
  "output": { ... }
}
```

**Used By:**
- Trainer session workspace (load active file)
- Student session workspace (fetch trainer code)

---

## Dashboard Workspace

### GET /api/dashboard/workspace/:userId/files
Get workspace files for a specific user (dashboard view).

**Response:**
```json
{
  "files": [ ... ],
  "user": {
    "id": "789",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

**Used By:**
- `useExplorerData` hook (when userId provided)
- Dashboard workspace view

---

### GET /api/dashboard/workspace/:userId/folders
Get workspace folders for a specific user (dashboard view).

**Response:**
```json
{
  "docs": [ ... ]
}
```

**Used By:**
- `useExplorerData` hook (when userId provided)
- Dashboard workspace view

---

## Import/Export

### GET /api/workspace/download
Download workspace as ZIP file.

**Response:**
- Binary ZIP file
- Content-Type: application/zip

**Used By:**
- `useWorkspaceImportExport` hook

---

### POST /api/workspace/upload
Upload workspace ZIP file.

**Request:**
- FormData with `file` field (ZIP file)

**Response:**
```json
{
  "filesCreated": 10,
  "foldersCreated": 3
}
```

**Used By:**
- `useWorkspaceImportExport` hook

---

## Error Handling

All API endpoints may return error responses:

```json
{
  "error": "Error message",
  "message": "Human-readable message"
}
```

Common HTTP status codes:
- `400` - Bad Request (missing/invalid parameters)
- `401` - Unauthorized (not authenticated)
- `403` - Forbidden (payment required for students)
- `404` - Not Found (resource doesn't exist)
- `500` - Internal Server Error

---

## Authentication

All API endpoints require authentication via cookies (`credentials: 'include'`).

---

## Notes

- All endpoints use JSON for request/response bodies (except file uploads)
- File uploads use FormData
- All endpoints support CORS with credentials
- Cache is disabled for workspace data (`cache: 'no-store'`)

