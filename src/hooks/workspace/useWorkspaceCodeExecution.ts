/**
 * Wrapper hook around useCodeExecution that adds session sync capabilities.
 * 
 * This hook provides:
 * - Code execution via useCodeExecution
 * - Session broadcast (trainer) via /api/sessions/${sessionCode}/broadcast
 * - Session sync (student) via /api/sessions/${sessionCode}/scratchpad
 * - lastSavedCode check (prevent running unsaved code)
 * 
 * @module useWorkspaceCodeExecution
 */

import { useCallback } from 'react'
import { useCodeExecution } from '@/hooks/useCodeExecution'
import type { ExecutionResult } from '@/services/codeExecution'
import type { WorkspaceFileWithContent } from '@/types/workspace'

type WorkspaceFile = WorkspaceFileWithContent

interface UseWorkspaceCodeExecutionOptions {
  /** Current programming language */
  language: string
  /** Optional session code for syncing */
  sessionCode?: string
  /** Currently selected file */
  selectedFile?: WorkspaceFile | null
  /** Whether to sync to session */
  syncToSession?: boolean
  /** Session sync type: 'broadcast' for trainer, 'scratchpad' for student */
  sessionSyncType?: 'broadcast' | 'scratchpad'
  /** Last saved code content (for preventing unsaved code execution) */
  lastSavedCode?: string
  /** Callback after execution completes */
  onExecutionComplete?: (result: ExecutionResult) => void
}

interface UseWorkspaceCodeExecutionReturn {
  /** Whether code is currently executing */
  executing: boolean
  /** Last execution result */
  executionResult: ExecutionResult | null
  /** Run code with optional input (checks lastSavedCode if provided) */
  handleRun: (currentCode: string, input?: string) => Promise<void>
  /** Clear the execution result */
  clearResult: () => void
}

/**
 * Wrapper hook around useCodeExecution with session sync capabilities.
 * 
 * @example
 * ```tsx
 * const {
 *   executing,
 *   executionResult,
 *   handleRun,
 *   clearResult
 * } = useWorkspaceCodeExecution({
 *   language: 'javascript',
 *   sessionCode: 'ABC123',
 *   selectedFile: currentFile,
 *   syncToSession: true,
 *   sessionSyncType: 'broadcast',
 *   lastSavedCode: lastSavedCode,
 *   onExecutionComplete: (result) => {
 *     console.log('Execution completed', result)
 *   }
 * })
 * ```
 */
export function useWorkspaceCodeExecution({
  language,
  sessionCode,
  selectedFile,
  syncToSession = false,
  sessionSyncType = 'broadcast',
  lastSavedCode,
  onExecutionComplete,
}: UseWorkspaceCodeExecutionOptions): UseWorkspaceCodeExecutionReturn {
  const { execute, executing, result: executionResult, clearResult } = useCodeExecution({
    onExecutionComplete: async (result) => {
      // Sync to session if configured
      if (syncToSession && sessionCode && selectedFile) {
        try {
          const syncEndpoint =
            sessionSyncType === 'scratchpad'
              ? `/api/sessions/${sessionCode}/scratchpad`
              : `/api/sessions/${sessionCode}/broadcast`

          const syncBody =
            sessionSyncType === 'scratchpad'
              ? {
                  workspaceFileId: selectedFile.id,
                  workspaceFileName: selectedFile.name,
                  language,
                  output: result,
                }
              : {
                  workspaceFileId: selectedFile.id,
                  workspaceFileName: selectedFile.name,
                  currentOutput: result,
                  languageSlug: language,
                }

          await fetch(syncEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(syncBody),
          }).catch((error) => {
            console.error('[useWorkspaceCodeExecution] Failed to sync execution result to session:', error)
          })

          console.log('[useWorkspaceCodeExecution] Execution result synced to session', {
            sessionCode,
            sessionSyncType,
            fileId: selectedFile.id,
          })
        } catch (error) {
          console.error('[useWorkspaceCodeExecution] Error syncing to session:', error)
        }
      }

      // Call user-provided callback
      if (onExecutionComplete) {
        await onExecutionComplete(result)
      }
    },
  })

  const handleRun = useCallback(
    async (currentCode: string, input?: string): Promise<void> => {
      // Prevent running if there are unsaved changes (if lastSavedCode is provided)
      if (lastSavedCode !== undefined && currentCode !== lastSavedCode) {
        console.warn('[useWorkspaceCodeExecution] Cannot run: code has unsaved changes', {
          currentCodeLength: currentCode.length,
          lastSavedCodeLength: lastSavedCode.length,
        })
        return
      }

      console.log('[useWorkspaceCodeExecution] Running code...', {
        language,
        codeLength: currentCode.length,
        hasInput: !!input,
        sessionCode,
        syncToSession,
      })

      await execute(language, currentCode, input)
    },
    [language, execute, lastSavedCode, sessionCode, syncToSession]
  )

  return {
    executing,
    executionResult,
    handleRun,
    clearResult,
  }
}

