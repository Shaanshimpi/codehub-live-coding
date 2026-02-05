/**
 * Database Adapter Factory
 * 
 * Switches between PostgreSQL (Neon) and SQLite based on environment.
 * 
 * Usage in .env:
 *   USE_LOCAL_DB=true   → Uses SQLite (local development, no network needed)
 *   USE_LOCAL_DB=false  → Uses PostgreSQL/Neon (production)
 * 
 * The SQLite database will be created at: live-coding/payload-local.db
 */

import { postgresAdapter } from '@payloadcms/db-postgres'
import { sqliteAdapter } from '@payloadcms/db-sqlite'

const useLocalDB = process.env.USE_LOCAL_DB === 'true'

export function getDbAdapter() {
  if (useLocalDB) {
    console.log('📦 Using LOCAL SQLite database (payload-local.db)')
    return sqliteAdapter({
      client: {
        url: 'file:./payload-local.db',
      },
    })
  }

  console.log('☁️ Using REMOTE PostgreSQL (Neon) database')
  return postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
  })
}

export { useLocalDB }




