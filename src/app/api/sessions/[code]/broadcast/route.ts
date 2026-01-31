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

    const body = await request.json()
    const { currentCode, currentOutput, languageSlug } = body as {
      currentCode?: string
      currentOutput?: unknown
      languageSlug?: string
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
      updateData.currentCode = currentCode
    }
    if (currentOutput !== undefined) {
      updateData.currentOutput = currentOutput
    }
    if (languageId) {
      updateData.language = languageId
    }

    await payload.update({
      collection: 'live-sessions',
      id: session.id,
      data: updateData,
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

