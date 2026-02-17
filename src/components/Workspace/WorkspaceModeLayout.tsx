'use client'

import React from 'react'

interface WorkspaceModeLayoutProps {
  /** Left column: File Explorer */
  fileExplorer?: React.ReactNode
  /** Center column: Editor */
  editor: React.ReactNode
  /** Right column: Output Panel */
  outputPanel?: React.ReactNode
  /** Right column: AI Assistant Panel */
  aiPanel?: React.ReactNode
  /** Whether file explorer is visible */
  showFileExplorer?: boolean
  /** Whether output panel is visible */
  showOutput?: boolean
  /** Whether AI panel is visible */
  showAI?: boolean
  /** Optional className for the container */
  className?: string
  /** Optional data-testid for testing */
  'data-testid'?: string
}

/**
 * Shared 3-column layout component for workspace mode.
 * Used consistently across WorkspaceLayout, TrainerSessionWorkspace, and StudentSessionWorkspace.
 * 
 * Layout structure:
 * - Left: File Explorer (optional, toggleable)
 * - Center: Editor (required)
 * - Right: Output Panel + AI Panel (optional, toggleable)
 */
export function WorkspaceModeLayout({
  fileExplorer,
  editor,
  outputPanel,
  aiPanel,
  showFileExplorer = true,
  showOutput = true,
  showAI = false,
  className = '',
  'data-testid': testId = 'workspace-layout',
}: WorkspaceModeLayoutProps) {
  return (
    <div 
      className={`flex flex-1 overflow-hidden ${className}`}
      data-testid={testId}
    >
      {/* Left: File Explorer */}
      {showFileExplorer && fileExplorer && (
        <div 
          className="w-64 border-r bg-muted/30 overflow-hidden"
          data-testid="file-explorer-column"
        >
          {fileExplorer}
        </div>
      )}

      {/* Center: Editor */}
      <div
        className={`flex flex-1 flex-col overflow-hidden ${
          showAI
            ? showFileExplorer && showOutput
              ? 'max-w-[50%]'
              : 'max-w-[65%]'
            : ''
        }`}
        data-testid="editor-column"
      >
        {editor}
      </div>

      {/* Right: Output + AI */}
      {showOutput && outputPanel && (
        <div 
          className={`flex flex-col gap-2 border-l bg-muted/30 p-2 ${showAI ? 'w-64' : 'w-80'}`}
          data-testid="panels-column"
        >
          {outputPanel}
        </div>
      )}

      {/* AI Assistant Panel (full width when output is hidden) */}
      {showAI && aiPanel && (
        <div 
          className="w-[35%] border-l bg-muted/30 p-2"
          data-testid="ai-panel-column"
        >
          {aiPanel}
        </div>
      )}
    </div>
  )
}


