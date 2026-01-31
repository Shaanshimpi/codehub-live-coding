import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { isValidJoinCode } from '@/utilities/joinCode'
import { getMeUser } from '@/auth/getMeUser'

/**
 * POST /api/sessions/[code]/scratchpad
 * Update student's scratchpad code and output (called periodically by student client)
 * 
 * Body: { code: string, language: string, output?: object }
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

    // Get authenticated user (student)
    const { user } = await getMeUser({ nullUserRedirect: undefined })
    if (!user || (user.role !== 'student' && user.role !== 'trainer' && user.role !== 'admin')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body with error handling
    let body
    try {
      // Check if request has content
      const contentType = request.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        return NextResponse.json(
          { error: 'Content-Type must be application/json' },
          { status: 400 }
        )
      }

      // Try to parse JSON body
      body = await request.json()
    } catch (error) {
      // Handle empty body or invalid JSON
      if (error instanceof SyntaxError || error instanceof TypeError) {
        return NextResponse.json(
          { error: 'Invalid or empty request body' },
          { status: 400 }
        )
      }
      throw error // Re-throw unexpected errors
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Request body must be a JSON object' },
        { status: 400 }
      )
    }

    const { code: scratchpadCode, language, output, workspaceFileId } = body

    if (typeof scratchpadCode !== 'string' || typeof language !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid fields: code and language must be strings' },
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
        { error: 'Session not found or has ended' },
        { status: 404 }
      )
    }

    const session = sessions.docs[0]

    // Get or initialize student scratchpads
    const scratchpads = (session.studentScratchpads as Record<string, any>) || {}
    
    // Update this student's scratchpad
    const existingData = scratchpads[user.id] || {}
    
    // Get workspace file name if workspaceFileId is provided
    let workspaceFileName = existingData.workspaceFileName || null
    if (workspaceFileId) {
      try {
        const file = await payload.findByID({
          collection: 'files',
          id: workspaceFileId,
        })
        workspaceFileName = file.name
      } catch {
        // File might not exist, keep existing name or null
      }
    }
    
    scratchpads[user.id] = {
      ...existingData,
      code: scratchpadCode,
      language,
      updatedAt: new Date().toISOString(),
      studentName: user.name || user.email || 'Anonymous',
      // Only update output if provided (preserve existing output if not)
      ...(output && { output }),
      // Store workspace file ID and name if provided
      ...(workspaceFileId && { workspaceFileId, workspaceFileName }),
    }

    // Update session with new scratchpads
    await payload.update({
      collection: 'live-sessions',
      id: session.id,
      data: {
        studentScratchpads: scratchpads,
      },
    })

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error('Error updating scratchpad:', error)
    return NextResponse.json(
      { error: 'Failed to update scratchpad' },
      { status: 500 }
    )
  }
}

