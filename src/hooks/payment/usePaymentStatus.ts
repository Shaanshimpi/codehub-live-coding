/**
 * Hook for fetching and caching payment status using React Query.
 * 
 * This hook provides:
 * - Cached payment status (5 minutes)
 * - Shared status across all components
 * - Automatic error handling
 * 
 * @module usePaymentStatus
 */

import { useQuery } from '@tanstack/react-query'
import { logApiFetch } from '@/utilities/devApiLogger'

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

interface PaymentStatusResponse {
  paymentStatus: PaymentStatus
}

/**
 * Hook for fetching and caching payment status.
 * 
 * @param options - Configuration options
 * @returns React Query result with payment status
 * 
 * @example
 * ```tsx
 * const { data: paymentStatus, isLoading } = usePaymentStatus()
 * 
 * if (paymentStatus?.isBlocked) {
 *   return <PaymentBlocked />
 * }
 * ```
 */
export function usePaymentStatus(options?: {
  enabled?: boolean
}) {
  return useQuery<PaymentStatus>({
    queryKey: ['payment', 'status'],
    queryFn: async () => {
      const url = '/api/user/payment-status'
      logApiFetch('usePaymentStatus', url)
      const res = await fetch(url, { credentials: 'include' })
      if (!res.ok) {
        logApiFetch('usePaymentStatus', url, 'error')
        throw new Error(`Failed to fetch payment status: ${res.status}`)
      }
      logApiFetch('usePaymentStatus', url, 'ok')
      const data: PaymentStatusResponse = await res.json()
      return data.paymentStatus
    },
    enabled: options?.enabled !== false,
    staleTime: 10 * 60 * 1000, // 10 minutes - one fetch per "session"; refetch only when explicitly invalidated or after long gap
    gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: false, // Use cache if available (only fetch if no cache)
    refetchOnReconnect: false, // Don't refetch on reconnect
  })
}

