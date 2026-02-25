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
    
    if (!user || (user.role !== 'student' && user.role !== 'trainer' && user.role !== 'manager' && user.role !== 'admin')) {
      return createAuthErrorResponse('Unauthorized', 401)
    }

    const body = await request.json()
    const { code: scratchpadCode, language, output, workspaceFileId, workspaceFileName: bodyWorkspaceFileName } = body as {
      code?: string
      language?: string
      output?: unknown
      workspaceFileId?: string
      workspaceFileName?: string
    }

    // When workspaceFileId is omitted, require code and language (legacy)
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
    
    // Use code and workspaceFileName from body when provided (keeps code + output in sync without stale file fetch)
    let workspaceFileName: string | null = typeof bodyWorkspaceFileName === 'string' ? bodyWorkspaceFileName : null
    let fileContent = typeof scratchpadCode === 'string' ? scratchpadCode : ''
    let fileLanguage = typeof language === 'string' ? language : 'javascript'
    
    if (workspaceFileId && (fileContent === '' || workspaceFileName === null)) {
      try {
        const file = await payload.findByID({
          collection: 'files',
          id: workspaceFileId,
        })
        if (workspaceFileName === null) workspaceFileName = file.name
        if (fileContent === '' && file.content) fileContent = file.content
        if (fileLanguage === 'javascript' && file.name) {
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
        // File might not exist, use provided or defaults
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

