import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getMeUser } from '@/auth/getMeUser'
import { createAuthErrorResponse } from '@/utilities/apiErrorResponse'
import JSZip from 'jszip'

/**
 * GET /api/workspace/download
 * Download workspace as ZIP file
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    let user
    try {
      const result = await getMeUser({ nullUserRedirect: undefined })
      user = result.user
    } catch (error) {
      return createAuthErrorResponse('Session expired', 401)
    }

    if (!user) {
      return createAuthErrorResponse('Unauthorized', 401)
    }

    const payload = await getPayload({ config })

    // Fetch all folders
    const foldersRes = await payload.find({
      collection: 'folders',
      where: {
        user: { equals: user.id },
      },
      limit: 1000,
      depth: 2,
    })

    // Build folder path map
    const foldersMap = new Map<number, any>()
    const getFolderPath = (folder: any): string => {
      if (!folder) return ''
      const folderObj = typeof folder === 'object' ? folder : foldersMap.get(folder)
      if (!folderObj) return ''
      
      const parentPath = folderObj.parentFolder 
        ? getFolderPath(folderObj.parentFolder)
        : ''
      return parentPath ? `${parentPath}/${folderObj.name}` : folderObj.name
    }

    foldersRes.docs.forEach((folder: any) => {
      foldersMap.set(folder.id, folder)
    })

    // Fetch all files
    const filesRes = await payload.find({
      collection: 'files',
      where: {
        user: { equals: user.id },
      },
      limit: 1000,
      depth: 2,
    })

    // Create ZIP
    const zip = new JSZip()

    // Add files to ZIP
    for (const file of filesRes.docs) {
      const folderPath = file.folder && typeof file.folder === 'object' 
        ? getFolderPath(file.folder) 
        : ''
      const filePath = folderPath ? `${folderPath}/${file.name}` : file.name
      zip.file(filePath, file.content || '')
    }

    // Generate ZIP buffer
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })

    // Return ZIP file
    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="workspace-${user.email || 'export'}-${Date.now()}.zip"`,
      },
    })
  } catch (error) {
    console.error('Error creating workspace ZIP:', error)
    return NextResponse.json(
      { error: 'Failed to create workspace ZIP' },
      { status: 500 }
    )
  }
}

