/**
 * Hook for managing file selection with auto-save and language inference.
 * 
 * This hook handles:
 * - File selection with auto-save before switching
 * - File content fetching
 * - Language inference from file name
 * - Modal selection handling
 * - Refresh key management
 * 
 * API Endpoints Used:
 * - GET /api/files/${fileId} - Fetch file content
 * 
 * @module useFileSelection
 */

import { useState, useCallback } from 'react'
import { inferLanguageFromFileName } from '@/utilities/languageInference'
import type { WorkspaceFileWithContent } from '@/types/workspace'

type WorkspaceFile = WorkspaceFileWithContent

interface UseFileSelectionOptions {
  /** Optional session code for session-specific logic */
  sessionCode?: string
  /** Callback when file changes */
  onFileChanged?: (file: WorkspaceFile) => void
  /** Whether to auto-save before switching files */
  autoSaveBeforeSwitch?: boolean
  /** Function to save current file (required if autoSaveBeforeSwitch is true) */
  saveCurrentFile?: () => Promise<boolean>
}

interface UseFileSelectionReturn {
  /** Currently selected file */
  selectedFile: WorkspaceFile | null
  /** Set selected file */
  setSelectedFile: (file: WorkspaceFile | null) => void
  /** Handle file selection from explorer */
  handleFileSelect: (file: { id: string; name: string; content: string }) => Promise<void>
  /** Handle file selection from modal */
  handleFileSelectFromModal: (
    fileId: string | null,
    fileName: string,
    content: string,
    fileLanguage: string
  ) => Promise<void>
  /** Whether file is currently switching */
  switchingFile: boolean
  /** Refresh key for file explorer */
  refreshKey: number
  /** Set refresh key */
  setRefreshKey: (fn: (prev: number) => number) => void
}

/**
 * Hook for managing file selection with auto-save and language inference.
 * 
 * @example
 * ```tsx
 * const {
 *   selectedFile,
 *   handleFileSelect,
 *   handleFileSelectFromModal,
 *   switchingFile,
 *   refreshKey,
 *   setRefreshKey
 * } = useFileSelection({
 *   sessionCode: 'ABC123',
 *   autoSaveBeforeSwitch: true,
 *   saveCurrentFile: async () => { return true }
 * })
 * ```
 */
export function useFileSelection({
  sessionCode,
  onFileChanged,
  autoSaveBeforeSwitch = false,
  saveCurrentFile,
}: UseFileSelectionOptions = {}): UseFileSelectionReturn {
  const [selectedFile, setSelectedFileState] = useState<WorkspaceFile | null>(null)
  const [switchingFile, setSwitchingFile] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleFileSelect = useCallback(async (file: { id: string; name: string; content: string }) => {
    console.log('[useFileSelection] File selection started', { fileId: file.id, fileName: file.name })

    // Auto-save current file before switching (if enabled and changed)
    if (autoSaveBeforeSwitch && selectedFile && saveCurrentFile) {
      const currentContent = selectedFile.content || ''
      if (file.content !== currentContent) {
        console.log('[useFileSelection] Auto-saving current file before switch')
        setSwitchingFile(true)
        try {
          await saveCurrentFile()
        } catch (error) {
          console.error('[useFileSelection] Failed to save before switching:', error)
        } finally {
          setSwitchingFile(false)
        }
      }
    }

    // Fetch fresh file content
    try {
      console.log('[useFileSelection] Fetching file content', { fileId: file.id })
      const fileRes = await fetch(`/api/files/${file.id}`, { credentials: 'include' })
      
      if (fileRes.ok) {
        const fileData = await fileRes.json()
        const fileIdStr = String(fileData.id)
        const newFile: WorkspaceFile = {
          id: fileIdStr,
          name: fileData.name,
          content: fileData.content || '',
        }
        
        setSelectedFileState(newFile)
        if (onFileChanged) {
          onFileChanged(newFile)
        }
        
        console.log('[useFileSelection] File selected successfully', { 
          fileId: fileIdStr, 
          fileName: fileData.name 
        })
      } else {
        // Fallback to provided content
        console.warn('[useFileSelection] Failed to fetch file, using provided content', { 
          status: fileRes.status 
        })
        const fileIdStr = String(file.id)
        const newFile: WorkspaceFile = {
          id: fileIdStr,
          name: file.name,
          content: file.content,
        }
        setSelectedFileState(newFile)
        if (onFileChanged) {
          onFileChanged(newFile)
        }
      }
    } catch (error) {
      console.error('[useFileSelection] Failed to load file:', error)
      // Fallback to provided content
      const fileIdStr = String(file.id)
      const newFile: WorkspaceFile = {
        id: fileIdStr,
        name: file.name,
        content: file.content,
      }
      setSelectedFileState(newFile)
      if (onFileChanged) {
        onFileChanged(newFile)
      }
    }
  }, [selectedFile, autoSaveBeforeSwitch, saveCurrentFile, onFileChanged])

  const handleFileSelectFromModal = useCallback(async (
    fileId: string | null,
    fileName: string,
    content: string,
    fileLanguage: string
  ) => {
    if (fileId === null) {
      console.warn('[useFileSelection] File selection from modal: fileId is null')
      alert('Please select or create a file to continue')
      return
    }

    console.log('[useFileSelection] File selection from modal', { fileId, fileName, fileLanguage })

    const fileIdStr = String(fileId)

    // Try to fetch full file content, but fallback to provided content if fetch fails
    try {
      const res = await fetch(`/api/files/${fileIdStr}`, { credentials: 'include' })
      
      if (res.ok) {
        const fileData = await res.json()
        const fileContent = fileData.content || ''
        
        const newFile: WorkspaceFile = {
          id: String(fileData.id),
          name: fileData.name,
          content: fileContent,
        }
        
        setSelectedFileState(newFile)
        if (onFileChanged) {
          onFileChanged(newFile)
        }
        
        console.log('[useFileSelection] File selected from modal successfully', { 
          fileId: String(fileData.id), 
          fileName: fileData.name 
        })
      } else {
        // If fetch fails, use provided data
        console.warn('[useFileSelection] Failed to fetch file from modal, using provided data', { 
          status: res.status 
        })
        const newFile: WorkspaceFile = {
          id: fileIdStr,
          name: fileName,
          content: content || '',
        }
        setSelectedFileState(newFile)
        if (onFileChanged) {
          onFileChanged(newFile)
        }
      }
    } catch (error) {
      // If fetch fails, use provided data
      console.warn('[useFileSelection] Failed to fetch file from modal, using provided data:', error)
      const newFile: WorkspaceFile = {
        id: fileIdStr,
        name: fileName,
        content: content || '',
      }
      setSelectedFileState(newFile)
      if (onFileChanged) {
        onFileChanged(newFile)
      }
    }

    // Refresh explorer
    setRefreshKey((prev) => prev + 1)
    console.log('[useFileSelection] Refresh key updated')
  }, [onFileChanged])

  return {
    selectedFile,
    setSelectedFile: setSelectedFileState,
    handleFileSelect,
    handleFileSelectFromModal,
    switchingFile,
    refreshKey,
    setRefreshKey,
  }
}

