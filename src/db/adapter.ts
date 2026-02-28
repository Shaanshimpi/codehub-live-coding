/**
 * Database Adapter
 *
 * Uses PostgreSQL (Neon) for all environments.
 *
 * Configure DATABASE_URL in your .env file:
 *   DATABASE_URL=postgresql://user:password@host:port/database?sslmode=verify-full
 *
 * For a fresh empty database, run migrations once:
 *   pnpm payload migrate
 *
 * Or rely on prodMigrations: pending migrations run automatically on server start.
 *
 * Vercel: Set PAYLOAD_MIGRATING=1 in Build env so migrations run non-interactively.
 * If the build hangs, set PAYLOAD_MIGRATING=1 and ensure DATABASE_URL uses sslmode=verify-full.
 */

import { postgresAdapter } from '@payloadcms/db-postgres'
import { migrations } from '../migrations'

/** Normalize connection string: use sslmode=verify-full to avoid pg v3 future break and SSL warning */
function getConnectionString(): string {
  const url = process.env.DATABASE_URL || ''
  if (!url) return url
  const hasParams = url.includes('?')
  const sslMatch = url.match(/[?&]sslmode=([^&]+)/)
  if (sslMatch && /^(?:prefer|require|verify-ca)$/i.test(sslMatch[1])) {
    return url.replace(/[?&]sslmode=[^&]+/i, (m) => m.replace(/=.*$/, '=verify-full'))
  }
  return url + (hasParams ? '&' : '?') + 'sslmode=verify-full'
}

export function getDbAdapter() {
  console.log('☁️ Using REMOTE PostgreSQL (Neon) database')
  return postgresAdapter({
    pool: {
      connectionString: getConnectionString(),
    },
    migrationDir: './src/migrations',
    // Skip running migrations during next build (avoids "already exists" when DB was set up via dev push)
    prodMigrations: process.env.SKIP_PAYLOAD_MIGRATE === '1' ? [] : migrations,
    // Disable dev push in production so we never get "dev mode" prompt when running migrations (e.g. on Vercel)
    push: process.env.NODE_ENV === 'production' ? false : undefined,
    // push: false,
  })
}




