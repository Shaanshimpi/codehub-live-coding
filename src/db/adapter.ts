/**
 * Database Adapter
 * 
 * Uses PostgreSQL (Neon) for all environments.
 * 
 * Configure DATABASE_URL in your .env file:
 *   DATABASE_URL=postgresql://user:password@host:port/database
 */

import { postgresAdapter } from '@payloadcms/db-postgres'

export function getDbAdapter() {
  console.log('☁️ Using REMOTE PostgreSQL (Neon) database')
  return postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
  })
}




