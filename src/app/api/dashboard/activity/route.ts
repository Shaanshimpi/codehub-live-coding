import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getMeUser } from '@/auth/getMeUser'
import { createAuthErrorResponse } from '@/utilities/apiErrorResponse'
import { hasFullAccess } from '@/utilities/dashboardAccess'

interface ActivityItem {
  type: 'user_registration' | 'fee_payment' | 'file_creation' | 'session_start'
  title: string
  description: string
  timestamp: string
  link?: string
  userId?: number
  userName?: string
}

/**
 * GET /api/dashboard/activity
 * Get recent activity feed
 * 
 * Returns: { activities: Array<ActivityItem> }
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

    // Check if user has dashboard access
    if (user.role !== 'admin' && user.role !== 'manager' && user.role !== 'trainer') {
      return createAuthErrorResponse('Unauthorized - dashboard access required', 403)
    }

    const payload = await getPayload({ config })
    const isFullAccess = hasFullAccess(user)
    const activities: ActivityItem[] = []

    // Recent user registrations (last 10)
    const recentUsers = await payload.find({
      collection: 'users',
      limit: 10,
      sort: '-createdAt',
    })

    recentUsers.docs.forEach((userDoc) => {
      activities.push({
        type: 'user_registration',
        title: 'New User Registered',
        description: `${userDoc.name || userDoc.email} joined as ${userDoc.role}`,
        timestamp: userDoc.createdAt,
        link: `/dashboard/users/${userDoc.id}`,
        userId: userDoc.id,
        userName: userDoc.name || userDoc.email || 'Unknown',
      })
    })

    // Recent fee payments (admin/manager only)
    if (isFullAccess) {
      const fees = await payload.find({
        collection: 'fees',
        limit: 50,
        depth: 2,
        sort: '-updatedAt',
      })

      fees.docs.forEach((fee) => {
        if (fee.installments && Array.isArray(fee.installments)) {
          fee.installments.forEach((installment: any) => {
            if (installment.isPaid && installment.paidAt) {
              const student = typeof fee.student === 'object' ? fee.student : null
              activities.push({
                type: 'fee_payment',
                title: 'Payment Received',
                description: `${student?.name || student?.email || 'Student'} paid ₹${installment.amount}${installment.paymentMethod ? ` via ${installment.paymentMethod}` : ''}`,
                timestamp: installment.paidAt,
                link: `/dashboard/fees/${fee.id}`,
                userId: student?.id,
                userName: student?.name || student?.email || 'Unknown',
              })
            }
          })
        }
      })
    }

    // Recent file creations (last 20)
    const recentFiles = await payload.find({
      collection: 'files',
      limit: 20,
      depth: 1,
      sort: '-createdAt',
    })

    recentFiles.docs.forEach((file) => {
      const fileUser = typeof file.user === 'object' ? file.user : null
      activities.push({
        type: 'file_creation',
        title: 'File Created',
        description: `${fileUser?.name || fileUser?.email || 'User'} created ${file.name}`,
        timestamp: file.createdAt,
        link: `/dashboard/files`,
        userId: fileUser?.id,
        userName: fileUser?.name || fileUser?.email || 'Unknown',
      })
    })

    // Recent session starts (last 10)
    const recentSessions = await payload.find({
      collection: 'live-sessions',
      limit: 10,
      depth: 1,
      sort: '-startedAt',
    })

    recentSessions.docs.forEach((session) => {
      const trainer = typeof session.trainer === 'object' ? session.trainer : null
      activities.push({
        type: 'session_start',
        title: 'Session Started',
        description: `${trainer?.name || trainer?.email || 'Trainer'} started "${session.title}"`,
        timestamp: session.startedAt || session.createdAt,
        link: `/dashboard/workspaces`,
        userId: trainer?.id,
        userName: trainer?.name || trainer?.email || 'Unknown',
      })
    })

    // Sort all activities by timestamp (newest first) and limit to 30
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    const limitedActivities = activities.slice(0, 30)

    return NextResponse.json({ activities: limitedActivities })
  } catch (error) {
    console.error('Error fetching activity feed:', error)
    return NextResponse.json(
      { error: 'Failed to fetch activity feed' },
      { status: 500 }
    )
  }
}


