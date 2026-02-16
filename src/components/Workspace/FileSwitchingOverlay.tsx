'use client'

import React from 'react'
import { Loader2 } from 'lucide-react'

interface FileSwitchingOverlayProps {
  /** Whether overlay is visible */
  visible: boolean
  /** Optional custom message */
  message?: string
  /** Optional className */
  className?: string
  /** Optional data-testid for testing */
  'data-testid'?: string
}

/**
 * Shared component for file switching loading overlay.
 * Used consistently across TrainerSessionWorkspace and StudentSessionWorkspace.
 */
export function FileSwitchingOverlay({
  visible,
  message = 'Saving current file...',
  className = '',
  'data-testid': testId = 'file-switching-overlay',
}: FileSwitchingOverlayProps) {
  if (!visible) return null

  return (
    <div
      className={`absolute inset-0 bg-background/50 flex items-center justify-center z-10 ${className}`}
      data-testid={testId}
    >
      <div className="flex items-center gap-2 bg-card border rounded-md px-3 py-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-xs">{message}</span>
      </div>
    </div>
  )
}

