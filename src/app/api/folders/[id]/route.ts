import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getMeUser } from '@/auth/getMeUser'
import { hasFullAccess, checkDashboardAccess } from '@/utilities/dashboardAccess'

/**
 * PATCH /api/folders/[id]
 * Update folder by ID (rename or move)
 * 
 * Body: { name?: string, parentFolder?: number | null }
 * Returns: { doc: { id, name, slug, parentFolder, ... } }
 */
export async function PATCH(
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
    const body = await request.json()

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
    
    // Trainer can view but not edit
    if (!isOwner && !canEdit) {
      return NextResponse.json(
        { error: 'Unauthorized - read-only access' },
        { status: 403 }
      )
    }

    // Prevent moving folder into itself or its descendants
    if (body.parentFolder) {
      const newParentId = typeof body.parentFolder === 'object' 
        ? body.parentFolder.id 
        : body.parentFolder
      
      // Check if trying to move into itself
      if (String(newParentId) === String(id)) {
        return NextResponse.json(
          { error: 'Cannot move folder into itself' },
          { status: 400 }
        )
      }

      // Check if trying to move into a descendant
      let current: any = await payload.findByID({
        collection: 'folders',
        id: newParentId,
      }).catch(() => null)

      while (current) {
        if (String(current.id) === String(id)) {
          return NextResponse.json(
            { error: 'Cannot move folder into its own descendant' },
            { status: 400 }
          )
        }
        if (current.parentFolder) {
          const parentId = typeof current.parentFolder === 'object' 
            ? current.parentFolder.id 
            : current.parentFolder
          current = await payload.findByID({
            collection: 'folders',
            id: parentId,
          }).catch(() => null)
        } else {
          current = null
        }
      }
    }

    // Update folder
    const updatedFolder = await payload.update({
      collection: 'folders',
      id: id,
      data: body,
    })

    return NextResponse.json({
      doc: updatedFolder,
    })
  } catch (error) {
    console.error('Error updating folder:', error)
    return NextResponse.json(
      { error: 'Failed to update folder' },
      { status: 500 }
    )
  }
}


