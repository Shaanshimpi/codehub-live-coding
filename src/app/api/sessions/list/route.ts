import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getMeUser } from '@/auth/getMeUser'
import { createAuthErrorResponse } from '@/utilities/apiErrorResponse'
import { getSessionExpirationCutoff } from '@/utilities/sessionExpiration'

/**
 * GET /api/sessions/list
 * Get all active sessions (available to all authenticated users)
 * 
 * Query parameters:
 *   - trainerId: Optional. Filter sessions by trainer ID (for trainers to see only their sessions)
 * 
 * Returns: { sessions: Array<{id, joinCode, title, trainer: {id, name, email}, participantCount, startedAt}> }
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user (any authenticated user can view active sessions)
    let user
    try {
      const result = await getMeUser({ nullUserRedirect: undefined })
      user = result.user
    } catch (error) {
      // User not authenticated
      return createAuthErrorResponse('Session expired', 401)
    }
    
    // Verify user is authenticated (any role can view active sessions)
    if (!user) {
      return createAuthErrorResponse('Unauthorized', 401)
    }

    const payload = await getPayload({ config })

    // Get optional trainerId filter from query params
    const { searchParams } = new URL(request.url)
    const trainerIdFilter = searchParams.get('trainerId')

    // Calculate the cutoff time (24 hours ago)
    const twentyFourHoursAgo = getSessionExpirationCutoff()

    // Build where clause
    const whereClause: any = {
      isActive: { equals: true },
    }

    // If trainerId is provided, filter by trainer
    if (trainerIdFilter) {
      // Convert to number if it's a valid number, otherwise use as string
      const trainerId = isNaN(Number(trainerIdFilter)) ? trainerIdFilter : Number(trainerIdFilter)
      whereClause.trainer = { equals: trainerId }
    }

    // Find all active sessions that started within the last 24 hours
    // Also automatically deactivate sessions older than 24 hours
    const allActiveSessions = await payload.find({
      collection: 'live-sessions',
      where: whereClause,
      limit: 1000,
      depth: 1, // Populate trainer relationship
      sort: '-startedAt', // Most recent first
    })

    // Filter sessions and deactivate old ones
    const validSessions = []
    const sessionsToDeactivate = []

    for (const session of allActiveSessions.docs) {
      const sessionStartTime = session.startedAt || session.createdAt
      const startDate = sessionStartTime ? new Date(sessionStartTime) : new Date(session.createdAt)
      
      if (startDate < twentyFourHoursAgo) {
        // Session is older than 24 hours, mark for deactivation
        sessionsToDeactivate.push(session)
      } else {
        // Session is still valid
        validSessions.push(session)
      }
    }

    // Deactivate old sessions asynchronously (don't block the response)
    if (sessionsToDeactivate.length > 0) {
      Promise.all(
        sessionsToDeactivate.map(async (session) => {
          try {
            await payload.update({
              collection: 'live-sessions',
              id: session.id,
              data: {
                isActive: false,
                endedAt: new Date().toISOString(),
              },
            })
            console.log(`Auto-deactivated session ${session.joinCode} (${session.title}) - older than 24 hours`)
          } catch (error) {
            console.error(`Error auto-deactivating session ${session.id}:`, error)
          }
        })
      ).catch((error) => {
        console.error('Error in batch deactivation:', error)
      })
    }

    // Return only valid sessions (limit to 100)
    const sessions = validSessions.slice(0, 100)

    // Format response with trainer info
    const formattedSessions = sessions.map((session) => {
      const trainer = typeof session.trainer === 'object' 
        ? session.trainer 
        : null

      return {
        id: session.id,
        joinCode: session.joinCode,
        title: session.title,
        trainer: trainer ? {
          id: trainer.id,
          name: trainer.name || trainer.email || 'Unknown',
          email: trainer.email || '',
        } : null,
        participantCount: session.participantCount || 0,
        startedAt: session.startedAt || session.createdAt,
      }
    })

    return NextResponse.json({
      sessions: formattedSessions,
    })
  } catch (error) {
    console.error('Error fetching sessions list:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    )
  }
}

