'use client'

import React from 'react'
import { cn } from '@/utilities/ui'

/**
 * Lightweight read-only code viewer (no Monaco). Use for trainer viewing student scratchpads.
 */
interface SimpleCodeViewerProps {
  code: string
  language?: string
  className?: string
  /** Optional fixed height (e.g. "16rem") */
  height?: string
}

export function SimpleCodeViewer({
  code,
  language = 'javascript',
  className,
  height,
}: SimpleCodeViewerProps) {
  return (
    <div
      className={cn('overflow-auto rounded-md border bg-muted/20 font-mono text-xs', className)}
      style={height ? { height } : undefined}
    >
      <pre className="m-0 w-full min-w-max p-3 whitespace-pre-wrap break-words text-foreground">
        {code || '// No code yet'}
      </pre>
    </div>
  )
}
