'use client'

import React from 'react'

interface NoFileSelectedViewProps {
  /** Optional action button text */
  actionText?: string
  /** Optional action button onClick handler */
  onAction?: () => void
  /** Optional description text */
  description?: string
  /** Optional data-testid for testing */
  'data-testid'?: string
}

/**
 * Shared empty state component for when no file is selected.
 * Used consistently across WorkspaceLayout, TrainerSessionWorkspace, and StudentSessionWorkspace.
 */
export function NoFileSelectedView({
  actionText = 'Select or Create File',
  onAction,
  description = 'Select a file from the explorer or create a new one',
  'data-testid': testId = 'no-file-selected',
}: NoFileSelectedViewProps) {
  return (
    <div 
      className="flex h-full items-center justify-center"
      data-testid={testId}
    >
      <div className="text-center space-y-2">
        <p className="text-muted-foreground">No file selected</p>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
        {onAction && (
          <button
            onClick={onAction}
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {actionText}
          </button>
        )}
      </div>
    </div>
  )
}


