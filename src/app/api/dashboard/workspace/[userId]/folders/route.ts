import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getMeUser } from '@/auth/getMeUser'
import { createAuthErrorResponse } from '@/utilities/apiErrorResponse'
import { checkDashboardAccess } from '@/utilities/dashboardAccess'

/**
 * GET /api/dashboard/workspace/[userId]/folders
 * Get workspace folders for a specific user (admin/manager/trainer access)
 * 
 * Returns: { docs: Array<Folder> }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // Get authenticated user (staff member)
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
    if (!checkDashboardAccess(user)) {
      return createAuthErrorResponse('Unauthorized - dashboard access required', 403)
    }

    // Parse userId from params
    const { userId: userIdParam } = await params
    const userId = parseInt(userIdParam, 10)
    if (isNaN(userId)) {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      )
    }

    const payload = await getPayload({ config })

    // Verify target user exists
    try {
      await payload.findByID({
        collection: 'users',
        id: userId,
        overrideAccess: true,
      })
    } catch (error) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get all folders for the target user
    const folders = await payload.find({
      collection: 'folders',
      where: {
        user: { equals: userId },
      },
      limit: 1000,
      depth: 2, // Include parent folder relationship
    })

    return NextResponse.json({
      docs: folders.docs,
    })
  } catch (error) {
    console.error('Error fetching dashboard workspace folders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch workspace folders' },
      { status: 500 }
    )
  }
}

