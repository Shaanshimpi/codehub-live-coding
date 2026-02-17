import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { isValidJoinCode } from '@/utilities/joinCode'
import { getMeUser } from '@/auth/getMeUser'
import { checkStudentPaymentStatus } from '@/utilities/paymentGuard'
import { isSessionExpired } from '@/utilities/sessionExpiration'

/**
 * GET /api/sessions/[code]/live
 * Get current live code and output (lightweight endpoint for polling)
 * 
 * Returns: { code: string, output: object, isActive: boolean, title: string }
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

    const payload = await getPayload({ config })

    // Find session by join code
    const sessions = await payload.find({
      collection: 'live-sessions',
      where: {
        joinCode: { equals: code.toUpperCase() },
      },
      limit: 1,
      depth: 1, // Include language
    })

    if (sessions.docs.length === 0) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    const session = sessions.docs[0]

    // Check if session has expired (older than 24 hours)
    if (session.isActive && isSessionExpired(session.startedAt, session.createdAt)) {
      // Auto-deactivate expired session
      await payload.update({
        collection: 'live-sessions',
        id: session.id,
        data: {
          isActive: false,
          endedAt: new Date().toISOString(),
        },
      })
      
      // Return inactive session
      return NextResponse.json({
        code: session.currentCode || '',
        output: session.currentOutput || null,
        isActive: false,
        title: session.title,
        language: null,
        participantCount: 0,
        trainerWorkspaceFileId: session.trainerWorkspaceFileId || null,
        trainerWorkspaceFileName: session.trainerWorkspaceFileName || null,
      })
    }

    // Determine language slug - prioritize from trainer's file name, then from session language
    let languageSlug: string | null = null
    
    // First, try to infer from trainer's file name
    if (session.trainerWorkspaceFileName) {
      const fileName = String(session.trainerWorkspaceFileName)
      const parts = fileName.split('.')
      if (parts.length > 1) {
        const ext = parts[parts.length - 1].toLowerCase()
        // Map common extensions to language slugs
        const extToLang: Record<string, string> = {
          'js': 'javascript',
          'ts': 'typescript',
          'py': 'python',
          'c': 'c',
          'cpp': 'cpp',
          'cc': 'cpp',
          'cxx': 'cpp',
          'java': 'java',
          'cs': 'csharp',
          'php': 'php',
          'rb': 'ruby',
          'go': 'go',
          'rs': 'rust',
          'kt': 'kotlin',
          'swift': 'swift',
          'scala': 'scala',
          'pl': 'perl',
          'r': 'r',
          'dart': 'dart',
          'lua': 'lua',
          'sh': 'bash',
          'hs': 'haskell',
          'ex': 'elixir',
          'erl': 'erlang',
          'clj': 'clojure',
          'groovy': 'groovy',
          'm': 'objectivec',
          'fs': 'fsharp',
          'asm': 'assembly',
          'f90': 'fortran',
          'f': 'fortran',
          'cob': 'cobol',
          'pas': 'pascal',
        }
        languageSlug = extToLang[ext] || null
      }
    }
    
    // Fallback to session language if file-based inference didn't work
    if (!languageSlug && session.language && typeof session.language === 'object') {
      languageSlug = (session.language as any).slug || null
    }

    // Calculate participant count from actual studentScratchpads array
    const scratchpads = (session.studentScratchpads as Record<string, any>) || {}
    const participantCount = Object.keys(scratchpads).length

    // Check payment status for students (optional - for frontend to show warnings)
    let paymentStatus = null
    try {
      const { user } = await getMeUser({ nullUserRedirect: undefined })
      if (user && user.role === 'student') {
        paymentStatus = await checkStudentPaymentStatus(user.id, request as any)
      }
    } catch (error) {
      // User not authenticated, continue without payment status
    }

    return NextResponse.json({
      code: session.currentCode || '',
      output: session.currentOutput || null,
      isActive: session.isActive,
      title: session.title,
      language: languageSlug,
      participantCount,
      trainerWorkspaceFileId: session.trainerWorkspaceFileId || null,
      trainerWorkspaceFileName: session.trainerWorkspaceFileName || null,
      paymentStatus, // Include payment status for students
    })
  } catch (error) {
    console.error('Error fetching live code:', error)
    return NextResponse.json(
      { error: 'Failed to fetch live code' },
      { status: 500 }
    )
  }
}

