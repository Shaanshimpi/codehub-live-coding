/**
 * Shared hook for "Save and Run" behavior: save current file if dirty, then run (simultaneous).
 * Used by workspace and session (trainer + student) to avoid duplicate logic.
 *
 * @module useSaveAndRun
 */

import { useCallback } from 'react'

interface UseSaveAndRunOptions {
  /** Current editor code (to compare with last saved) */
  code: string
  /** Last saved code content */
  lastSavedCode: string
  /** Save current file (no await when triggering before run) */
  saveCurrentFile: () => Promise<boolean>
  /** Run code with optional stdin */
  handleRun: (currentCode: string, input?: string) => Promise<void>
}

/**
 * Returns handleSaveAndRun: if code is dirty, fires save (non-blocking), then runs.
 */
export function useSaveAndRun({
  code,
  lastSavedCode,
  saveCurrentFile,
  handleRun,
}: UseSaveAndRunOptions): (runCode: string, input?: string) => Promise<void> {
  return useCallback(
    async (runCode: string, input?: string) => {
      if (code !== lastSavedCode) {
        void saveCurrentFile()
      }
      await handleRun(runCode, input)
    },
    [code, lastSavedCode, saveCurrentFile, handleRun]
  )
}
