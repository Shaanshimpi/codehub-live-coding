'use client'

import React from 'react'

interface AIAssistantPanelWrapperProps {
  /** AIAssistantPanel component content */
  children: React.ReactNode
  /** Optional className for the container */
  className?: string
  /** Optional data-testid for testing */
  'data-testid'?: string
}

/**
 * Shared wrapper component for AI Assistant Panel.
 * Provides consistent styling and structure across all workspace views.
 * Ensures proper height and layout to prevent shortened appearance.
 */
export function AIAssistantPanelWrapper({
  children,
  className = '',
  'data-testid': testId = 'ai-panel-wrapper',
}: AIAssistantPanelWrapperProps) {
  return (
    <div 
      className={`flex flex-col flex-shrink-0 w-[400px] min-w-[350px] border-l bg-muted/30 p-2 h-full overflow-hidden ${className}`}
      data-testid={testId}
    >
      {children}
    </div>
  )
}


