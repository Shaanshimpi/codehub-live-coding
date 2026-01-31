import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { isValidJoinCode } from '@/utilities/joinCode'

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

    // Determine language slug if relationship is populated
    let languageSlug: string | null = null
    if (session.language && typeof session.language === 'object') {
      // @ts-expect-error - payload typed as any
      languageSlug = session.language.slug || null
    }

    // Calculate participant count from actual studentScratchpads array
    const scratchpads = (session.studentScratchpads as Record<string, any>) || {}
    const participantCount = Object.keys(scratchpads).length

    const currentCode = session.currentCode || ''
    const responseData = {
      code: currentCode,
      output: session.currentOutput || null,
      isActive: session.isActive,
      title: session.title,
      language: languageSlug,
      participantCount,
    }

    console.log('📡 [API] Returning live session data:', { 
      codeLength: responseData.code.length, 
      codePreview: currentCode.substring(0, 50),
      language: responseData.language,
      participantCount: responseData.participantCount,
      sessionId: session.id
    })

    // Return minimal data for efficient polling
    return NextResponse.json(responseData)
  } catch (error) {
    console.error('Error fetching live code:', error)
    return NextResponse.json(
      { error: 'Failed to fetch live code' },
      { status: 500 }
    )
  }
}

