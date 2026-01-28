import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { isValidJoinCode } from '@/utilities/joinCode'

/**
 * POST /api/sessions/[code]/join
 * Join a live session (increments participant count)
 * 
 * Returns: { success: boolean, title: string, language: string }
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

    const payload = await getPayload({ config })

    // Find active session by join code
    const sessions = await payload.find({
      collection: 'live-sessions',
      where: {
        joinCode: { equals: code.toUpperCase() },
        isActive: { equals: true },
      },
      limit: 1,
      depth: 1, // Include language relationship
    })

    if (sessions.docs.length === 0) {
      return NextResponse.json(
        { error: 'Session not found or has ended' },
        { status: 404 }
      )
    }

    const session = sessions.docs[0]

    // Increment participant count
    await payload.update({
      collection: 'live-sessions',
      id: session.id,
      data: {
        participantCount: (session.participantCount || 0) + 1,
      },
    })

    // Get language name if available
    const languageName = typeof session.language === 'object' 
      ? session.language?.name 
      : null

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      title: session.title,
      language: languageName,
      participantCount: (session.participantCount || 0) + 1,
    })
  } catch (error) {
    console.error('Error joining session:', error)
    return NextResponse.json(
      { error: 'Failed to join session' },
      { status: 500 }
    )
  }
}

