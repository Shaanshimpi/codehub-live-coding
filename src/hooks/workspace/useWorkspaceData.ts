/**
 * Hook for fetching and caching workspace data (folders and files) using React Query.
 * 
 * This hook provides:
 * - Cached workspace folders and files
 * - Automatic refetching with stale time
 * - Support for both regular workspace and dashboard workspace views
 * 
 * @module useWorkspaceData
 */

import React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { logApiFetch } from '@/utilities/devApiLogger'
import type { Folder, WorkspaceFileWithFolder } from '@/types/workspace'

type WorkspaceFile = WorkspaceFileWithFolder

interface UseWorkspaceDataReturn {
  /** All folders in workspace */
  folders: Folder[]
  /** All files in workspace */
  files: WorkspaceFile[]
  /** Loading state */
  isLoading: boolean
  /** Error if any */
  error: Error | null
  /** Manual refetch function */
  refetch: () => Promise<void>
}

/**
 * Hook for fetching and caching workspace data.
 * 
 * @param userId - Optional user ID for dashboard workspace view. If provided, fetches from dashboard endpoints.
 * @returns Workspace data with folders, files, loading state, and refetch function
 * 
 * @example
 * ```tsx
 * const { folders, files, isLoading, refetch } = useWorkspaceData()
 * 
 * // For dashboard view
 * const { folders, files } = useWorkspaceData(userId)
 * ```
 */
export function useWorkspaceData(userId?: string | number): UseWorkspaceDataReturn {

  // Determine API endpoints based on userId
  const foldersEndpoint = userId
    ? `/api/dashboard/workspace/${userId}/folders`
    : '/api/folders?limit=1000&depth=2'
  
  const filesEndpoint = userId
    ? `/api/dashboard/workspace/${userId}/files`
    : '/api/workspace/files'

  // Query key includes userId to cache separately for different workspaces
  const queryKey = ['workspace', 'data', userId || 'current']

  // Fetch folders
  const foldersQuery = useQuery<Folder[]>({
    queryKey: [...queryKey, 'folders'],
    queryFn: async () => {
      logApiFetch('useWorkspaceData(folders)', foldersEndpoint)
      const res = await fetch(foldersEndpoint, {
        credentials: 'include',
        cache: 'no-store',
      })
      if (!res.ok) {
        logApiFetch('useWorkspaceData(folders)', foldersEndpoint, 'error')
        throw new Error(`Failed to load folders: ${res.status}`)
      }
      logApiFetch('useWorkspaceData(folders)', foldersEndpoint, 'ok')
      const data = await res.json()
      return (data.docs || []) as Folder[]
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnMount: false, // Explicitly disable refetch on mount - use cache if available
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: false, // Don't refetch on reconnect
  })

  // Fetch files
  const filesQuery = useQuery<WorkspaceFile[]>({
    queryKey: [...queryKey, 'files'],
    queryFn: async () => {
      logApiFetch('useWorkspaceData(files)', filesEndpoint)
      const res = await fetch(filesEndpoint, {
        credentials: 'include',
        cache: 'no-store',
      })
      if (!res.ok) {
        logApiFetch('useWorkspaceData(files)', filesEndpoint, 'error')
        throw new Error(`Failed to load files: ${res.status}`)
      }
      logApiFetch('useWorkspaceData(files)', filesEndpoint, 'ok')
      const data = await res.json()
      return (data.files || data.docs || []) as WorkspaceFile[]
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnMount: false, // Explicitly disable refetch on mount - use cache if available
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: false, // Don't refetch on reconnect
  })

  // Debug: Log when data is loaded from cache vs fetched
  React.useEffect(() => {
    if (filesQuery.data && !filesQuery.isFetching) {
      console.log('[useWorkspaceData] 📦 Files data available', { 
        fromCache: !filesQuery.isLoading && filesQuery.dataUpdatedAt < Date.now() - 1000,
        count: filesQuery.data.length,
        dataUpdatedAt: new Date(filesQuery.dataUpdatedAt).toISOString()
      })
    }
  }, [filesQuery.data, filesQuery.isFetching, filesQuery.isLoading, filesQuery.dataUpdatedAt])

  // Manual refetch function
  const refetch = async () => {
    console.log('[useWorkspaceData] Manual refetch triggered', { userId })
    await Promise.all([foldersQuery.refetch(), filesQuery.refetch()])
  }

  return {
    folders: foldersQuery.data || [],
    files: filesQuery.data || [],
    isLoading: foldersQuery.isLoading || filesQuery.isLoading,
    error: (foldersQuery.error || filesQuery.error) as Error | null,
    refetch,
  }
}

/**
 * Utility function to invalidate workspace data cache.
 * Use this when workspace data changes (e.g., after creating/deleting files/folders).
 * 
 * @param queryClient - React Query client instance
 * @param userId - Optional user ID to invalidate specific workspace cache
 */
export function invalidateWorkspaceData(queryClient: ReturnType<typeof useQueryClient>, userId?: string | number) {
  queryClient.invalidateQueries({ queryKey: ['workspace', 'data', userId || 'current'] })
}

