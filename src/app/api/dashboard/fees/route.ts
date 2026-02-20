import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getMeUser } from '@/auth/getMeUser'
import { createAuthErrorResponse } from '@/utilities/apiErrorResponse'
import { canAccessFees } from '@/utilities/dashboardAccess'
import { checkStudentPaymentStatus } from '@/utilities/paymentGuard'
import type { PayloadRequest } from 'payload'

/**
 * GET /api/dashboard/fees
 * List fees with pagination, search, and filters
 * 
 * Query params: page, limit, search, status, currency, studentId, sort
 * Returns: { docs: Fee[], totalDocs, limit, page, totalPages }
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

    // Only admin and manager can access fees
    if (!canAccessFees(user)) {
      return createAuthErrorResponse('Unauthorized - admin or manager access required', 403)
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const search = searchParams.get('search') || ''
    const statusFilter = searchParams.get('status') || '' // 'paid', 'pending', 'overdue'
    const currencyFilter = searchParams.get('currency') || ''
    const studentIdFilter = searchParams.get('studentId') || ''
    const sort = searchParams.get('sort') || '-createdAt'

    const payload = await getPayload({ config })

    // Build where clause
    const where: any = {}

    // Student filter
    if (studentIdFilter) {
      where.student = { equals: parseInt(studentIdFilter, 10) }
    }

    // Currency filter
    if (currencyFilter) {
      where.currency = { equals: currencyFilter }
    }

    // Search filter (student name or email via relationship)
    if (search) {
      // We'll need to fetch students first and filter by their IDs
      const students = await payload.find({
        collection: 'users',
        where: {
          or: [
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
          ],
          role: { equals: 'student' },
        },
        limit: 100,
        overrideAccess: true,
      })

      if (students.docs.length > 0) {
        where.student = {
          in: students.docs.map((s) => s.id),
        }
      } else {
        // No matching students, return empty result
        return NextResponse.json({
          docs: [],
          totalDocs: 0,
          limit,
          page,
          totalPages: 0,
        })
      }
    }

    // Fetch fees
    // Use overrideAccess: true because we've already checked authorization at API level
    const fees = await payload.find({
      collection: 'fees',
      where,
      limit,
      page,
      sort,
      depth: 2, // Include student details
      overrideAccess: true,
    })

    // Calculate payment status for each fee
    const formattedFees = await Promise.all(
      fees.docs.map(async (fee) => {
        const studentId = typeof fee.student === 'object' ? fee.student.id : fee.student

        // Calculate payment status
        let status: 'paid' | 'pending' | 'overdue' = 'pending'
        let paidAmount = 0
        let nextDueDate: string | null = null
        let nextDueAmount = 0

        if (fee.installments && Array.isArray(fee.installments)) {
          const now = new Date()
          const sortedInstallments = [...fee.installments].sort(
            (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
          )

          paidAmount = fee.installments.reduce(
            (sum, inst) => sum + (inst.isPaid ? inst.amount : 0),
            0
          )

          // Find next unpaid installment
          const nextUnpaid = sortedInstallments.find((inst) => inst.isPaid !== true)
          if (nextUnpaid) {
            nextDueDate = nextUnpaid.dueDate
            nextDueAmount = nextUnpaid.amount

            // Check if overdue
            if (new Date(nextUnpaid.dueDate) < now) {
              status = 'overdue'
            }
          } else {
            // All paid
            status = 'paid'
          }
        }

        return {
          id: fee.id,
          student: fee.student,
          courseName: fee.courseName,
          totalFee: fee.totalFee,
          currency: fee.currency,
          installments: fee.installments,
          isActive: fee.isActive,
          createdAt: fee.createdAt,
          updatedAt: fee.updatedAt,
          // Calculated fields
          status,
          paidAmount,
          pendingAmount: fee.totalFee - paidAmount,
          nextDueDate,
          nextDueAmount,
        }
      })
    )

    // Apply status filter if provided
    let filteredFees = formattedFees
    if (statusFilter === 'paid') {
      filteredFees = formattedFees.filter((f) => f.status === 'paid')
    } else if (statusFilter === 'pending') {
      filteredFees = formattedFees.filter((f) => f.status === 'pending')
    } else if (statusFilter === 'overdue') {
      filteredFees = formattedFees.filter((f) => f.status === 'overdue')
    }

    return NextResponse.json({
      docs: filteredFees,
      totalDocs: filteredFees.length,
      limit,
      page,
      totalPages: Math.ceil(filteredFees.length / limit),
    })
  } catch (error) {
    console.error('Error fetching fees:', error)
    return NextResponse.json(
      { error: 'Failed to fetch fees' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/dashboard/fees
 * Create new fee record (admin/manager only)
 * 
 * Body: { student, courseName, totalFee, currency, installments, isActive }
 * Returns: { doc: Fee }
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

    // Only admin and manager can create fees
    if (!canAccessFees(user)) {
      return createAuthErrorResponse('Unauthorized - admin or manager access required', 403)
    }

    const payload = await getPayload({ config })

    const body = await request.json()
    const { student, courseName, totalFee, currency, installments, isActive } = body

    // Get platform settings for default currency
    const settings = await payload.findGlobal({
      slug: 'platform-settings',
    })

    const defaultCurrency = settings?.defaultCurrency || 'INR'

    // Validation
    if (!student || !totalFee || !installments || !Array.isArray(installments)) {
      return NextResponse.json(
        { error: 'Student, totalFee, and installments are required' },
        { status: 400 }
      )
    }

    // Use provided currency or default from settings
    const feeCurrency = currency || defaultCurrency

    if (installments.length === 0) {
      return NextResponse.json(
        { error: 'At least one installment is required' },
        { status: 400 }
      )
    }

    // Validate installments
    const totalInstallments = installments.reduce(
      (sum: number, inst: any) => sum + (inst.amount || 0),
      0
    )

    if (Math.abs(totalInstallments - totalFee) > 0.01) {
      return NextResponse.json(
        { error: `Total installments (${totalInstallments}) must equal total fee (${totalFee})` },
        { status: 400 }
      )
    }

    // Validate each installment
    for (const inst of installments) {
      if (!inst.dueDate || !inst.amount) {
        return NextResponse.json(
          { error: 'Each installment must have dueDate and amount' },
          { status: 400 }
        )
      }
    }

    // Create fee (payload already initialized above)
    // Use overrideAccess: true because we've already checked authorization at API level
    const newFee = await payload.create({
      collection: 'fees',
      data: {
        student: typeof student === 'number' ? student : parseInt(student, 10),
        courseName: courseName?.trim() || undefined,
        totalFee: parseFloat(totalFee),
        currency: feeCurrency.trim(),
        installments: installments.map((inst: any) => ({
          dueDate: inst.dueDate,
          amount: parseFloat(inst.amount),
          isPaid: inst.isPaid || false,
          paymentMethod: inst.paymentMethod?.trim() || undefined,
          paidAt: inst.paidAt || undefined,
          notes: inst.notes?.trim() || undefined,
        })),
        isActive: isActive !== undefined ? isActive : true,
      },
      depth: 2,
      overrideAccess: true,
    })

    return NextResponse.json({ doc: newFee }, { status: 201 })
  } catch (error) {
    console.error('Error creating fee:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to create fee'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

