import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getMeUser } from '@/auth/getMeUser'
import { createAuthErrorResponse } from '@/utilities/apiErrorResponse'
import JSZip from 'jszip'

/**
 * POST /api/workspace/upload
 * Upload and extract ZIP file to workspace
 */
export async function POST(request: NextRequest) {
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

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!file.name.endsWith('.zip')) {
      return NextResponse.json(
        { error: 'File must be a ZIP archive' },
        { status: 400 }
      )
    }

    const payload = await getPayload({ config })

    // Read ZIP file
    const arrayBuffer = await file.arrayBuffer()
    const zip = await JSZip.loadAsync(arrayBuffer)

    // Get existing folders to avoid duplicates
    const existingFolders = await payload.find({
      collection: 'folders',
      where: {
        user: { equals: user.id },
      },
      limit: 1000,
      depth: 2,
    })

    const foldersMap = new Map<string, number>() // path -> folderId
    
    // Helper to build folder path from folder object
    const getFolderPathFromObj = (folder: any, allFolders: any[]): string => {
      if (!folder) return ''
      const folderObj = typeof folder === 'object' ? folder : allFolders.find(f => f.id === folder)
      if (!folderObj) return ''
      const parentPath = folderObj.parentFolder ? getFolderPathFromObj(folderObj.parentFolder, allFolders) : ''
      return parentPath ? `${parentPath}/${folderObj.name}` : folderObj.name
    }

    // Build existing folders map
    existingFolders.docs.forEach((folder: any) => {
      const path = folder.parentFolder 
        ? `${getFolderPathFromObj(folder.parentFolder, existingFolders.docs)}/${folder.name}`
        : folder.name
      foldersMap.set(path, folder.id)
    })

    // Helper to get or create folder
    const getOrCreateFolder = async (folderPath: string): Promise<number | null> => {
      if (!folderPath) return null
      
      if (foldersMap.has(folderPath)) {
        return foldersMap.get(folderPath)!
      }

      const parts = folderPath.split('/')
      const folderName = parts.pop()!
      const parentPath = parts.join('/')
      const parentId = parentPath ? await getOrCreateFolder(parentPath) : null

      const newFolder = await payload.create({
        collection: 'folders',
        data: {
          name: folderName,
          user: user.id,
          parentFolder: parentId || undefined,
        },
      })

      foldersMap.set(folderPath, newFolder.id)
      return newFolder.id
    }

    // Process ZIP entries
    const entries = Object.keys(zip.files)
    const createdFiles: string[] = []
    const createdFolders: string[] = []

    for (const entryPath of entries) {
      const entry = zip.files[entryPath]
      
      // Skip directories (they end with /)
      if (entry.dir) {
        continue
      }

      // Get file content as buffer first to check for binary data
      const buffer = await entry.async('nodebuffer')
      
      // Check if file contains null bytes (binary file indicator)
      const hasNullBytes = buffer.includes(0x00)
      
      // Skip binary files (images, executables, etc.)
      if (hasNullBytes) {
        console.warn(`Skipping binary file: ${entryPath}`)
        continue
      }
      
      // Convert buffer to string, removing any null bytes just in case
      let content = buffer.toString('utf8')
      // Remove null bytes if any exist (safety check)
      content = content.replace(/\0/g, '')
      
      // Extract folder path and filename
      const pathParts = entryPath.split('/')
      const fileName = pathParts.pop()!
      const folderPath = pathParts.join('/')

      // Get or create folder
      let folderId: number | null = null
      if (folderPath) {
        folderId = await getOrCreateFolder(folderPath)
        if (!createdFolders.includes(folderPath)) {
          createdFolders.push(folderPath)
        }
      }

      // Check if file already exists
      const existingFiles = await payload.find({
        collection: 'files',
        where: {
          user: { equals: user.id },
          name: { equals: fileName },
          folder: folderId ? { equals: folderId } : { equals: null },
        },
        limit: 1,
      })

      if (existingFiles.docs.length > 0) {
        // Update existing file
        await payload.update({
          collection: 'files',
          id: existingFiles.docs[0].id,
          data: {
            content,
          },
        })
      } else {
        // Create new file
        await payload.create({
          collection: 'files',
          data: {
            name: fileName,
            content,
            user: user.id,
            folder: folderId || undefined,
          },
        })
      }

      createdFiles.push(entryPath)
    }

    return NextResponse.json({
      message: 'Workspace uploaded successfully',
      filesCreated: createdFiles.length,
      foldersCreated: createdFolders.length,
    })
  } catch (error) {
    console.error('Error uploading workspace:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload workspace' },
      { status: 500 }
    )
  }
}

