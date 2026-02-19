/**
 * Wrapper hook around useFileSave that adds lastSavedCode tracking and convenience methods.
 * 
 * This hook provides:
 * - lastSavedCode tracking (for enabling/disabling Run button)
 * - lastUpdate timestamp
 * - handleSaveCode convenience method
 * - saveCurrentFile method compatible with useFileSelection
 * 
 * @module useSaveCode
 */

import { useState, useCallback, useEffect } from 'react'
import { useFileSave } from '@/hooks/useFileSave'
import type { WorkspaceFileWithContent } from '@/types/workspace'

type WorkspaceFile = WorkspaceFileWithContent

interface UseSaveCodeOptions {
  /** Currently selected file */
  selectedFile: WorkspaceFile | null
  /** Current code content */
  code: string
  /** Current language */
  language: string
  /** Optional session code for syncing */
  sessionCode?: string
  /** Session sync type: 'broadcast' for trainer, 'scratchpad' for student */
  sessionSyncType?: 'broadcast' | 'scratchpad'
  /** Callback on save success */
  onSaveSuccess?: () => void
  /** Callback on save error */
  onSaveError?: (error: Error) => void
}

interface UseSaveCodeReturn {
  /** Whether file is currently being saved */
  savingCode: boolean
  /** Whether last save was successful */
  saveSuccess: boolean
  /** Last saved code content (for Run button enable/disable) */
  lastSavedCode: string
  /** Last update timestamp */
  lastUpdate: Date | null
  /** Convenience method to save current file */
  handleSaveCode: () => Promise<void>
  /** Save current file (compatible with useFileSelection) */
  saveCurrentFile: () => Promise<boolean>
}

/**
 * Wrapper hook around useFileSave with lastSavedCode tracking.
 * 
 * @example
 * ```tsx
 * const {
 *   savingCode,
 *   saveSuccess,
 *   lastSavedCode,
 *   lastUpdate,
 *   handleSaveCode,
 *   saveCurrentFile
 * } = useSaveCode({
 *   selectedFile,
 *   code,
 *   language,
 *   sessionCode: 'ABC123',
 *   sessionSyncType: 'broadcast'
 * })
 * ```
 */
export function useSaveCode({
  selectedFile,
  code,
  language,
  sessionCode,
  sessionSyncType,
  onSaveSuccess,
  onSaveError,
}: UseSaveCodeOptions): UseSaveCodeReturn {
  const [lastSavedCode, setLastSavedCode] = useState<string>('')
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const {
    saveFile,
    saving: savingCode,
    saveSuccess,
    resetSaveSuccess,
  } = useFileSave({
    sessionCode,
    syncToSession: !!sessionCode,
    sessionSyncType,
    workspaceFileName: selectedFile?.name,
    onSaveComplete: () => {
      setLastSavedCode(code)
      setLastUpdate(new Date())
      if (onSaveSuccess) {
        onSaveSuccess()
      }
    },
    onSaveError: (error) => {
      if (onSaveError) {
        onSaveError(error)
      }
    },
  })

  // Update lastSavedCode when file changes (file loaded = already saved)
  useEffect(() => {
    if (selectedFile) {
      const fileContent = selectedFile.content || ''
      setLastSavedCode(fileContent)
      console.log('[useSaveCode] File loaded, lastSavedCode updated', {
        fileName: selectedFile.name,
        contentLength: fileContent.length
      })
    }
  }, [selectedFile])

  const handleSaveCode = useCallback(async () => {
    if (!selectedFile || !sessionCode) {
      console.warn('[useSaveCode] Cannot save: no file selected or session code')
      return
    }

    console.log('[useSaveCode] Saving code...', {
      fileId: selectedFile.id,
      fileName: selectedFile.name,
      codeLength: code.length
    })

    const success = await saveFile(selectedFile.id, code, language)
    
    if (success) {
      console.log('[useSaveCode] Code saved successfully')
    } else {
      console.error('[useSaveCode] Failed to save code')
    }
  }, [selectedFile, code, language, sessionCode, saveFile])

  const saveCurrentFile = useCallback(async (): Promise<boolean> => {
    if (!selectedFile) {
      console.warn('[useSaveCode] Cannot save: no file selected')
      return false
    }

    console.log('[useSaveCode] saveCurrentFile called', {
      fileId: selectedFile.id,
      fileName: selectedFile.name
    })

    return await saveFile(selectedFile.id, code, language)
  }, [selectedFile, code, language, saveFile])

  return {
    savingCode,
    saveSuccess,
    lastSavedCode,
    lastUpdate,
    handleSaveCode,
    saveCurrentFile,
  }
}

