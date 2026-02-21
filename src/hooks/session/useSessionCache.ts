/**
 * Hook for managing session data persistence in localStorage.
 * 
 * This hook provides:
 * - Loading session data from localStorage on mount
 * - Saving session data to localStorage when it changes
 * - Automatic cache expiration (5 minutes)
 * 
 * @module useSessionCache
 */

import React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { SessionLiveData } from './useSessionData'

const SESSION_CACHE_KEY = 'session_cache'

interface CachedSessionData {
  sessionCode: string
  sessionData: SessionLiveData
  timestamp: number
}

/**
 * Hook for managing session data persistence in localStorage.
 * 
 * @returns Object with saveSessionCache function
 * 
 * @example
 * ```tsx
 * const { saveSessionCache } = useSessionCache()
 * 
 * // Save session data to localStorage
 * saveSessionCache(sessionCode, sessionData)
 * ```
 */
export function useSessionCache() {
  const queryClient = useQueryClient()

  // Load from localStorage on mount
  React.useEffect(() => {
    const cached = localStorage.getItem(SESSION_CACHE_KEY)
    if (cached) {
      try {
        const data: CachedSessionData = JSON.parse(cached)
        const { sessionCode, sessionData, timestamp } = data

        // Only use cache if less than 5 minutes old
        const age = Date.now() - timestamp
        if (age < 5 * 60 * 1000) {
          console.log('[useSessionCache] 📦 Loading session data from localStorage', {
            sessionCode,
            age: Math.round(age / 1000) + 's',
          })
          queryClient.setQueryData(['session', 'live', sessionCode], sessionData)
        } else {
          console.log('[useSessionCache] ⏰ Session cache expired, clearing', {
            sessionCode,
            age: Math.round(age / 1000) + 's',
          })
          localStorage.removeItem(SESSION_CACHE_KEY)
        }
      } catch (e) {
        console.error('[useSessionCache] Failed to load session cache:', e)
        localStorage.removeItem(SESSION_CACHE_KEY)
      }
    }
  }, [queryClient])

  // Save to localStorage when session data changes
  const saveSessionCache = React.useCallback((sessionCode: string, data: SessionLiveData) => {
    try {
      const cacheData: CachedSessionData = {
        sessionCode,
        sessionData: data,
        timestamp: Date.now(),
      }
      localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(cacheData))
      console.log('[useSessionCache] 💾 Saved session data to localStorage', { sessionCode })
    } catch (e) {
      console.error('[useSessionCache] Failed to save session cache:', e)
    }
  }, [])

  return { saveSessionCache }
}

