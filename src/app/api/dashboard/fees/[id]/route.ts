import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getMeUser } from '@/auth/getMeUser'
import { createAuthErrorResponse } from '@/utilities/apiErrorResponse'
import { canAccessFees } from '@/utilities/dashboardAccess'

/**
 * GET /api/dashboard/fees/[id]
 * Get fee details with installments
 * 
 * Returns: { doc: Fee }
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

    // Only admin and manager can access fees
    if (!canAccessFees(user)) {
      return createAuthErrorResponse('Unauthorized - admin or manager access required', 403)
    }

    const payload = await getPayload({ config })

    // Fetch fee
    // Use overrideAccess: true because we've already checked authorization at API level
    const fee = await payload.findByID({
      collection: 'fees',
      id: parseInt(id, 10),
      depth: 2, // Include student details
      overrideAccess: true,
    })

    return NextResponse.json({ doc: fee })
  } catch (error) {
    console.error('Error fetching fee:', error)
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Fee not found' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to fetch fee' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/dashboard/fees/[id]
 * Update fee record and installments (admin/manager only)
 * 
 * Body: Partial<Fee>
 * Returns: { doc: Fee }
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

    // Only admin and manager can update fees
    if (!canAccessFees(user)) {
      return createAuthErrorResponse('Unauthorized - admin or manager access required', 403)
    }

    const body = await request.json()
    const payload = await getPayload({ config })

    // Validate installments if provided
    if (body.installments && Array.isArray(body.installments)) {
      const totalInstallments = body.installments.reduce(
        (sum: number, inst: any) => sum + (inst.amount || 0),
        0
      )

      // Get current fee to check totalFee
      const currentFee = await payload.findByID({
        collection: 'fees',
        id: parseInt(id, 10),
        overrideAccess: true,
      })

      const totalFee = body.totalFee !== undefined ? body.totalFee : currentFee.totalFee

      if (Math.abs(totalInstallments - totalFee) > 0.01) {
        return NextResponse.json(
          { error: `Total installments (${totalInstallments}) must equal total fee (${totalFee})` },
          { status: 400 }
        )
      }
    }

    // Prepare update data
    const updateData: any = {}
    if (body.student !== undefined) {
      updateData.student = typeof body.student === 'number' ? body.student : parseInt(body.student, 10)
    }
    if (body.courseName !== undefined) updateData.courseName = body.courseName?.trim() || null
    if (body.totalFee !== undefined) updateData.totalFee = parseFloat(body.totalFee)
    if (body.currency !== undefined) updateData.currency = body.currency.trim()
    if (body.installments !== undefined) {
      updateData.installments = body.installments.map((inst: any) => ({
        dueDate: inst.dueDate,
        amount: parseFloat(inst.amount),
        isPaid: inst.isPaid || false,
        paymentMethod: inst.paymentMethod?.trim() || undefined,
        paidAt: inst.paidAt || undefined,
        notes: inst.notes?.trim() || undefined,
      }))
    }
    if (body.isActive !== undefined) updateData.isActive = body.isActive

    // Update fee
    // Use overrideAccess: true because we've already checked authorization at API level
    const updatedFee = await payload.update({
      collection: 'fees',
      id: parseInt(id, 10),
      data: updateData,
      depth: 2,
      overrideAccess: true,
    })

    return NextResponse.json({ doc: updatedFee })
  } catch (error) {
    console.error('Error updating fee:', error)
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Fee not found' },
        { status: 404 }
      )
    }
    const errorMessage = error instanceof Error ? error.message : 'Failed to update fee'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/dashboard/fees/[id]
 * Delete fee record (admin/manager only)
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

    // Only admin and manager can delete fees
    if (!canAccessFees(user)) {
      return createAuthErrorResponse('Unauthorized - admin or manager access required', 403)
    }

    const payload = await getPayload({ config })

    // Delete fee
    // Use overrideAccess: true because we've already checked authorization at API level
    await payload.delete({
      collection: 'fees',
      id: parseInt(id, 10),
      overrideAccess: true,
    })

    return NextResponse.json({ message: 'Fee deleted successfully' })
  } catch (error) {
    console.error('Error deleting fee:', error)
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Fee not found' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to delete fee' },
      { status: 500 }
    )
  }
}


