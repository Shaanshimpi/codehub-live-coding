import { NextRequest, NextResponse } from 'next/server'
import { getMeUser } from '@/auth/getMeUser'
import { checkStudentPaymentStatus } from '@/utilities/paymentGuard'
import { createAuthErrorResponse } from '@/utilities/apiErrorResponse'

/**
 * GET /api/user/payment-status
 * Get payment status for the current logged-in student
 * 
 * Returns: { paymentStatus: PaymentStatus }
 */
export async function GET(request: NextRequest) {
  try {
    let user
    try {
      const result = await getMeUser({ nullUserRedirect: undefined })
      user = result.user
    } catch (error) {
      // User not authenticated
      return createAuthErrorResponse('Session expired', 401)
    }
    
    if (!user) {
      return createAuthErrorResponse('Unauthorized', 401)
    }

    if (user.role !== 'student') {
      return createAuthErrorResponse('This endpoint is for students only', 403)
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

