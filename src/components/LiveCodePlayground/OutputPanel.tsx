"use client"

import React, { useEffect, useState } from 'react'
import { X, CheckCircle2, AlertCircle, Clock, ZoomIn, ZoomOut } from 'lucide-react'
import type { ExecutionResult } from '@/services/codeExecution'

interface OutputPanelProps {
  result: ExecutionResult | null
  executing: boolean
  onClear?: () => void
}

export function OutputPanel({ result, executing, onClear }: OutputPanelProps) {
  const [fontSize, setFontSize] = useState<number>(12)

  // Load persisted output font size
  useEffect(() => {
    try {
      const stored =
        typeof window !== 'undefined'
          ? window.localStorage.getItem('codehub:outputFontSize')
          : null
      if (stored) {
        const parsed = parseInt(stored, 10)
        if (!Number.isNaN(parsed) && parsed >= 10 && parsed <= 24) {
          setFontSize(parsed)
        }
      }
    } catch {
      // Ignore storage errors
    }
  }, [])

  // Persist output font size
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('codehub:outputFontSize', String(fontSize))
      }
    } catch {
      // Ignore storage errors
    }
  }, [fontSize])

  const handleZoomIn = () => {
    setFontSize((prev) => Math.min(24, prev + 1))
  }

  const handleZoomOut = () => {
    setFontSize((prev) => Math.max(10, prev - 1))
  }

  if (executing) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-sm text-muted-foreground">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
        <span>Executing code...</span>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
        <div className="space-y-2">
          <div className="text-4xl opacity-20">▶️</div>
          <p>Click &quot;Run&quot; to execute your code</p>
          <p className="text-xs">Powered by OneCompiler</p>
        </div>
      </div>
    )
  }

  const hasOutput = result.stdout || result.stderr
  const isSuccess = result.status === 'success' && !result.stderr

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-muted/10 px-3 py-1.5">
        <div className="flex items-center gap-2">
          {isSuccess ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
          ) : (
            <AlertCircle className="h-3.5 w-3.5 text-destructive" />
          )}
          <span className="text-xs font-medium">
            {isSuccess ? 'Success' : getStatusLabel(result.status)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom Controls */}
          <div className="flex items-center gap-1 border-r pr-2 mr-1">
            <button
              type="button"
              onClick={handleZoomOut}
              className="inline-flex items-center justify-center rounded-md border px-1.5 py-0.5 text-[10px] hover:bg-accent transition-colors"
              title="Zoom out output"
            >
              <ZoomOut className="h-3 w-3" />
            </button>
            <span className="text-[10px] text-muted-foreground w-10 text-center">
              {fontSize}px
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              className="inline-flex items-center justify-center rounded-md border px-1.5 py-0.5 text-[10px] hover:bg-accent transition-colors"
              title="Zoom in output"
            >
              <ZoomIn className="h-3 w-3" />
            </button>
          </div>

          {result.executionTime !== undefined && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{result.executionTime.toFixed(2)}s</span>
            </div>
          )}
          {onClear && (
            <button
              type="button"
              onClick={onClear}
              className="rounded p-0.5 hover:bg-accent"
              title="Clear output"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Output Content */}
      <div className="flex-1 overflow-y-auto">
        {hasOutput ? (
          <div
            className="p-3 font-mono"
            style={{ fontSize: `${fontSize}px`, lineHeight: 1.4 }}
          >
            {/* Standard Output */}
            {result.stdout && (
              <div className="whitespace-pre-wrap text-foreground">{result.stdout}</div>
            )}

            {/* Standard Error */}
            {result.stderr && (
              <div className="whitespace-pre-wrap text-destructive">
                {result.stderr}
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            <span>No output</span>
          </div>
        )}
      </div>

      {/* Footer - Execution Stats */}
      {(result.executionTime !== undefined || result.memory !== undefined) && (
        <div className="border-t bg-muted/5 px-3 py-1.5 text-[10px] text-muted-foreground">
          <div className="flex gap-4">
            {result.executionTime !== undefined && (
              <span>Time: {result.executionTime.toFixed(3)}s</span>
            )}
            {result.memory !== undefined && (
              <span>Memory: {(result.memory / 1024).toFixed(2)} MB</span>
            )}
            <span>Exit Code: {result.exitCode ?? 'N/A'}</span>
          </div>
        </div>
      )}
    </div>
  )
}

function getStatusLabel(status: ExecutionResult['status']): string {
  switch (status) {
    case 'success':
      return 'Success'
    case 'compilation_error':
      return 'Compilation Error'
    case 'runtime_error':
      return 'Runtime Error'
    case 'timeout':
      return 'Timeout'
    case 'error':
      return 'Error'
    default:
      return 'Unknown'
  }
}




