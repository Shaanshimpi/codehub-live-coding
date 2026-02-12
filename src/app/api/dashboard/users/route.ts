import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getMeUser } from '@/auth/getMeUser'
import { createAuthErrorResponse } from '@/utilities/apiErrorResponse'
import { hasFullAccess } from '@/utilities/dashboardAccess'

/**
 * GET /api/dashboard/users
 * List users with pagination, search, and filters
 * 
 * Query params: page, limit, search, role, sort
 * Returns: { docs: User[], totalDocs, limit, page, totalPages }
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

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const search = searchParams.get('search') || ''
    const roleFilter = searchParams.get('role') || ''
    const sort = searchParams.get('sort') || '-createdAt'

    const payload = await getPayload({ config })

    // Build where clause
    const where: any = {}

    // Role filter
    if (roleFilter && ['admin', 'manager', 'trainer', 'student'].includes(roleFilter)) {
      where.role = { equals: roleFilter }
    }

    // Search filter (name or email)
    if (search) {
      where.or = [
        {
          name: {
            contains: search,
          },
        },
        {
          email: {
            contains: search,
          },
        },
      ]
    }

    // Fetch users
    // Use overrideAccess: true because we've already checked authorization at API level
    // Trainers need to see all users for dashboard, even though collection access restricts them
    const users = await payload.find({
      collection: 'users',
      where,
      limit,
      page,
      sort,
      overrideAccess: true,
    })

    // Fetch fees for students to calculate next payment due date
    const studentIds = users.docs.filter(u => u.role === 'student').map(u => u.id)
    const feesMap = new Map<number, { nextDueDate: string | null }>()
    
    if (studentIds.length > 0) {
      const fees = await payload.find({
        collection: 'fees',
        where: {
          and: [
            { student: { in: studentIds } },
            { isActive: { equals: true } },
          ],
        },
        overrideAccess: true,
      })

      // Calculate next payment due date for each student
      fees.docs.forEach((fee) => {
        const studentId = typeof fee.student === 'object' ? fee.student.id : fee.student
        
        if (fee.installments && Array.isArray(fee.installments)) {
          // Find next unpaid installment
          const sortedInstallments = [...fee.installments].sort(
            (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
          )
          
          const nextUnpaid = sortedInstallments.find((inst) => !inst.isPaid)
          if (nextUnpaid) {
            feesMap.set(studentId, { nextDueDate: nextUnpaid.dueDate })
          } else {
            // All paid
            feesMap.set(studentId, { nextDueDate: null })
          }
        } else {
          feesMap.set(studentId, { nextDueDate: null })
        }
      })
    }

    // Format response (exclude sensitive fields)
    const formattedUsers = users.docs.map((userDoc) => {
      const feeInfo = feesMap.get(userDoc.id)
      return {
        id: userDoc.id,
        name: userDoc.name,
        email: userDoc.email,
        role: userDoc.role,
        phone: userDoc.phone,
        college: userDoc.college,
        isAdmissionConfirmed: userDoc.isAdmissionConfirmed || false,
        trialEndDate: userDoc.trialEndDate || null,
        nextPaymentDueDate: feeInfo?.nextDueDate || null,
        createdAt: userDoc.createdAt,
        updatedAt: userDoc.updatedAt,
      }
    })

    return NextResponse.json({
      docs: formattedUsers,
      totalDocs: users.totalDocs,
      limit: users.limit,
      page: users.page,
      totalPages: users.totalPages,
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/dashboard/users
 * Create new user (admin/manager only)
 * 
 * Body: { name, email, password, role, phone, altPhone, dateOfBirth, college, educationalBackground, address, city, state, postalCode, country }
 * Returns: { doc: User }
 */
export async function POST(request: NextRequest) {
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

    // Only admin and manager can create users
    if (!hasFullAccess(user)) {
      return createAuthErrorResponse('Unauthorized - admin or manager access required', 403)
    }

    const body = await request.json()
    const {
      name,
      email,
      password,
      role,
      phone,
      altPhone,
      dateOfBirth,
      college,
      educationalBackground,
      address,
      city,
      state,
      postalCode,
      country,
    } = body

    // Validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    if (role && !['admin', 'manager', 'trainer', 'student'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      )
    }

    const payload = await getPayload({ config })

    // Check if email already exists
    // Use overrideAccess: true to check across all users
    const existingUser = await payload.find({
      collection: 'users',
      where: {
        email: { equals: email.toLowerCase().trim() },
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

    // Create user
    // Use overrideAccess: true because we've already checked authorization at API level
    const newUser = await payload.create({
      collection: 'users',
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password,
        role: role || 'student',
        phone: phone?.trim() || undefined,
        altPhone: altPhone?.trim() || undefined,
        dateOfBirth: dateOfBirth || undefined,
        college: college?.trim() || undefined,
        educationalBackground: educationalBackground?.trim() || undefined,
        address: address?.trim() || undefined,
        city: city?.trim() || undefined,
        state: state?.trim() || undefined,
        postalCode: postalCode?.trim() || undefined,
        country: country?.trim() || undefined,
      },
      overrideAccess: true,
    })

    // Return user without sensitive fields
    const { password: _, salt, hash, resetPasswordToken, resetPasswordExpiration, ...userResponse } = newUser

    return NextResponse.json({ doc: userResponse }, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to create user'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

