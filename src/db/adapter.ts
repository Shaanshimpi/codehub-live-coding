/**
 * Database Adapter
 *
 * Uses PostgreSQL (Neon) for all environments.
 *
 * Configure DATABASE_URL in your .env file:
 *   DATABASE_URL=postgresql://user:password@host:port/database
 *
 * For a fresh empty database, run migrations once:
 *   pnpm payload migrate
 *
 * Or rely on prodMigrations: pending migrations run automatically on server start.
 */

import { postgresAdapter } from '@payloadcms/db-postgres'
import { migrations } from '../migrations'

export function getDbAdapter() {
  console.log('☁️ Using REMOTE PostgreSQL (Neon) database')
  return postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
    migrationDir: './src/migrations',
    prodMigrations: migrations,
  })
}




