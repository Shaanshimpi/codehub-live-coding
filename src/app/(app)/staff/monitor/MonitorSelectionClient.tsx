'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { RefreshCw, Loader2, ArrowLeft, Monitor as MonitorIcon, Users, Calendar } from 'lucide-react'
import { isValidJoinCode } from '@/utilities/joinCode'
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

export function MonitorSelectionClient() {
  const router = useRouter()
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshSuccess, setRefreshSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Manual code entry
  const [manualCode, setManualCode] = useState('')
  const [manualCodeError, setManualCodeError] = useState<string | null>(null)
  const [manualCodeLoading, setManualCodeLoading] = useState(false)

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/sessions/list', { cache: 'no-store' })
      
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setError('Unauthorized - staff access required. Please log in as admin or trainer.')
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
  }, [])

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

  const handleMonitorSession = useCallback((joinCode: string) => {
    router.push(`/staff/monitor/${joinCode}`)
  }, [router])

  const handleManualCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setManualCodeError(null)

    if (!manualCode.trim()) {
      setManualCodeError('Please enter a join code')
      return
    }

    // Validate join code format
    if (!isValidJoinCode(manualCode.trim())) {
      setManualCodeError('Invalid code format. Use format: XXX-XXX-XXX (no 0/O/I/1/L)')
      return
    }

    setManualCodeLoading(true)

    try {
      // Verify session exists
      const res = await fetch(`/api/sessions/${manualCode.trim().toUpperCase()}/live`, {
        cache: 'no-store',
      })

      if (!res.ok) {
        if (res.status === 404) {
          setManualCodeError('Session not found. Please check the code and try again.')
        } else if (res.status === 401 || res.status === 403) {
          setManualCodeError('Unauthorized. Please ensure you have staff access.')
        } else if (res.status >= 500) {
          setManualCodeError('Server error. Please try again later.')
        } else {
          setManualCodeError('Failed to verify session. Please try again.')
        }
        setManualCodeLoading(false)
        return
      }

      const session = await res.json()

      if (!session.isActive) {
        setManualCodeError('This session has ended.')
        setManualCodeLoading(false)
        return
      }

      // Redirect to monitor view
      router.push(`/staff/monitor/${manualCode.trim().toUpperCase()}`)
    } catch (err) {
      console.error('Error verifying session:', err)
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setManualCodeError('Network error. Please check your connection and try again.')
      } else {
        setManualCodeError('Failed to verify session. Please try again.')
      }
      setManualCodeLoading(false)
    }
  }

  return (
    <div className="container mx-auto min-h-screen px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>
        <div className="flex items-center gap-3">
          <MonitorIcon className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Monitor Session</h1>
        </div>
        <p className="text-muted-foreground mt-2">
          Select an active session to monitor students and trainer code
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 rounded-md bg-destructive/10 p-4 text-sm text-destructive border border-destructive/20">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8">
        {/* Active Sessions List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Active Sessions</h2>
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
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading sessions...</span>
            </div>
          ) : sessions.length === 0 ? (
            <div className="rounded-lg border bg-card p-8 text-center">
              <p className="text-muted-foreground">No active sessions found.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Sessions will appear here once trainers start them.
              </p>
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
                    <button
                      onClick={() => handleMonitorSession(session.joinCode)}
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition-colors whitespace-nowrap"
                    >
                      <MonitorIcon className="h-4 w-4" />
                      Monitor
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Manual Code Entry */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Enter Session Code</h2>
          <div className="rounded-lg border bg-card p-6">
            <p className="text-sm text-muted-foreground mb-4">
              If you have a session join code, enter it below to monitor that session directly.
            </p>
            <form onSubmit={handleManualCodeSubmit} className="space-y-4">
              <div>
                <label htmlFor="manualCode" className="block text-sm font-medium mb-2">
                  Join Code
                </label>
                <input
                  id="manualCode"
                  type="text"
                  value={manualCode}
                  onChange={(e) => {
                    setManualCode(e.target.value.toUpperCase())
                    setManualCodeError(null)
                  }}
                  placeholder="ABC-234-XYZ"
                  className="w-full rounded-md border bg-background px-4 py-3 text-center text-lg font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-ring"
                  maxLength={11}
                  disabled={manualCodeLoading}
                />
                <p className="mt-1 text-xs text-muted-foreground text-center">
                  Format: XXX-XXX-XXX (no 0/O/I/1/L)
                </p>
              </div>

              {manualCodeError && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
                  {manualCodeError}
                </div>
              )}

              <button
                type="submit"
                disabled={manualCodeLoading || !manualCode.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {manualCodeLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <MonitorIcon className="h-4 w-4" />
                    Monitor Session
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

