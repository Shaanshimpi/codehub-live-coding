import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getMeUser } from '@/auth/getMeUser'

/**
 * GET /api/workspace/files
 * Get all workspace files for the authenticated user
 * 
 * Returns: { files: Array<{id, name, content, language}> }
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    let user
    try {
      const result = await getMeUser({ nullUserRedirect: undefined })
      user = result.user
    } catch (error) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const payload = await getPayload({ config })

    // Get all files for this user
    const files = await payload.find({
      collection: 'files',
      where: {
        user: { equals: user.id },
      },
      limit: 1000,
      sort: '-updatedAt',
    })

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

      return {
        id: file.id,
        name: file.name,
        content: file.content || '',
        language,
        updatedAt: file.updatedAt,
      }
    })

    return NextResponse.json({
      files: filesList,
    })
  } catch (error) {
    console.error('Error fetching workspace files:', error)
    return NextResponse.json(
      { error: 'Failed to fetch workspace files' },
      { status: 500 }
    )
  }
}

