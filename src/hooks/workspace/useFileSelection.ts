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

import { useState, useCallback, useEffect, useRef } from 'react'
import { inferLanguageFromFileName } from '@/utilities/languageInference'
import type { WorkspaceFileWithContent } from '@/types/workspace'
import { useFileContent } from './useFileContent'

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
  handleFileSelect: (file: { id: string; name?: string; content?: string }) => Promise<void>
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
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null)
  const [switchingFile, setSwitchingFile] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  // Track the last file ID that triggered onFileChanged to prevent overwriting user edits
  const lastLoadedFileIdRef = useRef<string | null>(null)

  // Use React Query for file content caching
  const { data: fileContent, isLoading: loadingFile } = useFileContent(
    selectedFileId,
    { enabled: !!selectedFileId }
  )

  // Update selected file when query completes, but only call onFileChanged if it's a different file
  useEffect(() => {
    if (fileContent) {
      const newFile: WorkspaceFile = {
        id: fileContent.id,
        name: fileContent.name,
        content: fileContent.content,
      }
      setSelectedFileState(newFile)
      
      // Only call onFileChanged if this is a different file than the last one we loaded
      // This prevents overwriting user's typed code when React Query refetches the same file
      if (fileContent.id !== lastLoadedFileIdRef.current) {
        lastLoadedFileIdRef.current = fileContent.id
        if (onFileChanged) {
          onFileChanged(newFile)
        }
        console.log('[useFileSelection] File content loaded from cache/query (new file)', {
          fileId: fileContent.id,
          fileName: fileContent.name,
        })
      } else {
        console.log('[useFileSelection] File content refetched (same file), skipping onFileChanged to preserve user edits', {
          fileId: fileContent.id,
        })
      }
    }
  }, [fileContent, onFileChanged])

  const handleFileSelect = useCallback(async (file: { id: string; name?: string; content?: string }) => {
    console.log('[useFileSelection] File selection started', { fileId: file.id, fileName: file.name || 'unknown' })

    // Auto-save current file before switching (if enabled and changed)
    if (autoSaveBeforeSwitch && selectedFile && saveCurrentFile) {
      const currentContent = selectedFile.content || ''
      const newContent = file.content || ''
      if (newContent !== currentContent) {
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

    const fileIdStr = String(file.id)

    // Check if content is already available (from list API with includeContent=true)
    if (file.content !== undefined && file.name) {
      console.log('[useFileSelection] Using provided content (no fetch needed)', { fileId: file.id })
      const newFile: WorkspaceFile = {
        id: fileIdStr,
        name: file.name,
        content: file.content,
      }
      setSelectedFileState(newFile)
      setSelectedFileId(fileIdStr) // Set ID for React Query cache
      // Reset the ref when explicitly selecting a file
      lastLoadedFileIdRef.current = fileIdStr
      if (onFileChanged) {
        onFileChanged(newFile)
      }
      return
    }

    // Use React Query to fetch file content (will use cache if available)
    console.log('[useFileSelection] Using React Query to fetch file content', { fileId: file.id })
    setSelectedFileId(fileIdStr) // React Query will fetch and cache automatically
    // Reset the ref when explicitly selecting a file
    lastLoadedFileIdRef.current = fileIdStr
    // The useEffect above will update selectedFile when query completes
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
        // Reset the ref when explicitly selecting a file
        lastLoadedFileIdRef.current = String(fileData.id)
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
        // Reset the ref when explicitly selecting a file
        lastLoadedFileIdRef.current = fileIdStr
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
      // Reset the ref when explicitly selecting a file
      lastLoadedFileIdRef.current = fileIdStr
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

