'use client'

import React from 'react'
import { Folder, Terminal, Sparkles } from 'lucide-react'
import { ViewToggleButton } from './ViewToggleButton'

interface WorkspaceViewControlsProps {
  /** Whether file explorer is visible */
  showFileExplorer: boolean
  /** Whether output panel is visible */
  showOutput: boolean
  /** Whether AI panel is visible */
  showAI: boolean
  /** Whether a file is selected (required for AI toggle) */
  hasSelectedFile: boolean
  /** Current workspace mode */
  workspaceMode: 'explorer' | 'workspace'
  /** Toggle file explorer handler */
  onToggleFileExplorer: () => void
  /** Toggle output handler */
  onToggleOutput: () => void
  /** Toggle AI handler */
  onToggleAI: () => void
  /** Whether controls are disabled */
  disabled?: boolean
  /** Size variant */
  size?: 'sm' | 'md'
  /** Optional data-testid for testing */
  'data-testid'?: string
}

/**
 * Container component for workspace view toggle controls.
 * Groups File Explorer, Output, and AI Help toggles together.
 * 
 * @example
 * ```tsx
 * <WorkspaceViewControls
 *   showFileExplorer={showFileExplorer}
 *   showOutput={showOutput}
 *   showAI={showAI}
 *   hasSelectedFile={!!selectedFile}
 *   workspaceMode={workspaceMode}
 *   onToggleFileExplorer={() => setShowFileExplorer(!showFileExplorer)}
 *   onToggleOutput={() => setShowOutput(!showOutput)}
 *   onToggleAI={() => setShowAI(!showAI)}
 *   disabled={uploading}
 * />
 * ```
 */
export function WorkspaceViewControls({
  showFileExplorer,
  showOutput,
  showAI,
  hasSelectedFile,
  workspaceMode,
  onToggleFileExplorer,
  onToggleOutput,
  onToggleAI,
  disabled = false,
  size = 'md',
  'data-testid': testId = 'workspace-view-controls',
}: WorkspaceViewControlsProps) {
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'

  return (
    <div className="flex items-center gap-2" data-testid={testId}>
      {/* File Explorer Toggle - Only show in workspace mode */}
      <ViewToggleButton
        icon={<Folder className={iconSize} />}
        activeLabel="Hide File Explorer"
        inactiveLabel="Show File Explorer"
        isActive={showFileExplorer}
        onClick={onToggleFileExplorer}
        disabled={disabled}
        showCondition={workspaceMode === 'workspace'}
        size={size}
        data-testid={`${testId}-file-explorer`}
      />

      {/* Output Toggle */}
      <ViewToggleButton
        icon={<Terminal className={iconSize} />}
        activeLabel="Hide Output"
        inactiveLabel="Show Output"
        isActive={showOutput}
        onClick={onToggleOutput}
        disabled={disabled}
        showCondition={true}
        size={size}
        data-testid={`${testId}-output`}
      />

      {/* AI Help Toggle - Only show when file is selected */}
      <ViewToggleButton
        icon={<Sparkles className={iconSize} />}
        activeLabel="Hide AI Help"
        inactiveLabel="Show AI Help"
        isActive={showAI}
        onClick={onToggleAI}
        disabled={disabled}
        showCondition={hasSelectedFile}
        size={size}
        data-testid={`${testId}-ai`}
      />
    </div>
  )
}

