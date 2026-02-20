/**
 * Determine user access status - uses shared core logic
 * Returns: 'trial' | 'grace' | 'granted' | 'restricted' | 'warning'
 */

import { calculateAccessStatus, type AccessStatus, type AccessStatusInput, type PlatformSettingsInput } from './accessStatusCore'

export type { AccessStatus }

interface UserData {
  role: 'admin' | 'manager' | 'trainer' | 'student'
  isAdmissionConfirmed?: boolean | null
  trialEndDate?: string | null
  nextPaymentDueDate?: string | null
  temporaryAccessGranted?: boolean | null
}

interface PlatformSettings {
  gracePeriodDays?: number | string | null
  blockUnpaidStudents?: boolean
  warningDaysBeforeDue?: number
}

/**
 * Frontend function to get access status - delegates to shared core logic
 */
export function getAccessStatus(
  user: UserData,
  settings?: PlatformSettings | null
): AccessStatus {
  return calculateAccessStatus(
    {
      role: user.role,
      isAdmissionConfirmed: user.isAdmissionConfirmed,
      trialEndDate: user.trialEndDate,
      nextPaymentDueDate: user.nextPaymentDueDate,
      temporaryAccessGranted: user.temporaryAccessGranted,
    },
    settings
  )
}

