import type { User } from '@/payload-types'

/**
 * Check if user can access the dashboard
 * Only admin, manager, and trainer roles can access
 */
export function checkDashboardAccess(user: User | null | undefined): boolean {
  if (!user) return false
  return user.role === 'admin' || user.role === 'manager' || user.role === 'trainer'
}

/**
 * Check if user has full access (admin or manager)
 * Full access means can access all features including fees and settings
 */
export function hasFullAccess(user: User | null | undefined): boolean {
  if (!user) return false
  return user.role === 'admin' || user.role === 'manager'
}

/**
 * Check if user can access fees management
 * Only admin and manager can access fees
 */
export function canAccessFees(user: User | null | undefined): boolean {
  return hasFullAccess(user)
}

/**
 * Check if user can access global settings
 * Only admin and manager can access settings
 */
export function canAccessSettings(user: User | null | undefined): boolean {
  return hasFullAccess(user)
}

/**
 * Check if user can edit files in dashboard
 * Admin and manager can edit, trainer can only view (read-only)
 */
export function canEditFiles(user: User | null | undefined): boolean {
  return hasFullAccess(user)
}

/**
 * Check if user is staff (admin, manager, or trainer)
 */
export function isStaff(user: User | null | undefined): boolean {
  return checkDashboardAccess(user)
}




