import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { isValidJoinCode } from '@/utilities/joinCode'
import { getMeUser } from '@/auth/getMeUser'
import { createAuthErrorResponse } from '@/utilities/apiErrorResponse'

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
    let user
    try {
      const result = await getMeUser({ nullUserRedirect: undefined })
      user = result.user
    } catch (error) {
      return createAuthErrorResponse('Session expired', 401)
    }
    
    if (!user || (user.role !== 'student' && user.role !== 'trainer' && user.role !== 'admin')) {
      return createAuthErrorResponse('Unauthorized', 401)
    }

    const body = await request.json()
    const { code: scratchpadCode, language, output, workspaceFileId } = body as {
      code?: string // Legacy: kept for backward compatibility
      language?: string
      output?: unknown
      workspaceFileId?: string // New: primary way to sync file
    }

    // NEW SYSTEM: If workspaceFileId is provided, use it (code will be fetched from file)
    // LEGACY: If no workspaceFileId, require code and language
    if (!workspaceFileId) {
      if (typeof scratchpadCode !== 'string' || typeof language !== 'string') {
        return NextResponse.json(
          { error: 'Missing or invalid fields: code and language must be strings when workspaceFileId is not provided' },
          { status: 400 }
        )
      }
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
    
    // Get workspace file info if workspaceFileId is provided
    let workspaceFileName = null
    let fileContent = scratchpadCode || ''
    let fileLanguage = language || 'javascript'
    
    if (workspaceFileId) {
      try {
        const file = await payload.findByID({
          collection: 'files',
          id: workspaceFileId,
        })
        workspaceFileName = file.name
        // Fetch file content if not provided in request
        if (!scratchpadCode && file.content) {
          fileContent = file.content
        }
        // Infer language from file extension if not provided
        if (!language && file.name) {
          const parts = file.name.split('.')
          const ext = parts.length > 1 ? parts.pop()!.toLowerCase() : ''
          if (ext) {
            const extToLang: Record<string, string> = {
              'js': 'javascript', 'ts': 'typescript', 'py': 'python',
              'java': 'java', 'cpp': 'cpp', 'c': 'c', 'cs': 'csharp',
              'php': 'php', 'rb': 'ruby', 'go': 'go', 'rs': 'rust',
            }
            fileLanguage = extToLang[ext] || 'javascript'
          }
        }
      } catch {
        // File might not exist, use provided code/language or defaults
      }
    }
    
    // Update this student's scratchpad
    const updatedScratchpad: any = {
      code: fileContent, // Store code (from file or provided)
      language: fileLanguage,
      updatedAt: new Date().toISOString(),
      studentName: user.name || user.email || 'Anonymous',
    }
    if (output) updatedScratchpad.output = output
    if (workspaceFileId) {
      updatedScratchpad.workspaceFileId = workspaceFileId
      updatedScratchpad.workspaceFileName = workspaceFileName
    }

    scratchpads[user.id] = updatedScratchpad

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

