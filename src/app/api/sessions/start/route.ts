import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { generateJoinCode } from '@/utilities/joinCode'
import { getMeUser } from '@/auth/getMeUser'

/**
 * POST /api/sessions/start
 * Creates a new live session with auto-generated unique join code
 * 
 * Body: { title: string, languageId?: string }
 * Returns: { joinCode: string, sessionId: string }
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user and verify trainer role
    const { user } = await getMeUser({ nullUserRedirect: undefined })
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify user is trainer or admin
    if (user.role !== 'trainer' && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only trainers can create sessions' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { title, languageId } = body

    if (!title) {
      return NextResponse.json(
        { error: 'Missing required field: title' },
        { status: 400 }
      )
    }

    const payload = await getPayload({ config })

    // Generate unique join code
    let joinCode = generateJoinCode()
    let attempts = 0
    const maxAttempts = 10

    // Ensure uniqueness
    while (attempts < maxAttempts) {
      const existing = await payload.find({
        collection: 'live-sessions',
        where: { joinCode: { equals: joinCode } },
        limit: 1,
      })

      if (existing.docs.length === 0) break

      joinCode = generateJoinCode()
      attempts++
    }

    if (attempts >= maxAttempts) {
      return NextResponse.json(
        { error: 'Failed to generate unique join code' },
        { status: 500 }
      )
    }

    // Create the session (use authenticated user as trainer)
    const session = await payload.create({
      collection: 'live-sessions',
      data: {
        joinCode,
        title,
        trainer: user.id, // Use authenticated user's ID
        language: languageId || undefined,
        isActive: true,
        participantCount: 0,
        startedAt: new Date().toISOString(),
        currentCode: '',
        currentOutput: null,
      },
    })

    return NextResponse.json({
      joinCode,
      sessionId: session.id,
      title: session.title,
    })
  } catch (error) {
    console.error('Error creating session:', error)
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    )
  }
}

