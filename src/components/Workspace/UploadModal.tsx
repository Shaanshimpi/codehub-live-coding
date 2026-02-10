'use client'

import React from 'react'
import { Upload, Loader2 } from 'lucide-react'

interface UploadModalProps {
  isOpen: boolean
  progress?: number
  message?: string
}

export function UploadModal({ isOpen, progress, message }: UploadModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-sm pointer-events-auto">
      <div className="rounded-lg border bg-card p-6 shadow-xl max-w-md w-full mx-4">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Upload className="h-12 w-12 text-primary animate-pulse" />
            <Loader2 className="h-6 w-6 text-primary animate-spin absolute -top-1 -right-1" />
          </div>
          <div className="text-center space-y-2 w-full">
            <h3 className="text-lg font-semibold">Uploading Workspace</h3>
            <p className="text-sm text-muted-foreground">
              {message || 'Please wait while we extract and process your files...'}
            </p>
            {progress !== undefined && (
              <>
                <div className="w-full bg-muted rounded-full h-2.5 mt-4">
                  <div
                    className="bg-primary h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {progress}%
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

