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
      console.log('[useWorkspaceData] ⚠️ FETCHING folders from API (cache miss or stale)', { userId, endpoint: foldersEndpoint })
      const res = await fetch(foldersEndpoint, {
        credentials: 'include',
        cache: 'no-store',
      })
      
      if (!res.ok) {
        throw new Error(`Failed to load folders: ${res.status}`)
      }
      
      const data = await res.json()
      const folders = (data.docs || []) as Folder[]
      console.log('[useWorkspaceData] ✅ Folders fetched from API', { count: folders.length })
      return folders
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnMount: false, // Explicitly disable refetch on mount - use cache if available
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: false, // Don't refetch on reconnect
  })

  // Debug: Log when data is loaded from cache vs fetched
  React.useEffect(() => {
    if (foldersQuery.data && !foldersQuery.isFetching) {
      console.log('[useWorkspaceData] 📦 Folders data available', { 
        fromCache: !foldersQuery.isLoading && foldersQuery.dataUpdatedAt < Date.now() - 1000,
        count: foldersQuery.data.length,
        dataUpdatedAt: new Date(foldersQuery.dataUpdatedAt).toISOString()
      })
    }
  }, [foldersQuery.data, foldersQuery.isFetching, foldersQuery.isLoading, foldersQuery.dataUpdatedAt])

  // Fetch files
  const filesQuery = useQuery<WorkspaceFile[]>({
    queryKey: [...queryKey, 'files'],
    queryFn: async () => {
      console.log('[useWorkspaceData] ⚠️ FETCHING files from API (cache miss or stale)', { userId, endpoint: filesEndpoint })
      const res = await fetch(filesEndpoint, {
        credentials: 'include',
        cache: 'no-store',
      })
      
      if (!res.ok) {
        throw new Error(`Failed to load files: ${res.status}`)
      }
      
      const data = await res.json()
      const files = (data.files || data.docs || []) as WorkspaceFile[]
      console.log('[useWorkspaceData] ✅ Files fetched from API', { count: files.length })
      return files
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
  const queryKey = ['workspace', 'data', userId || 'current']
  console.log('[useWorkspaceData] Invalidating workspace cache', { userId, queryKey })
  queryClient.invalidateQueries({ queryKey })
}

