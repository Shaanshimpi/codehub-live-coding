'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { StudentSessionWorkspace } from '@/components/SessionWorkspace/StudentSessionWorkspace'

type LiveSessionLiveResponse = {
  code: string
  output: any
  isActive: boolean
  title: string
  language: string | null
  participantCount: number
}

function normalizeCodeParam(codeParam: string | string[] | undefined): string {
  const code = Array.isArray(codeParam) ? codeParam[0] : codeParam
  return (code || '').toUpperCase()
}

export function StudentSessionClient() {
  const params = useParams<{ code: string }>()
  const joinCode = useMemo(() => normalizeCodeParam(params?.code), [params])

  const [sessionTitle, setSessionTitle] = useState<string>('Live Session')
  const [sessionActive, setSessionActive] = useState<boolean>(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadInitial = useCallback(async () => {
    if (!joinCode) return
    try {
      const res = await fetch(`/api/sessions/${joinCode}/live`, { cache: 'no-store' })
      if (!res.ok) {
        setError(res.status === 404 ? 'Session not found.' : 'Failed to load session.')
        setLoading(false)
        return
      }
      const data = (await res.json()) as LiveSessionLiveResponse
      setSessionTitle(data.title || 'Live Session')
      setSessionActive(Boolean(data.isActive))
      setLoading(false)
    } catch (e) {
      console.error(e)
      setError('Failed to load session.')
      setLoading(false)
    }
  }, [joinCode])

  useEffect(() => {
    loadInitial()
  }, [loadInitial])

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading session...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-lg font-medium text-destructive">{error}</p>
          <p className="text-sm text-muted-foreground">
            The session may have ended or the join code is invalid.
          </p>
        </div>
      </div>
    )
  }

  if (!joinCode) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-lg font-medium">Invalid session code</p>
        </div>
      </div>
    )
  }

  return (
    <StudentSessionWorkspace
      sessionCode={joinCode}
      sessionTitle={sessionTitle}
      sessionActive={sessionActive}
    />
  )
}

