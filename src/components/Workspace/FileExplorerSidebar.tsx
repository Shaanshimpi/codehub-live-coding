'use client'

import React from 'react'

interface FileExplorerSidebarProps {
  /** FileExplorer component content */
  children: React.ReactNode
  /** Optional loading overlay to show when switching files */
  loadingOverlay?: React.ReactNode
  /** Optional className for the container */
  className?: string
  /** Optional data-testid for testing */
  'data-testid'?: string
}

/**
 * Shared wrapper component for File Explorer sidebar.
 * Provides consistent styling and structure across all workspace views.
 */
export function FileExplorerSidebar({
  children,
  loadingOverlay,
  className = '',
  'data-testid': testId = 'file-explorer-sidebar',
}: FileExplorerSidebarProps) {
  return (
    <div 
      className={`w-64 border-r bg-muted/30 overflow-hidden relative ${className}`}
      data-testid={testId}
    >
      {loadingOverlay && (
        <div 
          className="absolute inset-0 bg-background/50 flex items-center justify-center z-10"
          data-testid="file-switching-overlay"
        >
          {loadingOverlay}
        </div>
      )}
      {children}
    </div>
  )
}


