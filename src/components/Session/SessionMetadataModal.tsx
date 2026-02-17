'use client'

import React, { useEffect, useState } from 'react'
import { X, Calendar, Users, Code, User, Globe, FileText, Loader2 } from 'lucide-react'
import { cn } from '@/utilities/ui'

interface SessionMetadata {
  id: number
  joinCode: string
  title: string
  trainer: {
    id: number
    name: string
    email: string
  } | null
  language: {
    id: string
    name: string
    slug: string
  } | null
  isActive: boolean
  participantCount: number
  startedAt: string
  endedAt: string | null
  createdAt: string
  trainerWorkspaceFileId: string | null
  trainerWorkspaceFileName: string | null
}

interface SessionMetadataModalProps {
  sessionCode: string
  isOpen: boolean
  onClose: () => void
}

export function SessionMetadataModal({ sessionCode, isOpen, onClose }: SessionMetadataModalProps) {
  const [metadata, setMetadata] = useState<SessionMetadata | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && sessionCode) {
      fetchMetadata()
    }
  }, [isOpen, sessionCode])

  const fetchMetadata = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/sessions/${sessionCode}/metadata`, { cache: 'no-store' })
      if (!res.ok) {
        throw new Error('Failed to fetch session metadata')
      }
      const data = await res.json()
      setMetadata(data.session)
    } catch (err) {
      console.error('Error fetching session metadata:', err)
      setError('Failed to load session metadata')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-lg border bg-card shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-xl font-semibold">Session Information</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 hover:bg-accent transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[70vh] overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading session metadata...</span>
            </div>
          ) : error ? (
            <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive border border-destructive/20">
              {error}
            </div>
          ) : metadata ? (
            <div className="space-y-4">
              {/* Large Title and Join Code */}
              <div className="flex items-center gap-4 flex-wrap pb-4 border-b">
                <h3 className="text-3xl font-bold">{metadata.title}</h3>
                <span className="text-2xl font-mono font-semibold text-muted-foreground">{metadata.joinCode}</span>
              </div>

              {/* Single Row: All other details */}
              <div className="flex items-center gap-4 flex-wrap text-xs text-muted-foreground">
                {/* Status */}
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                      metadata.isActive
                        ? 'bg-green-500/20 text-green-700 dark:text-green-400'
                        : 'bg-gray-500/20 text-gray-700 dark:text-gray-400'
                    )}
                  >
                    {metadata.isActive ? 'Active' : 'Ended'}
                  </span>
                </div>

                {/* Trainer */}
                {metadata.trainer && (
                  <div className="flex items-center gap-1.5">
                    <User className="h-3 w-3" />
                    <span className="font-medium">{metadata.trainer.name}</span>
                  </div>
                )}

                {/* Language */}
                {metadata.language && (
                  <div className="flex items-center gap-1.5">
                    <Code className="h-3 w-3" />
                    <span>{metadata.language.name}</span>
                  </div>
                )}

                {/* Participants */}
                <div className="flex items-center gap-1.5">
                  <Users className="h-3 w-3" />
                  <span>{metadata.participantCount} participant{metadata.participantCount !== 1 ? 's' : ''}</span>
                </div>

                {/* Trainer Workspace File */}
                {metadata.trainerWorkspaceFileName && (
                  <div className="flex items-center gap-1.5">
                    <FileText className="h-3 w-3" />
                    <span className="truncate max-w-[200px]">{metadata.trainerWorkspaceFileName}</span>
                  </div>
                )}

                {/* Started At */}
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3 w-3" />
                  <span suppressHydrationWarning>
                    Started: {new Date(metadata.startedAt).toLocaleDateString()} {new Date(metadata.startedAt).toLocaleTimeString()}
                  </span>
                </div>

                {/* Ended At */}
                {metadata.endedAt && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3 w-3" />
                    <span suppressHydrationWarning>
                      Ended: {new Date(metadata.endedAt).toLocaleDateString()} {new Date(metadata.endedAt).toLocaleTimeString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

