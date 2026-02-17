import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { isValidJoinCode } from '@/utilities/joinCode'
import { getMeUser } from '@/auth/getMeUser'
import { createAuthErrorResponse } from '@/utilities/apiErrorResponse'

/**
 * GET /api/sessions/[code]/metadata
 * Get full session metadata (trainer only)
 * 
 * Returns: { session: {id, joinCode, title, trainer, language, isActive, participantCount, startedAt, endedAt, createdAt} }
 */
export async function GET(
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

    // Get authenticated user (must be trainer, manager, or admin)
    let user
    try {
      const result = await getMeUser({ nullUserRedirect: undefined })
      user = result.user
    } catch (error) {
      return createAuthErrorResponse('Session expired', 401)
    }
    
    if (!user || (user.role !== 'trainer' && user.role !== 'manager' && user.role !== 'admin')) {
      return createAuthErrorResponse('Unauthorized - trainer access required', 401)
    }

    const payload = await getPayload({ config })

    // Find session by join code
    const sessions = await payload.find({
      collection: 'live-sessions',
      where: {
        joinCode: { equals: code.toUpperCase() },
      },
      limit: 1,
      depth: 2, // Include trainer and language relationships
    })

    if (sessions.docs.length === 0) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    const session = sessions.docs[0]

    // Get trainer info
    const trainer = typeof session.trainer === 'object' 
      ? session.trainer 
      : null

    // Get language info
    const language = typeof session.language === 'object' 
      ? session.language 
      : null

    // Calculate participant count from scratchpads
    const scratchpads = (session.studentScratchpads as Record<string, any>) || {}
    const participantCount = Object.keys(scratchpads).length

    return NextResponse.json({
      session: {
        id: session.id,
        joinCode: session.joinCode,
        title: session.title,
        trainer: trainer ? {
          id: trainer.id,
          name: trainer.name || trainer.email || 'Unknown',
          email: trainer.email || '',
        } : null,
        language: language ? {
          id: language.id,
          name: language.name || '',
          slug: (language as any).slug || '',
        } : null,
        isActive: session.isActive,
        participantCount,
        startedAt: session.startedAt || session.createdAt,
        endedAt: session.endedAt || null,
        createdAt: session.createdAt,
        trainerWorkspaceFileId: session.trainerWorkspaceFileId || null,
        trainerWorkspaceFileName: session.trainerWorkspaceFileName || null,
      },
    })
  } catch (error) {
    console.error('Error fetching session metadata:', error)
    return NextResponse.json(
      { error: 'Failed to fetch session metadata' },
      { status: 500 }
    )
  }
}

