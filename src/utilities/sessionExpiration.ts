/**
 * Utility functions for checking and handling session expiration
 */

/**
 * Check if a session has expired (older than 24 hours)
 * @param startedAt - Session start time (ISO string or Date)
 * @param createdAt - Session creation time as fallback (ISO string or Date)
 * @returns true if session is older than 24 hours
 */
export function isSessionExpired(startedAt: string | Date | null | undefined, createdAt?: string | Date | null | undefined): boolean {
  const twentyFourHoursAgo = new Date()
  twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24)

  const sessionStartTime = startedAt || createdAt
  if (!sessionStartTime) {
    // If no start time, consider it expired (shouldn't happen, but defensive)
    return true
  }

  const startDate = typeof sessionStartTime === 'string' 
    ? new Date(sessionStartTime) 
    : sessionStartTime

  return startDate < twentyFourHoursAgo
}

/**
 * Get the cutoff date for session expiration (24 hours ago)
 * @returns Date object representing 24 hours ago
 */
export function getSessionExpirationCutoff(): Date {
  const cutoff = new Date()
  cutoff.setHours(cutoff.getHours() - 24)
  return cutoff
}

