import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getMeUser } from '@/auth/getMeUser'

/**
 * DELETE /api/files/[id]/delete
 * Delete a file by ID
 */
export async function DELETE(
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

    // Delete file
    await payload.delete({
      collection: 'files',
      id: id,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting file:', error)
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    )
  }
}




