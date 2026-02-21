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
      console.log('[usePaymentStatus] ⚠️ FETCHING payment status from API')
      const res = await fetch('/api/user/payment-status', {
        credentials: 'include',
      })

      if (!res.ok) {
        throw new Error(`Failed to fetch payment status: ${res.status}`)
      }

      const data: PaymentStatusResponse = await res.json()
      console.log('[usePaymentStatus] ✅ Payment status fetched from API', {
        isBlocked: data.paymentStatus.isBlocked,
        isDueSoon: data.paymentStatus.isDueSoon,
      })
      return data.paymentStatus
    },
    enabled: options?.enabled !== false,
    staleTime: Infinity, // Never consider data stale - only fetch on page load/refresh
    gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: false, // Use cache if available (only fetch if no cache)
    refetchOnReconnect: false, // Don't refetch on reconnect
  })
}

