'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { MonitorWorkspace } from '@/components/Monitor/MonitorWorkspace'
import type { ExecutionResult } from '@/services/codeExecution'

type LiveSessionLiveResponse = {
  code: string
  output: any
  isActive: boolean
  title: string
  language: string | null
  participantCount: number
  trainerWorkspaceFileId: string | null
  trainerWorkspaceFileName: string | null
}

type Student = {
  userId: string
  name: string
  code: string
  language: string
  updatedAt: string | null
  output: any | null
  workspaceFileId: string | null
  workspaceFileName: string | null
}

function normalizeCodeParam(codeParam: string | string[] | undefined): string {
  const code = Array.isArray(codeParam) ? codeParam[0] : codeParam
  return (code || '').toUpperCase()
}

function mapOutputToExecutionResult(output: any): ExecutionResult | null {
  if (!output) return null
  return {
    stdout: output.stdout || '',
    stderr: output.stderr || '',
    status: output.status || 'success',
    memory: output.memory,
    exitCode: output.exitCode,
  }
}

export function MonitorViewClient() {
  const params = useParams<{ code: string }>()
  const joinCode = useMemo(() => normalizeCodeParam(params?.code), [params])

  const [sessionTitle, setSessionTitle] = useState<string>('Live Session')
  const [participantCount, setParticipantCount] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Trainer data
  const [trainerId, setTrainerId] = useState<string | null>(null)
  const [trainerName, setTrainerName] = useState<string>('Trainer')
  const [trainerCode, setTrainerCode] = useState<string>('')
  const [trainerLanguage, setTrainerLanguage] = useState<string>('javascript')
  const [trainerOutput, setTrainerOutput] = useState<ExecutionResult | null>(null)

  // Students data
  const [students, setStudents] = useState<Student[]>([])

  // Selected user (can be trainer or student)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

  // Refresh state
  const [refreshing, setRefreshing] = useState(false)
  const [refreshSuccess, setRefreshSuccess] = useState(false)

  const loadSessionInfo = useCallback(async () => {
    if (!joinCode) return

    try {
      const res = await fetch(`/api/sessions/${joinCode}/live`, { cache: 'no-store' })
      if (!res.ok) {
        if (res.status === 404) {
          setError('Session not found. It may have ended or the code is incorrect.')
          return
        }
        if (res.status === 401 || res.status === 403) {
          setError('Unauthorized. Please ensure you have staff access.')
          return
        }
        if (res.status >= 500) {
          setError('Server error. Please try again later.')
          return
        }
        throw new Error(`Failed to load session (${res.status})`)
      }

      const data = (await res.json()) as LiveSessionLiveResponse
      setSessionTitle(data.title || 'Live Session')
      setParticipantCount(Number(data.participantCount || 0))
      
      if (data.language) {
        setTrainerLanguage(data.language)
      }
      if (data.code) {
        setTrainerCode(data.code)
      }
      if (data.output) {
        setTrainerOutput(mapOutputToExecutionResult(data.output))
      }
      // Clear any previous errors on success
      setError(null)
    } catch (e) {
      console.error('Error loading session info:', e)
      if (e instanceof TypeError && e.message.includes('fetch')) {
        setError('Network error. Please check your connection and try again.')
      } else {
        setError('Failed to load session info. Please try again.')
      }
    }
  }, [joinCode])

  const loadStudents = useCallback(async () => {
    if (!joinCode) return

    try {
      const res = await fetch(`/api/sessions/${joinCode}/students`, { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setStudents(data.students || [])
        setParticipantCount(data.students?.length || 0)
      } else if (res.status === 404) {
        // Session not found - error already set by loadSessionInfo
        setStudents([])
      } else if (res.status === 401 || res.status === 403) {
        // Unauthorized - error already set by loadSessionInfo
        setStudents([])
      }
    } catch (e) {
      console.error('Error loading students:', e)
      // Don't set error here - let loadSessionInfo handle it
      setStudents([])
    }
  }, [joinCode])

  const loadInitial = useCallback(async () => {
    if (!joinCode) return
    setLoading(true)
    setError(null)

    // Load session info to get trainer data
    await loadSessionInfo()
    
    // Trainer info will be fetched separately via useEffect

    // Load students
    await loadStudents()

    setLoading(false)
  }, [joinCode, loadSessionInfo, loadStudents])

  useEffect(() => {
    loadInitial()
  }, [loadInitial])

  // Combined refresh function
  const handleRefresh = useCallback(async () => {
    if (!joinCode || refreshing) return
    setRefreshing(true)
    setRefreshSuccess(false)
    setError(null) // Clear previous errors

    try {
      await Promise.all([loadSessionInfo(), loadStudents()])
      // Show success after refresh completes
      setRefreshSuccess(true)
      setTimeout(() => setRefreshSuccess(false), 2000)
    } catch (e) {
      console.error('Error refreshing:', e)
      setError('Failed to refresh. Please try again.')
    } finally {
      setRefreshing(false)
    }
  }, [joinCode, loadSessionInfo, loadStudents, refreshing])

  // Get trainer info from sessions list API (to get trainer name and ID)
  useEffect(() => {
    const fetchTrainerInfo = async () => {
      try {
        const res = await fetch('/api/sessions/list', { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          const session = data.sessions?.find((s: any) => s.joinCode === joinCode)
          if (session?.trainer) {
            setTrainerId(String(session.trainer.id))
            setTrainerName(session.trainer.name || session.trainer.email || 'Trainer')
          }
        }
      } catch (e) {
        console.error('Error fetching trainer info:', e)
      }
    }
    if (joinCode && !loading) {
      fetchTrainerInfo()
    }
  }, [joinCode, loading])

  // Auto-select trainer on initial load (after trainerId is set)
  useEffect(() => {
    if (trainerId && !selectedUserId && !loading) {
      setSelectedUserId(`trainer-${trainerId}`)
    }
  }, [trainerId, selectedUserId, loading])

  if (!joinCode) {
    return (
      <div className="container mx-auto py-16">
        <p className="text-destructive">Invalid session URL.</p>
        <Link href="/staff/monitor" className="text-primary underline">
          Go back
        </Link>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
          <p className="text-muted-foreground">Loading session…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-16 space-y-4">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6">
          <h2 className="text-lg font-semibold text-destructive mb-2">Error</h2>
          <p className="text-destructive mb-4">{error}</p>
          <div className="flex gap-3">
            <Link
              href="/staff/monitor"
              className="rounded-md border border-destructive bg-destructive px-4 py-2 text-sm text-destructive-foreground hover:bg-destructive/90 transition-colors"
            >
              Back to Session Selection
            </Link>
            <button
              onClick={() => {
                setError(null)
                loadInitial()
              }}
              className="rounded-md border px-4 py-2 text-sm hover:bg-accent transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <MonitorWorkspace
      sessionCode={joinCode}
      sessionTitle={sessionTitle}
      trainerId={trainerId}
      trainerName={trainerName}
      participantCount={participantCount}
      trainerCode={trainerCode}
      trainerLanguage={trainerLanguage}
      trainerOutput={trainerOutput}
      students={students}
      selectedUserId={selectedUserId}
      onSelectUser={setSelectedUserId}
      onRefresh={handleRefresh}
      refreshing={refreshing}
      refreshSuccess={refreshSuccess}
    />
  )
}

