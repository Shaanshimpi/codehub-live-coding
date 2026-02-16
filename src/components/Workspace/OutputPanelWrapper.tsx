'use client'

import React from 'react'

interface OutputPanelWrapperProps {
  /** OutputPanel component content */
  children: React.ReactNode
  /** Optional className for the container */
  className?: string
  /** Optional data-testid for testing */
  'data-testid'?: string
}

/**
 * Shared wrapper component for Output Panel.
 * Provides consistent styling and structure across all workspace views.
 */
export function OutputPanelWrapper({
  children,
  className = '',
  'data-testid': testId = 'output-panel-wrapper',
}: OutputPanelWrapperProps) {
  return (
    <div 
      className={`flex flex-1 flex-col rounded-lg border bg-card overflow-hidden ${className}`}
      data-testid={testId}
    >
      <div className="border-b bg-muted/30 px-3 py-1.5">
        <h2 className="text-xs font-medium">Output</h2>
      </div>
      {children}
    </div>
  )
}

