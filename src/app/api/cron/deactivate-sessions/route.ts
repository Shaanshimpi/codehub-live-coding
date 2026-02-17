import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getSessionExpirationCutoff } from '@/utilities/sessionExpiration'

/**
 * POST /api/cron/deactivate-sessions
 * Deactivates sessions that have been active for more than 24 hours
 * 
 * This endpoint should be called periodically (e.g., every hour) by a cron job
 * Protected by CRON_SECRET environment variable
 * 
 * Returns: { deactivated: number, message: string }
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const cronSecret = process.env.CRON_SECRET
    const authHeader = request.headers.get('authorization')
    
    if (!cronSecret) {
      console.error('CRON_SECRET not configured')
      return NextResponse.json(
        { error: 'Cron job not configured' },
        { status: 500 }
      )
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const payload = await getPayload({ config })

    // Calculate the cutoff time (24 hours ago)
    const twentyFourHoursAgo = getSessionExpirationCutoff()

    // Find all active sessions that started more than 24 hours ago
    const oldSessions = await payload.find({
      collection: 'live-sessions',
      where: {
        and: [
          { isActive: { equals: true } },
          {
            or: [
              { startedAt: { less_than: twentyFourHoursAgo.toISOString() } },
              // Also handle sessions without startedAt (use createdAt as fallback)
              {
                and: [
                  { startedAt: { exists: false } },
                  { createdAt: { less_than: twentyFourHoursAgo.toISOString() } },
                ],
              },
            ],
          },
        ],
      },
      limit: 1000, // Reasonable limit
    })

    let deactivatedCount = 0

    // Deactivate each old session
    for (const session of oldSessions.docs) {
      try {
        await payload.update({
          collection: 'live-sessions',
          id: session.id,
          data: {
            isActive: false,
            endedAt: new Date().toISOString(),
          },
        })
        deactivatedCount++
        console.log(`Deactivated session ${session.joinCode} (${session.title}) - started at ${session.startedAt || session.createdAt}`)
      } catch (error) {
        console.error(`Error deactivating session ${session.id}:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      deactivated: deactivatedCount,
      message: `Deactivated ${deactivatedCount} session(s) older than 24 hours`,
    })
  } catch (error) {
    console.error('Error in deactivate-sessions cron job:', error)
    return NextResponse.json(
      { error: 'Failed to deactivate sessions' },
      { status: 500 }
    )
  }
}

