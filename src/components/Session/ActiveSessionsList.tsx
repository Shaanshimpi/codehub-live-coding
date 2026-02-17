'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Loader2, Users, Calendar, Monitor as MonitorIcon } from 'lucide-react'
import { cn } from '@/utilities/ui'

interface Session {
  id: number
  joinCode: string
  title: string
  trainer: {
    id: number
    name: string
    email: string
  } | null
  participantCount: number
  startedAt: string
}

interface ActiveSessionsListProps {
  onSessionSelect?: (joinCode: string) => void
  actionLabel?: string
  actionIcon?: React.ReactNode
  showRefresh?: boolean
  className?: string
  emptyMessage?: string
  emptySubMessage?: string
  trainerId?: string // Optional: Filter sessions by trainer ID
}

export function ActiveSessionsList({
  onSessionSelect,
  actionLabel = 'Select',
  actionIcon,
  showRefresh = true,
  className,
  emptyMessage = 'No active sessions found.',
  emptySubMessage,
  trainerId,
}: ActiveSessionsListProps) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshSuccess, setRefreshSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSessions = useCallback(async () => {
    try {
      // Build URL with optional trainerId filter
      const url = trainerId 
        ? `/api/sessions/list?trainerId=${encodeURIComponent(trainerId)}`
        : '/api/sessions/list'
      
      const res = await fetch(url, { cache: 'no-store' })
      
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          // For non-staff users, silently fail and show empty state
          setSessions([])
          setError(null)
          return
        }
        if (res.status >= 500) {
          setError('Server error. Please try again later.')
          return
        }
        throw new Error(`Failed to fetch sessions (${res.status})`)
      }

      const data = await res.json()
      setSessions(data.sessions || [])
      setError(null)
    } catch (err) {
      console.error('Error fetching sessions:', err)
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('Network error. Please check your connection and try again.')
      } else {
        setError('Failed to load sessions. Please try again.')
      }
    }
  }, [trainerId])

  useEffect(() => {
    const loadInitial = async () => {
      setLoading(true)
      await fetchSessions()
      setLoading(false)
    }
    loadInitial()
  }, [fetchSessions])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    setRefreshSuccess(false)
    await fetchSessions()
    setRefreshing(false)
    setRefreshSuccess(true)
    setTimeout(() => setRefreshSuccess(false), 2000)
  }, [fetchSessions])

  const handleSessionClick = useCallback((joinCode: string) => {
    if (onSessionSelect) {
      onSessionSelect(joinCode)
    }
  }, [onSessionSelect])

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Active Sessions</h2>
        {showRefresh && (
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className={cn(
              "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors",
              refreshSuccess 
                ? "bg-green-500/20 border-green-500 text-green-700 dark:text-green-400" 
                : "bg-background hover:bg-accent",
              (refreshing || loading) && "opacity-50 cursor-not-allowed"
            )}
            title="Refresh sessions list"
          >
            {refreshing || loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span>{refreshSuccess ? 'Refreshed!' : 'Refresh'}</span>
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive border border-destructive/20">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading sessions...</span>
        </div>
      ) : sessions.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center">
          <p className="text-muted-foreground">{emptyMessage}</p>
          {emptySubMessage && (
            <p className="text-sm text-muted-foreground mt-2">
              {emptySubMessage}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="rounded-lg border bg-card p-4 hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <h3 className="font-semibold text-lg">{session.title}</h3>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <MonitorIcon className="h-4 w-4" />
                      <span className="font-mono font-medium">{session.joinCode}</span>
                    </div>
                    {session.trainer && (
                      <div className="flex items-center gap-1.5">
                        <Users className="h-4 w-4" />
                        <span>{session.trainer.name || session.trainer.email}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Users className="h-4 w-4" />
                      <span>{session.participantCount} participant{session.participantCount !== 1 ? 's' : ''}</span>
                    </div>
                    {session.startedAt && (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4" />
                        <span suppressHydrationWarning>
                          {new Date(session.startedAt).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                {onSessionSelect && (
                  <button
                    onClick={() => handleSessionClick(session.joinCode)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition-colors whitespace-nowrap"
                  >
                    {actionIcon}
                    {actionLabel}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

