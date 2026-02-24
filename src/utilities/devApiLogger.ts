/**
 * Dev-only API call logging for observability and load validation.
 * No-op in production.
 */

const isDev =
  typeof process !== 'undefined' && process.env.NODE_ENV === 'development'

/**
 * Log an API fetch when in development. Use from React Query queryFns or hooks
 * to trace which endpoints are hit and validate deduplication.
 */
export function logApiFetch(scope: string, url: string, outcome?: 'ok' | 'error') {
  if (!isDev) return
  const label = outcome ? `[API ${outcome}]` : '[API]'
  console.log(`${label} ${scope} → ${url}`)
}

export function isDevEnv(): boolean {
  return isDev
}
