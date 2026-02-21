/**
 * Hook for fetching and caching live session data using React Query.
 * 
 * This hook provides:
 * - Cached session data with automatic polling
 * - Visibility-based polling pause (pauses when tab is hidden)
 * - Support for localStorage persistence
 * 
 * @module useSessionData
 */

import React from 'react'
import { useQuery } from '@tanstack/react-query'

export type PaymentStatus = {
  isBlocked: boolean
  isDueSoon: boolean
  isInGracePeriod?: boolean
  nextInstallment?: {
    dueDate: string
    amount: number
    paymentMethod?: string
  }
  trialEndDate?: string | null
  isTrialEndingSoon?: boolean
  isTrialInGracePeriod?: boolean
  daysUntilTrialEnd?: number
  daysTrialOverdue?: number
  daysRemainingInTrialGracePeriod?: number
  reason?: 'MAINTENANCE_MODE' | 'ADMISSION_NOT_CONFIRMED' | 'PAYMENT_OVERDUE' | 'TRIAL_EXPIRED'
  daysUntilDue?: number
  daysOverdue?: number
  daysRemainingInGracePeriod?: number
}

export interface SessionLiveData {
  code: string
  output: any
  isActive: boolean
  title: string
  language: string | null
  participantCount: number
  trainerWorkspaceFileId: string | null
  trainerWorkspaceFileName: string | null
  paymentStatus?: PaymentStatus | null
}

interface UseSessionDataOptions {
  /** Polling interval in milliseconds. Set to false to disable polling. */
  refetchInterval?: number | false
  /** Whether the query is enabled */
  enabled?: boolean
  /** Whether to pause polling when tab is hidden */
  pauseOnHidden?: boolean
}

/**
 * Hook for fetching and caching live session data with automatic polling.
 * 
 * @param sessionCode - The session join code
 * @param options - Configuration options for polling and caching
 * @returns React Query result with session data
 * 
 * @example
 * ```tsx
 * const { data: sessionData, isLoading } = useSessionData(joinCode, {
 *   refetchInterval: 3000, // Poll every 3 seconds
 *   pauseOnHidden: true, // Pause when tab is hidden
 * })
 * ```
 */
export function useSessionData(
  sessionCode: string,
  options?: UseSessionDataOptions
) {
  const [isTabVisible, setIsTabVisible] = React.useState(true)

  // Handle visibility change for pause-on-hidden feature
  React.useEffect(() => {
    if (!options?.pauseOnHidden) return

    const handleVisibilityChange = () => {
      setIsTabVisible(!document.hidden)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [options?.pauseOnHidden])

  // Determine polling interval
  const refetchInterval = React.useMemo(() => {
    if (options?.refetchInterval === false) return false
    if (options?.pauseOnHidden && !isTabVisible) return false
    return options?.refetchInterval || 3000 // Default 3 seconds
  }, [options?.refetchInterval, options?.pauseOnHidden, isTabVisible])

  return useQuery<SessionLiveData>({
    queryKey: ['session', 'live', sessionCode],
    queryFn: async () => {
      console.log('[useSessionData] ⚠️ FETCHING session data from API', { sessionCode })
      const res = await fetch(`/api/sessions/${sessionCode}/live`, {
        cache: 'no-store',
        credentials: 'include',
      })

      if (!res.ok) {
        // Preserve status code in error message for proper error handling
        const error = new Error(`Failed to load session: ${res.status}`)
        ;(error as any).status = res.status
        throw error
      }

      const data = await res.json()
      console.log('[useSessionData] ✅ Session data fetched from API', { 
        sessionCode,
        isActive: data.isActive,
        participantCount: data.participantCount 
      })
      return data as SessionLiveData
    },
    enabled: options?.enabled !== false && !!sessionCode,
    staleTime: 30 * 1000, // 30 seconds - data is considered fresh for 30s
    gcTime: 5 * 60 * 1000, // 5 minutes - keep in cache for 5 minutes
    refetchInterval, // Polling interval (or false to disable)
    refetchIntervalInBackground: false, // Don't poll when tab is in background
  })
}

