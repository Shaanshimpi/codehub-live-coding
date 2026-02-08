import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getMeUser } from '@/auth/getMeUser'

/**
 * GET /api/sessions/list
 * Get all active sessions (staff only)
 * 
 * Returns: { sessions: Array<{id, joinCode, title, trainer: {id, name, email}, participantCount, startedAt}> }
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user (must be staff)
    let user
    try {
      const result = await getMeUser({ nullUserRedirect: undefined })
      user = result.user
    } catch (error) {
      // User not authenticated
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Verify user is staff (admin or trainer)
    if (!user || (user.role !== 'trainer' && user.role !== 'admin')) {
      return NextResponse.json(
        { error: 'Unauthorized - staff access required' },
        { status: 401 }
      )
    }

    const payload = await getPayload({ config })

    // Find all active sessions
    const sessions = await payload.find({
      collection: 'live-sessions',
      where: {
        isActive: { equals: true },
      },
      limit: 100, // Reasonable limit
      depth: 1, // Populate trainer relationship
      sort: '-startedAt', // Most recent first
    })

    // Format response with trainer info
    const formattedSessions = sessions.docs.map((session) => {
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

