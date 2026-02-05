import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getMeUser } from '@/auth/getMeUser'

/**
 * GET /api/files/[id]
 * Get file content by ID
 * 
 * Returns: { id: string, name: string, content: string, language?: string }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      )
    }

    // Get authenticated user (files are user-specific)
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

    const payload = await getPayload({ config })

    // Find file by ID
    let file
    try {
      file = await payload.findByID({
        collection: 'files',
        id: id,
      })
    } catch (error) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    // Verify user owns the file (unless admin)
    if (user.role !== 'admin') {
      const fileOwnerId = typeof file.user === 'object' ? file.user.id : file.user
      if (fileOwnerId !== user.id) {
        return NextResponse.json(
          { error: 'Unauthorized - you do not own this file' },
          { status: 403 }
        )
      }
    }

    // Determine language from file extension
    let language: string | null = null
    const parts = file.name.split('.')
    const ext = parts.length > 1 ? parts.pop()!.toLowerCase() : ''
    if (ext) {
      // Map common extensions to language slugs
      const extToLang: Record<string, string> = {
        'js': 'javascript',
        'ts': 'typescript',
        'py': 'python',
        'java': 'java',
        'cpp': 'cpp',
        'c': 'c',
        'cs': 'csharp',
        'php': 'php',
        'rb': 'ruby',
        'go': 'go',
        'rs': 'rust',
        'swift': 'swift',
        'kt': 'kotlin',
        'scala': 'scala',
        'sh': 'bash',
        'html': 'html',
        'css': 'css',
        'json': 'json',
        'xml': 'xml',
      }
      language = extToLang[ext] || null
    }

    return NextResponse.json({
      id: file.id,
      name: file.name,
      content: file.content || '',
      language: language,
    })
  } catch (error) {
    console.error('Error fetching file:', error)
    return NextResponse.json(
      { error: 'Failed to fetch file' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/files/[id]
 * Update file content by ID
 * 
 * Body: { content?: string, name?: string, folder?: number | null }
 * Returns: { doc: { id, name, content, ... } }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      )
    }

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

    const payload = await getPayload({ config })
    const body = await request.json()

    // Find file first to verify ownership
    let file
    try {
      file = await payload.findByID({
        collection: 'files',
        id: id,
      })
    } catch (error) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    // Verify user owns the file (unless admin)
    if (user.role !== 'admin') {
      const fileOwnerId = typeof file.user === 'object' ? file.user.id : file.user
      if (fileOwnerId !== user.id) {
        return NextResponse.json(
          { error: 'Unauthorized - you do not own this file' },
          { status: 403 }
        )
      }
    }

    // Update file
    const updatedFile = await payload.update({
      collection: 'files',
      id: id,
      data: body,
    })

    return NextResponse.json({
      doc: updatedFile,
    })
  } catch (error) {
    console.error('Error updating file:', error)
    return NextResponse.json(
      { error: 'Failed to update file' },
      { status: 500 }
    )
  }
}

