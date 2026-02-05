import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getMeUser } from '@/auth/getMeUser'

/**
 * POST /api/files
 * Create a new file
 * 
 * Body: { name: string, content?: string, folder?: number | null }
 * Returns: { doc: { id, name, content, ... } }
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    let user
    try {
      const result = await getMeUser({ nullUserRedirect: undefined })
      user = result.user
    } catch {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, content, folder } = body

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'File name is required' },
        { status: 400 }
      )
    }

    const payload = await getPayload({ config })

    // Create file
    const newFile = await payload.create({
      collection: 'files',
      data: {
        name: name.trim(),
        content: content || '',
        user: user.id,
        folder: folder || null,
      },
    })

    return NextResponse.json({
      doc: newFile,
    })
  } catch (error) {
    console.error('Error creating file:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to create file'
    return NextResponse.json(
      { error: errorMessage, details: error instanceof Error ? error.stack : undefined },
      { status: 500 }
    )
  }
}

