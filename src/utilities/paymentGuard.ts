import type { PayloadRequest } from 'payload'
import { getPayload } from 'payload'
import config from '@payload-config'
import { calculateAccessStatus } from './accessStatusCore'

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

  // 4. Fetch active fees document for this student to get next payment due date
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

  let nextPaymentDueDate: string | null = null
  let nextInstallment: InstallmentInfo | null = null

  if (fees.docs.length > 0) {
    const feeRecord = fees.docs[0]

    if (feeRecord.installments && Array.isArray(feeRecord.installments)) {
      const unpaidInstallments = feeRecord.installments
        .filter((inst: any) => inst.isPaid !== true)
        .sort((a: any, b: any) => {
          const dateA = new Date(a.dueDate).getTime()
          const dateB = new Date(b.dueDate).getTime()
          return dateA - dateB
        })

      if (unpaidInstallments.length > 0) {
        const earliestUnpaid = unpaidInstallments[0]
        nextPaymentDueDate = earliestUnpaid.dueDate
        nextInstallment = {
          dueDate: earliestUnpaid.dueDate,
          amount: earliestUnpaid.amount,
          paymentMethod: earliestUnpaid.paymentMethod || undefined,
          isPaid: false,
        }
      }
    }
  }

  // 5. Use shared core function to calculate access status
  const accessStatus = calculateAccessStatus(
    {
      role: user.role,
      isAdmissionConfirmed: user.isAdmissionConfirmed || false,
      trialEndDate: user.trialEndDate || null,
      nextPaymentDueDate,
      temporaryAccessGranted: (user as any).temporaryAccessGranted || false,
    },
    settings
  )

  // 6. Map access status to PaymentStatus structure
  // Also calculate additional fields for trial period info
  const now = new Date()
  const trialEndDate: string | null = user.trialEndDate || null
  let isTrialEndingSoon = false
  let isTrialInGracePeriod = false
  let daysUntilTrialEnd: number | undefined = undefined
  let daysTrialOverdue: number | undefined = undefined
  let daysRemainingInTrialGracePeriod: number | undefined = undefined

  if (user.trialEndDate) {
    const trialEnd = new Date(user.trialEndDate)
    const trialDaysDiff = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    const warningDaysBeforeDue = settings.warningDaysBeforeDue || 7
    
    if (trialDaysDiff > 0) {
      isTrialEndingSoon = trialDaysDiff <= warningDaysBeforeDue
      daysUntilTrialEnd = trialDaysDiff
    } else {
      daysTrialOverdue = Math.abs(trialDaysDiff)
      const gracePeriodDays = typeof settings.gracePeriodDays === 'number' 
        ? settings.gracePeriodDays 
        : (typeof settings.gracePeriodDays === 'string' 
          ? parseInt(settings.gracePeriodDays, 10) || 0 
          : 0)
      
      if (gracePeriodDays > 0 && daysTrialOverdue <= gracePeriodDays) {
        isTrialInGracePeriod = true
        daysRemainingInTrialGracePeriod = Math.max(0, gracePeriodDays - daysTrialOverdue)
      }
    }
  }

  // Calculate payment-related fields
  let isDueSoon = false
  let isInGracePeriod = false
  let daysUntilDue: number | undefined = undefined
  let daysOverdue: number | undefined = undefined
  let daysRemainingInGracePeriod: number | undefined = undefined

  if (nextPaymentDueDate) {
    const dueDate = new Date(nextPaymentDueDate)
    const daysDiff = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    const isOverdue = daysDiff < 0
    const daysOverdueCalc = isOverdue ? Math.abs(daysDiff) : 0
    
    const warningDaysBeforeDue = settings.warningDaysBeforeDue || 7
    isDueSoon = !isOverdue && daysDiff > 0 && daysDiff <= warningDaysBeforeDue
    
    const gracePeriodDays = typeof settings.gracePeriodDays === 'number' 
      ? settings.gracePeriodDays 
      : (typeof settings.gracePeriodDays === 'string' 
        ? parseInt(settings.gracePeriodDays, 10) || 0 
        : 0)
    
    isInGracePeriod = isOverdue && gracePeriodDays > 0 && daysOverdueCalc <= gracePeriodDays
    
    if (!isOverdue) {
      daysUntilDue = daysDiff
    } else {
      daysOverdue = daysOverdueCalc
      if (isInGracePeriod) {
        daysRemainingInGracePeriod = Math.max(0, gracePeriodDays - daysOverdueCalc)
      }
    }
  }

  // Map access status to isBlocked
  const isBlocked = accessStatus === 'restricted'
  const reason = isBlocked 
    ? (accessStatus === 'restricted' && !user.isAdmissionConfirmed 
        ? 'ADMISSION_NOT_CONFIRMED' 
        : 'PAYMENT_OVERDUE')
    : undefined

  return {
    isBlocked,
    isDueSoon,
    isInGracePeriod,
    nextInstallment,
    trialEndDate,
    isTrialEndingSoon,
    isTrialInGracePeriod,
    daysUntilTrialEnd,
    daysTrialOverdue,
    daysRemainingInTrialGracePeriod,
    reason,
    daysUntilDue,
    daysOverdue,
    daysRemainingInGracePeriod,
  }
}

