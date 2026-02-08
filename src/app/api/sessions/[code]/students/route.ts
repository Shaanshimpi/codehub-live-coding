import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { isValidJoinCode } from '@/utilities/joinCode'
import { getMeUser } from '@/auth/getMeUser'

/**
 * GET /api/sessions/[code]/students
 * Get all students' scratchpad code (trainer only)
 * 
 * Returns: { students: Array<{userId, name, code, language, updatedAt}> }
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

    // Get authenticated user (must be trainer or admin)
    // If not authenticated, redirect to home
    let user
    try {
      const result = await getMeUser({ nullUserRedirect: undefined })
      user = result.user
    } catch (error) {
      // User not authenticated, redirect to home
      return NextResponse.redirect(new URL('/', request.url))
    }
    
    if (!user || (user.role !== 'trainer' && user.role !== 'admin')) {
      return NextResponse.json(
        { error: 'Unauthorized - trainer access required' },
        { status: 401 }
      )
    }

    const payload = await getPayload({ config })

    // Find session by join code
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

    // Any staff member (admin or trainer) can access any session
    // No ownership check needed

    // Get student scratchpads
    const scratchpads = (session.studentScratchpads as Record<string, any>) || {}
    
    // Convert to array format
    const students = Object.entries(scratchpads).map(([userId, data]) => ({
      userId,
      name: data.studentName || 'Anonymous',
      code: data.code || '',
      language: data.language || 'javascript',
      updatedAt: data.updatedAt || null,
      output: data.output || null,
      workspaceFileId: data.workspaceFileId || null,
      workspaceFileName: data.workspaceFileName || null,
    }))

    return NextResponse.json({
      students,
    })
  } catch (error) {
    console.error('Error fetching students:', error)
    return NextResponse.json(
      { error: 'Failed to fetch students' },
      { status: 500 }
    )
  }
}

