import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getMeUser } from '@/auth/getMeUser'
import { createAuthErrorResponse } from '@/utilities/apiErrorResponse'
import { hasFullAccess } from '@/utilities/dashboardAccess'

/**
 * GET /api/dashboard/stats
 * Get dashboard statistics (role-filtered)
 * 
 * Returns: { stats: { totalStudents, totalTrainers, totalAdmins, totalManagers, activeSessions, pendingPayments?, overduePayments?, totalFiles, totalFolders } }
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    let user
    try {
      const result = await getMeUser({ nullUserRedirect: undefined })
      user = result.user
    } catch (error) {
      return createAuthErrorResponse('Session expired', 401)
    }

    if (!user) {
      return createAuthErrorResponse('Unauthorized', 401)
    }

    // Check if user has dashboard access (admin, manager, trainer)
    if (user.role !== 'admin' && user.role !== 'manager' && user.role !== 'trainer') {
      return createAuthErrorResponse('Unauthorized - dashboard access required', 403)
    }

    const payload = await getPayload({ config })
    const isFullAccess = hasFullAccess(user)

    // Count users by role
    const [students, trainers, admins, managers] = await Promise.all([
      payload.count({
        collection: 'users',
        where: {
          role: { equals: 'student' },
        },
      }),
      payload.count({
        collection: 'users',
        where: {
          role: { equals: 'trainer' },
        },
      }),
      payload.count({
        collection: 'users',
        where: {
          role: { equals: 'admin' },
        },
      }),
      payload.count({
        collection: 'users',
        where: {
          role: { equals: 'manager' },
        },
      }),
    ])

    // Count active sessions
    const activeSessions = await payload.count({
      collection: 'live-sessions',
      where: {
        isActive: { equals: true },
      },
    })

    // Count files and folders
    const [totalFiles, totalFolders] = await Promise.all([
      payload.count({
        collection: 'files',
      }),
      payload.count({
        collection: 'folders',
      }),
    ])

    // Payment statistics (only for admin/manager)
    let pendingPayments = 0
    let overduePayments = 0

    if (isFullAccess) {
      // Get all fees with installments
      const fees = await payload.find({
        collection: 'fees',
        limit: 1000,
        depth: 1,
      })

      const now = new Date()

      fees.docs.forEach((fee) => {
        if (fee.installments && Array.isArray(fee.installments)) {
          fee.installments.forEach((installment: any) => {
            if (installment.isPaid !== true) {
              const dueDate = new Date(installment.dueDate)
              if (dueDate < now) {
                overduePayments++
              } else {
                pendingPayments++
              }
            }
          })
        }
      })
    }

    const stats = {
      totalStudents: students.totalDocs,
      totalTrainers: trainers.totalDocs,
      totalAdmins: admins.totalDocs,
      totalManagers: managers.totalDocs,
      activeSessions: activeSessions.totalDocs,
      totalFiles: totalFiles.totalDocs,
      totalFolders: totalFolders.totalDocs,
      ...(isFullAccess && {
        pendingPayments,
        overduePayments,
      }),
    }

    return NextResponse.json({ stats })
  } catch (error) {
    console.error('Error fetching dashboard statistics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    )
  }
}




