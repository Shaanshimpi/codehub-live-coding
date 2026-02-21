/**
 * Hook for fetching file content with React Query caching.
 * 
 * This hook provides:
 * - Automatic caching of file content
 * - Background refetching
 * - Loading and error states
 * - Cache invalidation support
 * 
 * API Endpoints Used:
 * - GET /api/files/${fileId} - Fetch file content
 * 
 * @module useFileContent
 */

import { useQuery } from '@tanstack/react-query'

interface FileContent {
  id: string
  name: string
  content: string
  language: string | null
}

interface UseFileContentOptions {
  /** Whether the query is enabled */
  enabled?: boolean
}

/**
 * Hook for fetching file content with React Query caching.
 * 
 * @example
 * ```tsx
 * const { data: fileContent, isLoading, error } = useFileContent(fileId, {
 *   enabled: !!fileId
 * })
 * ```
 */
export function useFileContent(
  fileId: string | null,
  options: UseFileContentOptions = {}
): {
  data: FileContent | undefined
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
} {
  const { enabled = true } = options

  const query = useQuery<FileContent>({
    queryKey: ['file', fileId],
    queryFn: async () => {
      if (!fileId) {
        throw new Error('File ID is required')
      }

      const res = await fetch(`/api/files/${fileId}`, {
        credentials: 'include',
      })

      if (!res.ok) {
        throw new Error(`Failed to fetch file: ${res.status}`)
      }

      const data = await res.json()
      return {
        id: String(data.id),
        name: data.name,
        content: data.content || '',
        language: data.language || null,
      }
    },
    enabled: enabled && !!fileId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  })

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: async () => {
      await query.refetch()
    },
  }
}

