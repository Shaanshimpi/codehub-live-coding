import { NextRequest, NextResponse } from 'next/server'
import { getMeUser } from '@/auth/getMeUser'
import { checkStudentPaymentStatus } from '@/utilities/paymentGuard'

/**
 * TEST ENDPOINT - Remove in production
 * GET /api/test-payment-guard
 * Tests the payment guard utility for the current logged-in user
 */
export async function GET(request: NextRequest) {
  try {
    const { user } = await getMeUser({ nullUserRedirect: undefined })
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please login first' },
        { status: 401 }
      )
    }

    // Allow testing for all roles, but only check payment for students
    if (user.role !== 'student') {
      return NextResponse.json({
        message: 'Payment guard only applies to students',
        userRole: user.role,
        userId: user.id,
        userName: user.name,
      })
    }

    // Check payment status
    const paymentStatus = await checkStudentPaymentStatus(user.id, request as any)

    return NextResponse.json({
      success: true,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      paymentStatus,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error testing payment guard:', error)
    return NextResponse.json(
      { 
        error: 'Failed to test payment guard',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}




