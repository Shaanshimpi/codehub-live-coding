/**
 * Hook for managing folder explorer event handlers.
 * 
 * This hook provides handlers for:
 * - Opening folders
 * - Opening files
 * - Opening folders in workspace mode
 * - Refreshing data when items change
 * 
 * @module useFolderExplorerHandlers
 */

import { useCallback } from 'react'
import type { WorkspaceFileWithContent } from '@/types/workspace'

type WorkspaceFile = WorkspaceFileWithContent

interface UseFolderExplorerHandlersOptions {
  /** Current folder ID */
  currentFolderId: string | number | null
  /** Set current folder ID */
  setCurrentFolderId: (id: string | number | null) => void
  /** Set workspace mode */
  setWorkspaceMode: (mode: 'explorer' | 'workspace') => void
  /** Handle file selection */
  onFileSelect: (file: WorkspaceFile) => void
  /** Refresh explorer data */
  refreshExplorerData: () => Promise<void>
  /** Set refresh key for file explorer */
  setRefreshKey: (fn: (prev: number) => number) => void
}

interface UseFolderExplorerHandlersReturn {
  /** Handle opening a folder */
  handleOpenFolder: (folderId: string | number) => void
  /** Handle opening a file */
  handleOpenFile: (fileId: string) => Promise<void>
  /** Handle opening a folder in workspace mode */
  handleOpenFolderInWorkspace: (folderId: string | number) => void
  /** Handle item changed (rename/move/delete) */
  handleItemChanged: () => Promise<void>
}

/**
 * Hook for managing folder explorer event handlers.
 * 
 * @example
 * ```tsx
 * const {
 *   handleOpenFolder,
 *   handleOpenFile,
 *   handleOpenFolderInWorkspace,
 *   handleItemChanged
 * } = useFolderExplorerHandlers({
 *   currentFolderId: null,
 *   setCurrentFolderId: setCurrentFolderId,
 *   setWorkspaceMode: setWorkspaceMode,
 *   onFileSelect: handleFileSelect,
 *   refreshExplorerData: refreshExplorerData,
 *   setRefreshKey: setRefreshKey
 * })
 * ```
 */
export function useFolderExplorerHandlers({
  currentFolderId,
  setCurrentFolderId,
  setWorkspaceMode,
  onFileSelect,
  refreshExplorerData,
  setRefreshKey,
}: UseFolderExplorerHandlersOptions): UseFolderExplorerHandlersReturn {
  
  const handleOpenFolder = useCallback((folderId: string | number) => {
    console.log('[useFolderExplorerHandlers] Opening folder', { folderId })
    if (folderId === '') {
      setCurrentFolderId(null)
    } else {
      setCurrentFolderId(folderId)
    }
  }, [setCurrentFolderId])

  const handleOpenFile = useCallback(async (fileId: string) => {
    console.log('[useFolderExplorerHandlers] Opening file', { fileId })
    
    try {
      const fileRes = await fetch(`/api/files/${fileId}`, {
        credentials: 'include',
      })
      
      if (fileRes.ok) {
        const fileData = await fileRes.json()
        onFileSelect({
          id: String(fileData.id),
          name: fileData.name,
          content: fileData.content || '',
        })
        setWorkspaceMode('workspace')
        console.log('[useFolderExplorerHandlers] File opened successfully', { 
          fileId: String(fileData.id), 
          fileName: fileData.name 
        })
      } else {
        console.error('[useFolderExplorerHandlers] Failed to load file', { 
          fileId, 
          status: fileRes.status 
        })
      }
    } catch (error) {
      console.error('[useFolderExplorerHandlers] Failed to load file:', error)
    }
  }, [onFileSelect, setWorkspaceMode])

  const handleOpenFolderInWorkspace = useCallback((folderId: string | number) => {
    console.log('[useFolderExplorerHandlers] Opening folder in workspace mode', { folderId })
    setCurrentFolderId(folderId)
    setWorkspaceMode('workspace')
  }, [setCurrentFolderId, setWorkspaceMode])

  const handleItemChanged = useCallback(async () => {
    console.log('[useFolderExplorerHandlers] Item changed, refreshing data')
    await refreshExplorerData()
    setRefreshKey((prev) => prev + 1)
  }, [refreshExplorerData, setRefreshKey])

  return {
    handleOpenFolder,
    handleOpenFile,
    handleOpenFolderInWorkspace,
    handleItemChanged,
  }
}

