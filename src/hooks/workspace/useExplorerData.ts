/**
 * Hook for managing explorer mode data fetching and state.
 * 
 * This hook handles:
 * - Fetching folders and files for explorer mode
 * - Managing loading and error states
 * - Filtering folders/files by current folder
 * - Refreshing explorer data
 * 
 * API Endpoints Used:
 * - GET /api/folders?limit=1000&depth=2 - Workspace folders
 * - GET /api/workspace/files - Workspace files
 * - GET /api/dashboard/workspace/${userId}/folders - Dashboard folders
 * - GET /api/dashboard/workspace/${userId}/files - Dashboard files
 * 
 * @module useExplorerData
 */

import { useCallback } from 'react'
import type { BasicFolderRef } from '@/utilities/workspaceScope'
import { useFolderFileFilter } from '@/utilities/useFolderFileFilter'
import type { Folder, WorkspaceFileWithFolder } from '@/types/workspace'
import { useWorkspaceData } from './useWorkspaceData'

type WorkspaceFile = WorkspaceFileWithFolder

interface UseExplorerDataOptions {
  /** Optional user ID for dashboard workspace view */
  userId?: string | number
  /** Current workspace mode */
  workspaceMode: 'explorer' | 'workspace'
  /** Current folder ID being viewed */
  currentFolderId: string | number | null
  /** Whether to enable automatic fetching */
  enabled?: boolean
}

interface UseExplorerDataReturn {
  /** All folders in workspace */
  explorerFolders: Folder[]
  /** All files in workspace */
  explorerFiles: WorkspaceFile[]
  /** Loading state */
  explorerLoading: boolean
  /** Error message if any */
  explorerError: string | null
  /** Current folder object */
  currentFolder: Folder | null
  /** Child folders of current folder */
  childFolders: Folder[]
  /** Files in current folder */
  childFiles: WorkspaceFile[]
  /** Manual refresh function */
  refreshExplorerData: () => Promise<void>
}

/**
 * Hook for managing explorer data fetching and filtering.
 * 
 * @example
 * ```tsx
 * const {
 *   explorerFolders,
 *   explorerFiles,
 *   explorerLoading,
 *   currentFolder,
 *   childFolders,
 *   childFiles,
 *   refreshExplorerData
 * } = useExplorerData({
 *   userId: undefined,
 *   workspaceMode: 'explorer',
 *   currentFolderId: null,
 *   enabled: true
 * })
 * ```
 */
export function useExplorerData({
  userId,
  workspaceMode,
  currentFolderId,
  enabled = true,
}: UseExplorerDataOptions): UseExplorerDataReturn {
  // Use React Query for workspace data caching
  const { folders, files, isLoading, error, refetch } = useWorkspaceData(userId)

  // Only fetch when in explorer mode and enabled
  const shouldFetch = enabled && workspaceMode === 'explorer'

  // Compute current folder
  const currentFolder = currentFolderId
    ? folders.find((f) => String(f.id) === String(currentFolderId)) || null
    : null

  // Filter folders and files for current folder
  const { childFolders, childFiles } = useFolderFileFilter({
    folders: shouldFetch ? folders : [],
    files: shouldFetch ? files : [],
    currentFolder,
  })

  // Manual refresh function
  const refreshExplorerData = useCallback(async () => {
    console.log('[useExplorerData] Manual refresh triggered', { userId, workspaceMode })
    await refetch()
  }, [refetch, userId, workspaceMode])

  return {
    explorerFolders: shouldFetch ? folders : [],
    explorerFiles: shouldFetch ? files : [],
    explorerLoading: shouldFetch ? isLoading : false,
    explorerError: shouldFetch && error ? error.message : null,
    currentFolder,
    childFolders,
    childFiles,
    refreshExplorerData,
  }
}

