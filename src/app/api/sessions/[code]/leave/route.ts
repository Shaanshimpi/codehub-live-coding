import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { isValidJoinCode } from '@/utilities/joinCode'
import { getMeUser } from '@/auth/getMeUser'

/**
 * POST /api/sessions/[code]/leave
 * Leave a live session (removes student from studentScratchpads)
 * 
 * Returns: { success: boolean }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params

    if (!code || !isValidJoinCode(code)) {
      return NextResponse.json(
        { error: 'Invalid join code format' },
        { status: 400 }
      )
    }

    // Get authenticated user
    const { user } = await getMeUser({ nullUserRedirect: undefined })
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const payload = await getPayload({ config })

    // Find session by join code (active or not - user might leave after session ends)
    const sessions = await payload.find({
      collection: 'live-sessions',
      where: {
        joinCode: { equals: code.toUpperCase() },
      },
      limit: 1,
    })

    if (sessions.docs.length === 0) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    const session = sessions.docs[0]

    // Get student scratchpads
    const scratchpads = (session.studentScratchpads as Record<string, any>) || {}
    
    // Remove this student from scratchpads
    if (scratchpads[user.id]) {
      delete scratchpads[user.id]

      // Update session with updated scratchpads
      await payload.update({
        collection: 'live-sessions',
        id: session.id,
        data: {
          studentScratchpads: scratchpads,
        },
      })
    }

    // Calculate actual participant count from scratchpads
    const participantCount = Object.keys(scratchpads).length

    return NextResponse.json({
      success: true,
      participantCount,
    })
  } catch (error) {
    console.error('Error leaving session:', error)
    return NextResponse.json(
      { error: 'Failed to leave session' },
      { status: 500 }
    )
  }
}


