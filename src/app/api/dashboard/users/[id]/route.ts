import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getMeUser } from '@/auth/getMeUser'
import { createAuthErrorResponse } from '@/utilities/apiErrorResponse'
import { hasFullAccess } from '@/utilities/dashboardAccess'

/**
 * GET /api/dashboard/users/[id]
 * Get user details
 * 
 * Returns: { doc: User }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

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

    // Fetch user
    // Use overrideAccess: true because we've already checked authorization at API level
    // Trainers need to see all users for dashboard, even though collection access restricts them
    const userDoc = await payload.findByID({
      collection: 'users',
      id: parseInt(id, 10),
      overrideAccess: true,
    })

    // Return user without sensitive fields
    const { password: _, salt, hash, resetPasswordToken, resetPasswordExpiration, ...userResponse } = userDoc

    return NextResponse.json({ doc: userResponse })
  } catch (error) {
    console.error('Error fetching user:', error)
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/dashboard/users/[id]
 * Update user (admin/manager only)
 * 
 * Body: Partial<User>
 * Returns: { doc: User }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

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

    // Only admin and manager can update users
    if (!hasFullAccess(user)) {
      return createAuthErrorResponse('Unauthorized - admin or manager access required', 403)
    }

    const body = await request.json()
    const payload = await getPayload({ config })

    // Validate role if provided
    if (body.role && !['admin', 'manager', 'trainer', 'student'].includes(body.role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      )
    }

    // Check if email is being changed and if it already exists
    if (body.email) {
      // Use overrideAccess: true to check across all users
      const existingUser = await payload.find({
        collection: 'users',
        where: {
          email: { equals: body.email.toLowerCase().trim() },
          id: { not_equals: parseInt(id, 10) },
        },
        limit: 1,
        overrideAccess: true,
      })

      if (existingUser.docs.length > 0) {
        return NextResponse.json(
          { error: 'User with this email already exists' },
          { status: 400 }
        )
      }
    }

    // Prepare update data
    const updateData: any = {}
    if (body.name !== undefined) updateData.name = body.name?.trim() || null
    if (body.email !== undefined) updateData.email = body.email?.toLowerCase().trim()
    if (body.password !== undefined) {
      if (body.password.length < 8) {
        return NextResponse.json(
          { error: 'Password must be at least 8 characters' },
          { status: 400 }
        )
      }
      updateData.password = body.password
    }
    if (body.role !== undefined) updateData.role = body.role
    if (body.phone !== undefined) updateData.phone = body.phone?.trim() || null
    if (body.altPhone !== undefined) updateData.altPhone = body.altPhone?.trim() || null
    if (body.dateOfBirth !== undefined) updateData.dateOfBirth = body.dateOfBirth || null
    if (body.college !== undefined) updateData.college = body.college?.trim() || null
    if (body.educationalBackground !== undefined) updateData.educationalBackground = body.educationalBackground?.trim() || null
    if (body.address !== undefined) updateData.address = body.address?.trim() || null
    if (body.city !== undefined) updateData.city = body.city?.trim() || null
    if (body.state !== undefined) updateData.state = body.state?.trim() || null
    if (body.postalCode !== undefined) updateData.postalCode = body.postalCode?.trim() || null
    if (body.country !== undefined) updateData.country = body.country?.trim() || null
    if (body.trialStartDate !== undefined) updateData.trialStartDate = body.trialStartDate || null
    if (body.trialEndDate !== undefined) updateData.trialEndDate = body.trialEndDate || null
    if (body.isAdmissionConfirmed !== undefined) updateData.isAdmissionConfirmed = body.isAdmissionConfirmed
    if (body.temporaryAccessGranted !== undefined) updateData.temporaryAccessGranted = body.temporaryAccessGranted

    // Update user
    const updatedUser = await payload.update({
      collection: 'users',
      id: parseInt(id, 10),
      data: updateData,
      overrideAccess: false,
      user,
    })

    // Return user without sensitive fields
    const { password: _, salt, hash, resetPasswordToken, resetPasswordExpiration, ...userResponse } = updatedUser

    return NextResponse.json({ doc: userResponse })
  } catch (error) {
    console.error('Error updating user:', error)
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    const errorMessage = error instanceof Error ? error.message : 'Failed to update user'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/dashboard/users/[id]
 * Delete user (admin/manager only)
 * 
 * Returns: { message: string }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

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

    // Only admin and manager can delete users
    if (!hasFullAccess(user)) {
      return createAuthErrorResponse('Unauthorized - admin or manager access required', 403)
    }

    // Prevent deleting yourself
    if (user.id === parseInt(id, 10)) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      )
    }

    const payload = await getPayload({ config })

    // Delete user
    // Use overrideAccess: true because we've already checked authorization at API level
    await payload.delete({
      collection: 'users',
      id: parseInt(id, 10),
      overrideAccess: true,
    })

    return NextResponse.json({ message: 'User deleted successfully' })
  } catch (error) {
    console.error('Error deleting user:', error)
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}

