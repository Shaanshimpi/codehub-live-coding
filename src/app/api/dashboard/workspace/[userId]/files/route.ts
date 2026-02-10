import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getMeUser } from '@/auth/getMeUser'
import { checkStudentPaymentStatus } from '@/utilities/paymentGuard'
import { createAuthErrorResponse } from '@/utilities/apiErrorResponse'
import { checkDashboardAccess } from '@/utilities/dashboardAccess'

/**
 * GET /api/dashboard/workspace/[userId]/files
 * Get workspace files for a specific user (admin/manager/trainer access)
 * 
 * Returns: { files: Array<{id, name, content, language}>, paymentStatus? }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // Get authenticated user (staff member)
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

    // Check if user has dashboard access
    if (!checkDashboardAccess(user)) {
      return createAuthErrorResponse('Unauthorized - dashboard access required', 403)
    }

    // Parse userId from params
    const { userId: userIdParam } = await params
    const userId = parseInt(userIdParam, 10)
    if (isNaN(userId)) {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      )
    }

    const payload = await getPayload({ config })

    // Fetch the target user to check if they exist
    let targetUser
    try {
      targetUser = await payload.findByID({
        collection: 'users',
        id: userId,
        overrideAccess: true,
      })
    } catch (error) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check payment status if viewing a student's workspace
    let paymentStatus = null
    if (targetUser.role === 'student') {
      // Create a mock request for payment check
      const mockRequest = {
        ...request,
        user: targetUser,
      } as any
      paymentStatus = await checkStudentPaymentStatus(userId, mockRequest)
    }

    // Get all files for the target user with folder information
    const files = await payload.find({
      collection: 'files',
      where: {
        user: { equals: userId },
      },
      limit: 1000,
      sort: '-updatedAt',
      depth: 2, // Include folder relationship
    })

    // Helper function to build folder path
    const getFolderPath = (folder: any, foldersMap: Map<number, any>): string => {
      if (!folder) return ''
      const folderObj = typeof folder === 'object' ? folder : foldersMap.get(folder)
      if (!folderObj) return ''
      
      const parentPath = folderObj.parentFolder 
        ? getFolderPath(folderObj.parentFolder, foldersMap)
        : ''
      return parentPath ? `${parentPath}/${folderObj.name}` : folderObj.name
    }

    // Build folder map for path resolution
    const foldersMap = new Map()
    if (files.docs.length > 0) {
      // Fetch all folders to build path
      const folders = await payload.find({
        collection: 'folders',
        where: {
          user: { equals: userId },
        },
        limit: 1000,
        depth: 2,
      })
      folders.docs.forEach((folder: any) => {
        foldersMap.set(folder.id, folder)
      })
    }

    // Map to simpler format and infer language from extension
    const filesList = files.docs.map((file) => {
      const parts = file.name.split('.')
      const ext = parts.length > 1 ? parts.pop()!.toLowerCase() : ''
      
      // Infer language from extension
      let language = 'javascript' // default
      if (ext === 'js' || ext === 'mjs' || ext === 'cjs') language = 'javascript'
      else if (ext === 'ts') language = 'typescript'
      else if (ext === 'py') language = 'python'
      else if (ext === 'java') language = 'java'
      else if (ext === 'c') language = 'c'
      else if (ext === 'cpp' || ext === 'cc' || ext === 'cxx') language = 'cpp'
      else if (ext === 'cs') language = 'csharp'
      else if (ext === 'php') language = 'php'
      else if (ext === 'rb') language = 'ruby'
      else if (ext === 'go') language = 'go'
      else if (ext === 'rs') language = 'rust'
      else if (ext === 'swift') language = 'swift'
      else if (ext === 'kt') language = 'kotlin'
      else if (ext === 'scala') language = 'scala'
      else if (ext === 'r') language = 'r'
      else if (ext === 'sql') language = 'sql'

      // Get folder path
      const folderPath = file.folder && file.folder !== null ? getFolderPath(file.folder, foldersMap) : ''

      return {
        id: file.id,
        name: file.name,
        content: file.content || '',
        language,
        updatedAt: file.updatedAt,
        folderPath,
        folderName: file.folder && typeof file.folder === 'object' ? file.folder.name : null,
        folder: file.folder && typeof file.folder === 'object' ? {
          id: String(file.folder.id),
          name: file.folder.name,
        } : undefined,
      }
    })

    return NextResponse.json({
      files: filesList,
      paymentStatus, // Include payment status if viewing student's workspace
      user: {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
      },
    })
  } catch (error) {
    console.error('Error fetching dashboard workspace files:', error)
    return NextResponse.json(
      { error: 'Failed to fetch workspace files' },
      { status: 500 }
    )
  }
}

