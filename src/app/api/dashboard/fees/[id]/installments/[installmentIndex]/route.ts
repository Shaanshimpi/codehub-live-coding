import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getMeUser } from '@/auth/getMeUser'
import { createAuthErrorResponse } from '@/utilities/apiErrorResponse'
import { canAccessFees } from '@/utilities/dashboardAccess'

/**
 * PATCH /api/dashboard/fees/[id]/installments/[installmentIndex]
 * Mark installment as paid/unpaid
 * 
 * Body: { isPaid: boolean, paymentMethod?: string, notes?: string }
 * Returns: { doc: Fee }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; installmentIndex: string }> }
) {
  try {
    const { id, installmentIndex } = await params
    const index = parseInt(installmentIndex, 10)

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

    // Only admin and manager can mark payments
    if (!canAccessFees(user)) {
      return createAuthErrorResponse('Unauthorized - admin or manager access required', 403)
    }

    const body = await request.json()
    const { isPaid, paymentMethod, notes } = body

    if (typeof isPaid !== 'boolean') {
      return NextResponse.json(
        { error: 'isPaid must be a boolean' },
        { status: 400 }
      )
    }

    const payload = await getPayload({ config })

    // Fetch current fee
    const fee = await payload.findByID({
      collection: 'fees',
      id: parseInt(id, 10),
      overrideAccess: true,
    })

    if (!fee.installments || !Array.isArray(fee.installments) || index < 0 || index >= fee.installments.length) {
      return NextResponse.json(
        { error: 'Invalid installment index' },
        { status: 400 }
      )
    }

    // Update installment
    const updatedInstallments = [...fee.installments]
    updatedInstallments[index] = {
      ...updatedInstallments[index],
      isPaid,
      paymentMethod: paymentMethod?.trim() || updatedInstallments[index].paymentMethod || undefined,
      notes: notes?.trim() || updatedInstallments[index].notes || undefined,
      paidAt: isPaid && !updatedInstallments[index].paidAt 
        ? new Date().toISOString() 
        : (isPaid ? updatedInstallments[index].paidAt : undefined),
    }

    // Update fee
    // Use overrideAccess: true because we've already checked authorization at API level
    const updatedFee = await payload.update({
      collection: 'fees',
      id: parseInt(id, 10),
      data: {
        installments: updatedInstallments,
      },
      depth: 2,
      overrideAccess: true,
    })

    return NextResponse.json({ doc: updatedFee })
  } catch (error) {
    console.error('Error updating installment:', error)
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Fee not found' },
        { status: 404 }
      )
    }
    const errorMessage = error instanceof Error ? error.message : 'Failed to update installment'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}




