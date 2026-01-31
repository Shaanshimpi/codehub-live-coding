import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { isValidJoinCode } from '@/utilities/joinCode'

/**
 * POST /api/sessions/[code]/broadcast
 * Update the live code and output (called when trainer clicks "Run & Broadcast")
 * 
 * Body: { currentCode?: string, currentOutput?: object, languageSlug?: string }
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

    // Only parse body after validating the join code to avoid 500s for obviously invalid requests
    const body = await request.json()
    const { currentCode, currentOutput, languageSlug } = body as {
      currentCode?: string
      currentOutput?: unknown
      languageSlug?: string
    }
    
    console.log('📥 [API] Broadcast request received:', { 
      codeLength: typeof currentCode === 'string' ? currentCode.length : 0,
      hasOutput: currentOutput !== undefined,
      languageSlug 
    })

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

    // Optional language update (map slug -> languages doc id)
    let languageId: number | undefined
    if (languageSlug) {
      const langs = await payload.find({
        collection: 'languages',
        where: { slug: { equals: String(languageSlug).toLowerCase() } },
        limit: 1,
      })
      if (langs.docs[0]) {
        // Payload IDs are numbers in this project
        languageId = langs.docs[0].id as number
      }
    }

    // Update code / output / language
    const updateData: any = {}
    if (typeof currentCode === 'string') {
      const oldCode = session.currentCode || ''
      updateData.currentCode = currentCode
      console.log('💾 [API] Updating trainer code:', { 
        sessionId: session.id, 
        oldCodeLength: oldCode.length,
        newCodeLength: currentCode.length,
        oldCodePreview: oldCode.substring(0, 50),
        newCodePreview: currentCode.substring(0, 50),
        codeChanged: oldCode !== currentCode
      })
    }
    if (currentOutput !== undefined) {
      updateData.currentOutput = currentOutput
      console.log('📊 [API] Updating trainer output')
    }
    if (languageId) {
      updateData.language = languageId
      console.log('🔄 [API] Updating language:', languageId)
    }

    const updatedSession = await payload.update({
      collection: 'live-sessions',
      id: session.id,
      data: updateData,
    })

    console.log('✅ [API] Session updated successfully', { 
      sessionId: session.id, 
      updatedFields: Object.keys(updateData),
      savedCodeLength: updatedSession.currentCode?.length || 0,
      savedCodePreview: updatedSession.currentCode?.substring(0, 50) || ''
    })

    return NextResponse.json({
      success: true,
      updatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error broadcasting code:', error)
    return NextResponse.json(
      { error: 'Failed to broadcast code' },
      { status: 500 }
    )
  }
}

