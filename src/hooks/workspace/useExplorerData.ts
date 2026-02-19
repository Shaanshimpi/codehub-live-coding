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

import { useState, useEffect, useCallback } from 'react'
import type { BasicFolderRef } from '@/utilities/workspaceScope'
import { useFolderFileFilter } from '@/utilities/useFolderFileFilter'
import type { Folder, WorkspaceFileWithFolder } from '@/types/workspace'

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
  const [explorerFolders, setExplorerFolders] = useState<Folder[]>([])
  const [explorerFiles, setExplorerFiles] = useState<WorkspaceFile[]>([])
  const [explorerLoading, setExplorerLoading] = useState(false)
  const [explorerError, setExplorerError] = useState<string | null>(null)

  // Compute current folder
  const currentFolder = currentFolderId
    ? explorerFolders.find((f) => String(f.id) === String(currentFolderId)) || null
    : null

  // Filter folders and files for current folder
  const { childFolders, childFiles } = useFolderFileFilter({
    folders: explorerFolders,
    files: explorerFiles,
    currentFolder,
  })

  // Fetch explorer data
  const fetchExplorerData = useCallback(async () => {
    if (!enabled || workspaceMode !== 'explorer') {
      return
    }

    try {
      console.log('[useExplorerData] Fetching explorer data...', { userId, workspaceMode, currentFolderId })
      setExplorerLoading(true)
      setExplorerError(null)

      const foldersEndpoint = userId 
        ? `/api/dashboard/workspace/${userId}/folders`
        : '/api/folders?limit=1000&depth=2'
      const filesEndpoint = userId
        ? `/api/dashboard/workspace/${userId}/files`
        : '/api/workspace/files'

      const [foldersRes, filesRes] = await Promise.all([
        fetch(foldersEndpoint, { credentials: 'include', cache: 'no-store' }),
        fetch(filesEndpoint, { credentials: 'include', cache: 'no-store' }),
      ])

      if (!foldersRes.ok) {
        throw new Error('Failed to load folders')
      }

      if (!filesRes.ok) {
        throw new Error('Failed to load files')
      }

      const foldersData = await foldersRes.json()
      const filesData = await filesRes.json()

      const folders = (foldersData.docs || []) as Folder[]
      const files = (filesData.files || filesData.docs || []) as WorkspaceFile[]

      setExplorerFolders(folders)
      setExplorerFiles(files)
      
      console.log('[useExplorerData] Explorer data fetched successfully', { 
        foldersCount: folders.length, 
        filesCount: files.length 
      })
    } catch (e) {
      console.error('[useExplorerData] Error loading explorer data', e)
      setExplorerError('Failed to load workspace data')
    } finally {
      setExplorerLoading(false)
    }
  }, [userId, workspaceMode, currentFolderId, enabled])

  // Auto-fetch when mode changes to explorer
  useEffect(() => {
    fetchExplorerData()
  }, [fetchExplorerData])

  // Manual refresh function
  const refreshExplorerData = useCallback(async () => {
    console.log('[useExplorerData] Manual refresh triggered')
    await fetchExplorerData()
  }, [fetchExplorerData])

  return {
    explorerFolders,
    explorerFiles,
    explorerLoading,
    explorerError,
    currentFolder,
    childFolders,
    childFiles,
    refreshExplorerData,
  }
}

