import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { checkStudentPaymentStatus } from './paymentGuard'
import type { PayloadRequest } from 'payload'

/**
 * Server-side payment status check
 * Returns payment status for the authenticated user
 */
export async function checkPaymentStatusServer(): Promise<{
  isBlocked: boolean
  isDueSoon: boolean
  isInGracePeriod?: boolean
  nextInstallment: {
    dueDate: string
    amount: number
    paymentMethod?: string
  } | null
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
} | null> {
  try {
    const payload = await getPayload({ config })
    const requestHeaders = await headers()
    
    // Authenticate user
    const { user } = await payload.auth({ headers: requestHeaders })
    
    if (!user || user.role !== 'student') {
      // Not a student, no payment check needed
      return null
    }

    // Create a mock request object for payment guard
    const mockRequest = {
      headers: requestHeaders,
      user,
    } as unknown as PayloadRequest

    // Check payment status
    const paymentStatus = await checkStudentPaymentStatus(user.id, mockRequest)
    
    return {
      isBlocked: paymentStatus.isBlocked,
      isDueSoon: paymentStatus.isDueSoon,
      isInGracePeriod: paymentStatus.isInGracePeriod,
      nextInstallment: paymentStatus.nextInstallment,
      trialEndDate: paymentStatus.trialEndDate,
      isTrialEndingSoon: paymentStatus.isTrialEndingSoon,
      isTrialInGracePeriod: paymentStatus.isTrialInGracePeriod,
      daysUntilTrialEnd: paymentStatus.daysUntilTrialEnd,
      daysTrialOverdue: paymentStatus.daysTrialOverdue,
      daysRemainingInTrialGracePeriod: paymentStatus.daysRemainingInTrialGracePeriod,
      reason: paymentStatus.reason,
      daysUntilDue: paymentStatus.daysUntilDue,
      daysOverdue: paymentStatus.daysOverdue,
      daysRemainingInGracePeriod: paymentStatus.daysRemainingInGracePeriod,
    }
  } catch (error) {
    console.error('Error checking payment status server-side:', error)
    // On error, allow access (fail open for now)
    return null
  }
}

