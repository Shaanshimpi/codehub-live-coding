/**
 * Utility functions for fetching file content in session context
 */

export interface FileContent {
  id: string
  name: string
  content: string
  language: string | null
}

export interface FileFetchError {
  error: string
  code: 'NOT_FOUND' | 'UNAUTHORIZED' | 'NETWORK_ERROR' | 'UNKNOWN'
}

/**
 * Fetch file content by ID
 * Always fetches fresh content (no caching)
 */
export async function fetchFileContent(fileId: string): Promise<FileContent | FileFetchError> {
  try {
    const response = await fetch(`/api/files/${fileId}`, {
      cache: 'no-store',
      credentials: 'include',
    })

    if (!response.ok) {
      if (response.status === 404) {
        return { error: 'File not found', code: 'NOT_FOUND' }
      }
      if (response.status === 401 || response.status === 403) {
        return { error: 'Unauthorized to access this file', code: 'UNAUTHORIZED' }
      }
      return { error: `Failed to fetch file: ${response.status}`, code: 'NETWORK_ERROR' }
    }

    const data = await response.json()
    return {
      id: data.id,
      name: data.name,
      content: data.content || '',
      language: data.language || null,
    }
  } catch (error) {
    console.error('Error fetching file:', error)
    return {
      error: error instanceof Error ? error.message : 'Unknown error',
      code: 'NETWORK_ERROR',
    }
  }
}

/**
 * Fetch multiple files by IDs
 * Returns array of results (success or error for each)
 */
export async function fetchMultipleFiles(
  fileIds: string[]
): Promise<Array<FileContent | FileFetchError>> {
  const results = await Promise.all(fileIds.map((id) => fetchFileContent(id)))
  return results
}

/**
 * Check if result is an error
 */
export function isFileError(
  result: FileContent | FileFetchError
): result is FileFetchError {
  return 'error' in result && 'code' in result
}

/**
 * Get error message from result
 */
export function getFileErrorMessage(result: FileContent | FileFetchError): string {
  if (isFileError(result)) {
    return result.error
  }
  return ''
}






