'use client'

import React from 'react'

interface WorkspaceHeaderProps {
  /** Left section content (title, breadcrumb, etc.) */
  leftContent?: React.ReactNode
  /** Right section content (buttons, toggles, etc.) */
  rightContent?: React.ReactNode
  /** Optional className for the header */
  className?: string
  /** Optional data-testid for testing */
  'data-testid'?: string
}

/**
 * Shared header component for workspace and session views.
 * Provides consistent header structure with configurable left and right sections.
 * 
 * Used in:
 * - WorkspaceLayout (workspace header)
 * - TrainerSessionWorkspace (session header with live indicator)
 * - StudentSessionWorkspace (session header with session info)
 */
export function WorkspaceHeader({
  leftContent,
  rightContent,
  className = '',
  'data-testid': testId = 'workspace-header',
}: WorkspaceHeaderProps) {
  return (
    <header 
      className={`flex items-center justify-between border-b bg-card px-4 py-2 ${className}`}
      data-testid={testId}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {leftContent}
      </div>
      {rightContent && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {rightContent}
        </div>
      )}
    </header>
  )
}

