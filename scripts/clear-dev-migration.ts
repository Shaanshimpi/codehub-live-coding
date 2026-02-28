/**
 * Clears the dev-pushed migration record (batch = -1) from payload_migrations.
 *
 * Payload shows an interactive "Would you like to proceed? (y/N)" prompt when it finds
 * this record during migrate. That hangs non-interactive builds (e.g. Vercel).
 * Deleting it prevents the prompt so builds can finish.
 *
 * Run before `next build` to ensure migrations (if any) run without hanging.
 */

import pg from 'pg'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const envPaths = [
  path.resolve(__dirname, '../.env'),
  path.resolve(process.cwd(), '.env'),
]

for (const envPath of envPaths) {
  dotenv.config({ path: envPath })
}

async function clearDevMigration() {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.log('⏭️  No DATABASE_URL, skipping clear-dev-migration')
    process.exit(0)
  }

  if (process.env.SKIP_DEV_MIGRATION_CLEANUP === '1') {
    console.log('⏭️  SKIP_DEV_MIGRATION_CLEANUP=1, skipping clear-dev-migration')
    process.exit(0)
  }

  const client = new pg.Client({ connectionString: url })

  try {
    await client.connect()
    const result = await client.query('DELETE FROM payload_migrations WHERE batch = -1')
    const deleted = result.rowCount ?? 0
    if (deleted > 0) {
      console.log(`✅ Cleared ${deleted} dev-pushed migration record(s) from payload_migrations`)
    } else {
      console.log('✓ No dev-pushed migration record found')
    }
  } catch (err) {
    console.error('⚠️  clear-dev-migration failed:', err instanceof Error ? err.message : err)
    // Don't fail the build if DB is unreachable (e.g. local build without DB)
    process.exit(0)
  } finally {
    await client.end().catch(() => {})
  }
}

clearDevMigration()
