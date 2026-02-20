/**
 * Core shared logic for calculating access status
 * This is the single source of truth for access status rules
 */

export type AccessStatus = 'trial' | 'grace' | 'granted' | 'restricted' | 'warning'

export interface AccessStatusInput {
  role: 'admin' | 'manager' | 'trainer' | 'student'
  isAdmissionConfirmed?: boolean | null
  trialEndDate?: string | null
  nextPaymentDueDate?: string | null
  temporaryAccessGranted?: boolean | null
}

export interface PlatformSettingsInput {
  gracePeriodDays?: number | string | null
  blockUnpaidStudents?: boolean
  warningDaysBeforeDue?: number
}

/**
 * Core function to calculate access status based on user data and platform settings
 * This is the single source of truth - all other functions should use this
 */
export function calculateAccessStatus(
  input: AccessStatusInput,
  settings?: PlatformSettingsInput | null
): AccessStatus {
  // Check temporary access override first - if granted, always return 'granted'
  if (input.temporaryAccessGranted === true) {
    return 'granted'
  }

  // Non-students always have granted access
  if (input.role !== 'student') {
    return 'granted'
  }

  // If no settings, default to granted
  if (!settings) {
    return 'granted'
  }

  const now = new Date()

  // Rule 1: Check trial period first - if trial remaining, return 'trial'
  if (input.trialEndDate) {
    const trialEnd = new Date(input.trialEndDate)
    const trialDaysDiff = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    
    // Trial is still active (remaining days > 0)
    if (trialDaysDiff > 0) {
      return 'trial'
    }
    
    // Trial ended - check if admitted
    // Rule 2: Trial ended & not admitted → restricted
    if (!input.isAdmissionConfirmed) {
      return 'restricted'
    }
    
    // Trial ended but admitted - continue to payment checks below
  }

  // Rule 2: Trial ended & not admitted → restricted (also check if no trial date but not admitted)
  if (!input.isAdmissionConfirmed) {
    return 'restricted'
  }

  // Rule 3: Admitted and no overdue → granted
  // If all fees are paid (nextPaymentDueDate is null), grant access
  if (!input.nextPaymentDueDate) {
    return 'granted'
  }

  // Check payment status for unpaid installments
  const dueDate = new Date(input.nextPaymentDueDate)
  const daysDiff = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  const isOverdue = daysDiff < 0
  const daysOverdue = isOverdue ? Math.abs(daysDiff) : 0
  
  const gracePeriodDays = typeof settings.gracePeriodDays === 'number' 
    ? settings.gracePeriodDays 
    : (typeof settings.gracePeriodDays === 'string' 
      ? parseInt(settings.gracePeriodDays, 10) || 0 
      : 0)
  
  const warningDaysBeforeDue = settings.warningDaysBeforeDue || 7

  // Rule 3: Admitted and no overdue → granted (payment not due yet)
  if (!isOverdue) {
    // Check if payment is due soon (within warning period but not overdue yet)
    if (daysDiff > 0 && daysDiff <= warningDaysBeforeDue) {
      // Rule 4: Admitted and payment due within warning period → warning
      return 'warning'
    }
    // Payment not due yet and not in warning period
    return 'granted'
  }

  // Payment is overdue
  const gracePeriodActive = gracePeriodDays > 0 && daysOverdue <= gracePeriodDays
  
  // Rule 5: Admitted and payment overdue by less than grace period → grace
  if (gracePeriodActive) {
    return 'grace'
  }
  
  // Rule 6: Admitted and payment overdue by more than grace period → restricted
  if (settings.blockUnpaidStudents) {
    return 'restricted'
  }

  // Blocking disabled - grant access even if overdue
  return 'granted'
}

