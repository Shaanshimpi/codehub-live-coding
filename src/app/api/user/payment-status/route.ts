import { NextRequest, NextResponse } from 'next/server'
import { getMeUser } from '@/auth/getMeUser'
import { checkStudentPaymentStatus } from '@/utilities/paymentGuard'

/**
 * GET /api/user/payment-status
 * Get payment status for the current logged-in student
 * 
 * Returns: { paymentStatus: PaymentStatus }
 */
export async function GET(request: NextRequest) {
  try {
    const { user } = await getMeUser({ nullUserRedirect: undefined })
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (user.role !== 'student') {
      return NextResponse.json(
        { error: 'This endpoint is for students only' },
        { status: 403 }
      )
    }

    const paymentStatus = await checkStudentPaymentStatus(user.id, request as any)

    return NextResponse.json({
      paymentStatus,
    })
  } catch (error) {
    console.error('Error fetching payment status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payment status' },
      { status: 500 }
    )
  }
}

