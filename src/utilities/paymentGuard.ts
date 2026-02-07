import type { PayloadRequest } from 'payload'
import { getPayload } from 'payload'
import config from '@payload-config'

export interface InstallmentInfo {
  dueDate: string
  amount: number
  paymentMethod?: string
  isPaid: boolean
}

export interface PaymentStatus {
  isBlocked: boolean
  isDueSoon: boolean
  isInGracePeriod: boolean
  nextInstallment: InstallmentInfo | null
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

export async function checkStudentPaymentStatus(
  userId: number,
  req: PayloadRequest
): Promise<PaymentStatus> {
  const payload = await getPayload({ config })

  // 1. Fetch Platform Settings
  const settings = await payload.findGlobal({
    slug: 'platform-settings',
  })

  if (!settings) {
    // If settings don't exist, default to allowing access
    return {
      isBlocked: false,
      isDueSoon: false,
      isInGracePeriod: false,
      nextInstallment: null,
    }
  }

  // 2. Check maintenance mode
  if (settings.maintenanceMode) {
    if (settings.allowAllStudentsDuringMaintenance) {
      return {
        isBlocked: false,
        isDueSoon: false,
        isInGracePeriod: false,
        nextInstallment: null,
      }
    }
    return {
      isBlocked: true,
      isDueSoon: false,
      isInGracePeriod: false,
      nextInstallment: null,
      reason: 'MAINTENANCE_MODE',
    }
  }

  // 3. Get user document
  const user = await payload.findByID({
    collection: 'users',
    id: userId,
  })

  if (!user) {
    return {
      isBlocked: true,
      isDueSoon: false,
      isInGracePeriod: false,
      nextInstallment: null,
      reason: 'ADMISSION_NOT_CONFIRMED',
    }
  }

  // 4. Check if user is in trial period (with grace period support)
  if (user.trialEndDate) {
    const trialEnd = new Date(user.trialEndDate)
    const now = new Date()
    const trialDaysDiff = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    
    // Ensure gracePeriodDays is a number (handle null/undefined/string)
    const gracePeriodDays = typeof settings.gracePeriodDays === 'number' 
      ? Number(settings.gracePeriodDays) 
      : (typeof settings.gracePeriodDays === 'string' 
        ? parseInt(settings.gracePeriodDays, 10) || 0 
        : 0)
    
    const warningDaysBeforeDue = settings.warningDaysBeforeDue || 7
    
    // Trial is still active (not expired yet)
    if (trialDaysDiff > 0) {
      const isTrialEndingSoon = trialDaysDiff <= warningDaysBeforeDue
      
      return {
        isBlocked: false,
        isDueSoon: false,
        isInGracePeriod: false,
        nextInstallment: null,
        trialEndDate: user.trialEndDate,
        isTrialEndingSoon,
        isTrialInGracePeriod: false,
        daysUntilTrialEnd: trialDaysDiff,
        daysTrialOverdue: undefined,
        daysRemainingInTrialGracePeriod: undefined,
      }
    }
    
    // Trial has expired - check grace period
    const trialDaysOverdue = Math.abs(trialDaysDiff)
    const trialGracePeriodActive = gracePeriodDays > 0 && trialDaysOverdue <= gracePeriodDays
    const daysRemainingInTrialGracePeriod = trialGracePeriodActive 
      ? Math.max(0, gracePeriodDays - trialDaysOverdue) 
      : undefined
    
    // If trial is expired and grace period is active, allow access but show warning
    if (trialGracePeriodActive) {
      return {
        isBlocked: false,
        isDueSoon: false,
        isInGracePeriod: false,
        nextInstallment: null,
        trialEndDate: user.trialEndDate,
        isTrialEndingSoon: false,
        isTrialInGracePeriod: true,
        daysUntilTrialEnd: undefined,
        daysTrialOverdue: trialDaysOverdue,
        daysRemainingInTrialGracePeriod,
      }
    }
    
    // Trial expired and grace period ended - block if blocking is enabled
    if (settings.blockUnpaidStudents) {
      return {
        isBlocked: true,
        isDueSoon: false,
        isInGracePeriod: false,
        nextInstallment: null,
        trialEndDate: user.trialEndDate,
        isTrialEndingSoon: false,
        isTrialInGracePeriod: false,
        daysUntilTrialEnd: undefined,
        daysTrialOverdue: trialDaysOverdue,
        daysRemainingInTrialGracePeriod: undefined,
        reason: 'TRIAL_EXPIRED',
      }
    }
    
    // Trial expired but blocking is disabled - allow access
    return {
      isBlocked: false,
      isDueSoon: false,
      isInGracePeriod: false,
      nextInstallment: null,
      trialEndDate: user.trialEndDate,
      isTrialEndingSoon: false,
      isTrialInGracePeriod: false,
      daysUntilTrialEnd: undefined,
      daysTrialOverdue: trialDaysOverdue,
      daysRemainingInTrialGracePeriod: undefined,
    }
  }

  // 5. Check admission confirmation
  if (!user.isAdmissionConfirmed) {
    return {
      isBlocked: true,
      isDueSoon: false,
      isInGracePeriod: false,
      nextInstallment: null,
      reason: 'ADMISSION_NOT_CONFIRMED',
    }
  }

  // 6. Fetch active fees document for this student
  const fees = await payload.find({
    collection: 'fees',
    where: {
      and: [
        {
          student: {
            equals: userId,
          },
        },
        {
          isActive: {
            equals: true,
          },
        },
      ],
    },
    limit: 1,
  })

  if (fees.docs.length === 0) {
    // No fees record found - allow access (admin can create fees later)
    return {
      isBlocked: false,
      isDueSoon: false,
      isInGracePeriod: false,
      nextInstallment: null,
    }
  }

  const feeRecord = fees.docs[0]

  // 7. Find the earliest unpaid installment
  if (!feeRecord.installments || !Array.isArray(feeRecord.installments)) {
    return {
      isBlocked: false,
      isDueSoon: false,
      isInGracePeriod: false,
      nextInstallment: null,
    }
  }

  const unpaidInstallments = feeRecord.installments
    .filter((inst: any) => !inst.isPaid)
    .sort((a: any, b: any) => {
      const dateA = new Date(a.dueDate).getTime()
      const dateB = new Date(b.dueDate).getTime()
      return dateA - dateB
    })

  if (unpaidInstallments.length === 0) {
    // All installments are paid
    return {
      isBlocked: false,
      isDueSoon: false,
      isInGracePeriod: false,
      nextInstallment: null,
    }
  }

  const nextInstallment = unpaidInstallments[0]
  const dueDate = new Date(nextInstallment.dueDate)
  const now = new Date()
  const daysDiff = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  // 8. Calculate status based on Platform Settings
  const isOverdue = daysDiff < 0
  const daysOverdue = isOverdue ? Math.abs(daysDiff) : 0
  // Ensure gracePeriodDays is a number (handle null/undefined/string)
  const gracePeriodDays = typeof settings.gracePeriodDays === 'number' 
    ? Number(settings.gracePeriodDays) 
    : (typeof settings.gracePeriodDays === 'string' 
      ? parseInt(settings.gracePeriodDays, 10) || 0 
      : 0)
  
  // Grace period is active if payment is overdue AND within grace period days
  // AND grace period is enabled (gracePeriodDays > 0)
  const gracePeriodActive = isOverdue && gracePeriodDays > 0 && daysOverdue <= gracePeriodDays
  const daysRemainingInGracePeriod = gracePeriodActive 
    ? Math.max(0, gracePeriodDays - daysOverdue) 
    : undefined

  const installmentInfo: InstallmentInfo = {
    dueDate: nextInstallment.dueDate,
    amount: nextInstallment.amount,
    paymentMethod: nextInstallment.paymentMethod || undefined,
    isPaid: false,
  }

  // Check if due soon (within warning threshold)
  const isDueSoon = !isOverdue && daysDiff > 0 && daysDiff <= (settings.warningDaysBeforeDue || 7)

  // Check if should be blocked
  // Block if: blocking is enabled AND payment is overdue AND NOT in grace period
  // IMPORTANT: If grace period is active, student should NOT be blocked
  const shouldBlock = 
    settings.blockUnpaidStudents && 
    isOverdue && 
    !gracePeriodActive

  return {
    isBlocked: shouldBlock,
    isDueSoon,
    isInGracePeriod: gracePeriodActive,
    nextInstallment: installmentInfo,
    reason: shouldBlock ? 'PAYMENT_OVERDUE' : undefined,
    daysUntilDue: !isOverdue ? daysDiff : undefined,
    daysOverdue: isOverdue ? daysOverdue : undefined,
    daysRemainingInGracePeriod,
  }
}

