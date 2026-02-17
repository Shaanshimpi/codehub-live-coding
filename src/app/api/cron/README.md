# Cron Jobs

This directory contains cron job endpoints for automated tasks.

## Deactivate Sessions

**Endpoint:** `POST /api/cron/deactivate-sessions`

**Purpose:** Automatically deactivates sessions that have been active for more than 24 hours.

**Authentication:** Protected by `CRON_SECRET` environment variable. The request must include:
```
Authorization: Bearer <CRON_SECRET>
```

**Response:**
```json
{
  "success": true,
  "deactivated": 5,
  "message": "Deactivated 5 session(s) older than 24 hours"
}
```

## Setup

### Environment Variable

Add `CRON_SECRET` to your `.env` file:
```env
CRON_SECRET=your-secret-key-here
```

### Vercel Cron (Recommended)

If deploying on Vercel, add this to your `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/deactivate-sessions",
      "schedule": "0 * * * *"
    }
  ]
}
```

This runs the job every hour. The schedule uses cron syntax:
- `0 * * * *` = Every hour at minute 0
- `0 */6 * * *` = Every 6 hours
- `0 0 * * *` = Once per day at midnight

### GitHub Actions

Create `.github/workflows/deactivate-sessions.yml`:

```yaml
name: Deactivate Old Sessions

on:
  schedule:
    - cron: '0 * * * *'  # Every hour
  workflow_dispatch:  # Allow manual trigger

jobs:
  deactivate:
    runs-on: ubuntu-latest
    steps:
      - name: Call Cron Endpoint
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            https://your-domain.com/api/cron/deactivate-sessions
```

### Other Cron Services

You can use any cron service (cron-job.org, EasyCron, etc.) to call:
```
POST https://your-domain.com/api/cron/deactivate-sessions
Authorization: Bearer <CRON_SECRET>
```

## How It Works

1. **Automatic Deactivation on Access**: When sessions are accessed via API endpoints, they are automatically checked and deactivated if older than 24 hours.

2. **Scheduled Cleanup**: The cron job runs periodically to proactively deactivate old sessions, ensuring the database stays clean even if sessions aren't accessed.

3. **24-Hour Rule**: Sessions are considered expired if they started more than 24 hours ago (based on `startedAt` field, or `createdAt` as fallback).

## Notes

- Sessions are automatically filtered out from the sessions list if they're older than 24 hours
- The `/api/sessions/[code]/join` endpoint will reject expired sessions with a 410 Gone status
- The `/api/sessions/[code]/live` endpoint will return `isActive: false` for expired sessions

