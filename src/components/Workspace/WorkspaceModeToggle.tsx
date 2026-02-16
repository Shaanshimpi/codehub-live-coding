'use client'

import React from 'react'
import { FolderOpen, LayoutTemplate } from 'lucide-react'

interface WorkspaceModeToggleProps {
  /** Current mode */
  mode: 'explorer' | 'workspace'
  /** Callback when mode changes */
  onChange: (mode: 'explorer' | 'workspace') => void
  /** Optional className for the container */
  className?: string
  /** Optional data-testid for testing */
  'data-testid'?: string
}

/**
 * Shared component for toggling between Explorer and Workspace modes.
 * Used consistently across WorkspaceLayout, TrainerSessionWorkspace, and StudentSessionWorkspace.
 */
export function WorkspaceModeToggle({
  mode,
  onChange,
  className = '',
  'data-testid': testId = 'mode-toggle',
}: WorkspaceModeToggleProps) {
  return (
    <div 
      className={`flex items-center gap-1 rounded-md border bg-background overflow-hidden ${className}`}
      data-testid={testId}
    >
      <button
        onClick={() => onChange('explorer')}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition-colors ${
          mode === 'explorer'
            ? 'bg-primary text-primary-foreground'
            : 'bg-background hover:bg-accent'
        }`}
        title="Explorer Mode - Browse folders"
        data-testid={`${testId}-explorer-button`}
      >
        <FolderOpen className="h-3 w-3" />
        Explorer
      </button>
      <button
        onClick={() => onChange('workspace')}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition-colors ${
          mode === 'workspace'
            ? 'bg-primary text-primary-foreground'
            : 'bg-background hover:bg-accent'
        }`}
        title="Workspace Mode - Edit code"
        data-testid={`${testId}-workspace-button`}
      >
        <LayoutTemplate className="h-3 w-3" />
        Workspace
      </button>
    </div>
  )
}

