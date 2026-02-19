'use client'

import React from 'react'
import { cn } from '@/utilities/ui'

interface ViewToggleButtonProps {
  /** Icon to display */
  icon: React.ReactNode
  /** Active state label (for title/tooltip) */
  activeLabel: string
  /** Inactive state label (for title/tooltip) */
  inactiveLabel: string
  /** Whether button is currently active */
  isActive: boolean
  /** Click handler */
  onClick: () => void
  /** Whether button is disabled */
  disabled?: boolean
  /** Whether to show the button (conditional rendering) */
  showCondition?: boolean
  /** Optional className for size variants */
  size?: 'sm' | 'md'
  /** Optional data-testid for testing */
  'data-testid'?: string
}

/**
 * Reusable toggle button component for workspace view controls.
 * Used for File Explorer, Output, and AI Help toggles.
 * 
 * @example
 * ```tsx
 * <ViewToggleButton
 *   icon={<Folder className="h-4 w-4" />}
 *   activeLabel="Hide File Explorer"
 *   inactiveLabel="Show File Explorer"
 *   isActive={showFileExplorer}
 *   onClick={() => setShowFileExplorer(!showFileExplorer)}
 *   disabled={uploading}
 *   showCondition={workspaceMode === 'workspace'}
 * />
 * ```
 */
export function ViewToggleButton({
  icon,
  activeLabel,
  inactiveLabel,
  isActive,
  onClick,
  disabled = false,
  showCondition = true,
  size = 'md',
  'data-testid': testId,
}: ViewToggleButtonProps) {
  if (!showCondition) {
    return null
  }

  const sizeClasses = size === 'sm' 
    ? 'px-2.5 py-1.5 text-xs' 
    : 'px-2.5 py-1.5 text-sm'

  const handleClick = () => {
    console.log('[ViewToggleButton] Toggle clicked', { 
      activeLabel, 
      inactiveLabel, 
      currentState: isActive ? 'active' : 'inactive',
      newState: isActive ? 'inactive' : 'active'
    })
    onClick()
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        'flex items-center justify-center gap-1.5 rounded-md border font-medium transition-colors',
        sizeClasses,
        isActive
          ? 'bg-card hover:bg-accent'
          : 'bg-muted text-muted-foreground hover:bg-muted/80',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
      title={isActive ? activeLabel : inactiveLabel}
      data-testid={testId}
    >
      {icon}
    </button>
  )
}

