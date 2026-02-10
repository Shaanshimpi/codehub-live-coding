import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getMeUser } from '@/auth/getMeUser'
import { hasFullAccess, checkDashboardAccess } from '@/utilities/dashboardAccess'

/**
 * DELETE /api/folders/[id]/delete
 * Delete a folder by ID
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'Folder ID is required' },
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

    // Find folder first to verify ownership
    let folder
    try {
      folder = await payload.findByID({
        collection: 'folders',
        id: id,
      })
    } catch (error) {
      return NextResponse.json(
        { error: 'Folder not found' },
        { status: 404 }
      )
    }

    // Verify user owns the folder or has dashboard access with edit permissions
    const folderOwnerId = typeof folder.user === 'object' ? folder.user.id : folder.user
    const isOwner = folderOwnerId === user.id
    const hasDashboardAccess = checkDashboardAccess(user)
    const canEdit = hasFullAccess(user) // Only admin/manager can edit, trainer is read-only
    
    if (!isOwner && !hasDashboardAccess) {
      return NextResponse.json(
        { error: 'Unauthorized - you do not own this folder' },
        { status: 403 }
      )
    }
    
    // Trainer can view but not delete
    if (!isOwner && !canEdit) {
      return NextResponse.json(
        { error: 'Unauthorized - read-only access' },
        { status: 403 }
      )
    }

    // Check if folder has files or subfolders
    const filesInFolder = await payload.find({
      collection: 'files',
      where: {
        folder: { equals: id },
      },
      limit: 1,
    })

    const subfolders = await payload.find({
      collection: 'folders',
      where: {
        parentFolder: { equals: id },
      },
      limit: 1,
    })

    if (filesInFolder.totalDocs > 0 || subfolders.totalDocs > 0) {
      return NextResponse.json(
        { error: 'Cannot delete folder: it contains files or subfolders' },
        { status: 400 }
      )
    }

    // Delete folder
    await payload.delete({
      collection: 'folders',
      id: id,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting folder:', error)
    return NextResponse.json(
      { error: 'Failed to delete folder' },
      { status: 500 }
    )
  }
}

