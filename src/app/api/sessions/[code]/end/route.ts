import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { isValidJoinCode } from '@/utilities/joinCode'

/**
 * POST /api/sessions/[code]/end
 * End a live session (trainer only)
 * 
 * Returns: { success: boolean, endedAt: string }
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
    })

    if (sessions.docs.length === 0) {
      return NextResponse.json(
        { error: 'Session not found or already ended' },
        { status: 404 }
      )
    }

    const session = sessions.docs[0]
    const endedAt = new Date().toISOString()

    // End the session
    await payload.update({
      collection: 'live-sessions',
      id: session.id,
      data: {
        isActive: false,
        endedAt,
      },
    })

    return NextResponse.json({
      success: true,
      endedAt,
    })
  } catch (error) {
    console.error('Error ending session:', error)
    return NextResponse.json(
      { error: 'Failed to end session' },
      { status: 500 }
    )
  }
}

