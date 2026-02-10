import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getMeUser } from '@/auth/getMeUser'
import { createAuthErrorResponse } from '@/utilities/apiErrorResponse'
import { canAccessSettings } from '@/utilities/dashboardAccess'

/**
 * GET /api/dashboard/settings
 * Get platform settings (admin/manager only)
 * 
 * Returns: PlatformSettings
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

    // Only admin and manager can access settings
    if (!canAccessSettings(user)) {
      return createAuthErrorResponse('Unauthorized - admin or manager access required', 403)
    }

    const payload = await getPayload({ config })

    // Fetch platform settings
    const settings = await payload.findGlobal({
      slug: 'platform-settings',
    })

    if (!settings) {
      return NextResponse.json(
        { error: 'Platform settings not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error fetching platform settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch platform settings' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/dashboard/settings
 * Update platform settings (admin/manager only)
 * 
 * Body: Partial<PlatformSettings>
 * Returns: Updated PlatformSettings
 */
export async function PATCH(request: NextRequest) {
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

    // Only admin and manager can update settings
    if (!canAccessSettings(user)) {
      return createAuthErrorResponse('Unauthorized - admin or manager access required', 403)
    }

    const body = await request.json()

    // Validate settings values
    if (body.trialDays !== undefined && (body.trialDays < 0 || !Number.isInteger(body.trialDays))) {
      return NextResponse.json(
        { error: 'Trial days must be a non-negative integer' },
        { status: 400 }
      )
    }

    if (body.warningDaysBeforeDue !== undefined && (body.warningDaysBeforeDue < 0 || !Number.isInteger(body.warningDaysBeforeDue))) {
      return NextResponse.json(
        { error: 'Warning days before due must be a non-negative integer' },
        { status: 400 }
      )
    }

    if (body.gracePeriodDays !== undefined && (body.gracePeriodDays < 0 || !Number.isInteger(body.gracePeriodDays))) {
      return NextResponse.json(
        { error: 'Grace period days must be a non-negative integer' },
        { status: 400 }
      )
    }

    if (body.maxInstallmentsPerFee !== undefined && body.maxInstallmentsPerFee !== null && (body.maxInstallmentsPerFee < 1 || !Number.isInteger(body.maxInstallmentsPerFee))) {
      return NextResponse.json(
        { error: 'Max installments per fee must be a positive integer' },
        { status: 400 }
      )
    }

    if (body.availableCurrencies !== undefined && !Array.isArray(body.availableCurrencies)) {
      return NextResponse.json(
        { error: 'Available currencies must be an array' },
        { status: 400 }
      )
    }

    if (body.availablePaymentMethods !== undefined && !Array.isArray(body.availablePaymentMethods)) {
      return NextResponse.json(
        { error: 'Available payment methods must be an array' },
        { status: 400 }
      )
    }

    const payload = await getPayload({ config })

    // Update platform settings
    const updatedSettings = await payload.updateGlobal({
      slug: 'platform-settings',
      data: body,
    })

    return NextResponse.json(updatedSettings)
  } catch (error) {
    console.error('Error updating platform settings:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update platform settings' },
      { status: 500 }
    )
  }
}

