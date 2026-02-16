import { useState, useCallback } from 'react'

interface UseFileSaveOptions {
  /** Optional session code for syncing to session */
  sessionCode?: string
  /** Optional callback after successful save */
  onSaveComplete?: () => void | Promise<void>
  /** Optional callback on save error */
  onSaveError?: (error: Error) => void
  /** Whether to sync to session (for trainer/student views) */
  syncToSession?: boolean
  /** Session sync endpoint type: 'broadcast' for trainer, 'scratchpad' for student */
  sessionSyncType?: 'broadcast' | 'scratchpad'
}

interface UseFileSaveReturn {
  /** Save file content */
  saveFile: (fileId: string, content: string, language?: string) => Promise<boolean>
  /** Whether file is currently being saved */
  saving: boolean
  /** Whether last save was successful */
  saveSuccess: boolean
  /** Reset save success state */
  resetSaveSuccess: () => void
}

/**
 * Shared hook for file saving logic.
 * Handles saving to workspace file and optionally syncing to session.
 */
export function useFileSave(options: UseFileSaveOptions = {}): UseFileSaveReturn {
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const saveFile = useCallback(
    async (fileId: string, content: string, language?: string): Promise<boolean> => {
      if (!fileId) return false

      setSaving(true)
      setSaveSuccess(false)

      try {
        // Save to workspace file
        const fileIdStr = String(fileId)
        const saveRes = await fetch(`/api/files/${fileIdStr}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ content }),
        })

        if (!saveRes.ok) {
          throw new Error('Failed to save file')
        }

        // Sync to session if configured
        if (options.syncToSession && options.sessionCode && language) {
          const syncEndpoint =
            options.sessionSyncType === 'scratchpad'
              ? `/api/sessions/${options.sessionCode}/scratchpad`
              : `/api/sessions/${options.sessionCode}/broadcast`

          const syncBody =
            options.sessionSyncType === 'scratchpad'
              ? {
                  workspaceFileId: fileId,
                  language,
                }
              : {
                  workspaceFileId: fileId,
                  languageSlug: language,
                }

          const syncRes = await fetch(syncEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(syncBody),
          })

          if (!syncRes.ok) {
            throw new Error(
              options.sessionSyncType === 'scratchpad'
                ? 'Failed to sync to session'
                : 'Failed to broadcast'
            )
          }
        }

        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 2000)

        if (options.onSaveComplete) {
          await options.onSaveComplete()
        }

        return true
      } catch (error) {
        console.error('Failed to save:', error)

        if (options.onSaveError) {
          options.onSaveError(error instanceof Error ? error : new Error('Failed to save'))
        }

        return false
      } finally {
        setSaving(false)
      }
    },
    [options.sessionCode, options.syncToSession, options.sessionSyncType, options.onSaveComplete, options.onSaveError]
  )

  const resetSaveSuccess = useCallback(() => {
    setSaveSuccess(false)
  }, [])

  return {
    saveFile,
    saving,
    saveSuccess,
    resetSaveSuccess,
  }
}

