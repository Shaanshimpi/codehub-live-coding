'use client'

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Radio, RefreshCw, Sparkles, X, Users, ChevronDown, ChevronUp, Loader2, Save } from 'lucide-react'

import { LiveCodePlayground } from '@/components/LiveCodePlayground'
import { OutputPanel } from '@/components/LiveCodePlayground/OutputPanel'
import { cn } from '@/utilities/ui'
import { AIAssistantPanel } from '@/components/AIAssistant'
import { executeCode, type ExecutionResult } from '@/services/codeExecution'
import { SUPPORTED_LANGUAGES } from '@/components/LiveCodePlayground/types'
import { TrainerSessionWorkspace } from '@/components/SessionWorkspace/TrainerSessionWorkspace'

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

export function TrainerSessionClient() {
  const params = useParams<{ code: string }>()
  const joinCode = useMemo(() => normalizeCodeParam(params?.code), [params])

  const [sessionTitle, setSessionTitle] = useState<string>('Live Session')
  const [sessionActive, setSessionActive] = useState<boolean>(true)
  const [participantCount, setParticipantCount] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const [language, setLanguage] = useState<string>('javascript')
  const [code, setCode] = useState<string>(
    SUPPORTED_LANGUAGES.find((l) => l.id === 'javascript')?.defaultCode || '',
  )
  const [executing, setExecuting] = useState(false)
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null)
  const [showAI, setShowAI] = useState(false)
  const [showStudents, setShowStudents] = useState(false)
  const [students, setStudents] = useState<Array<{
    userId: string
    name: string
    code: string
    language: string
    updatedAt: string | null
    output: any | null
    workspaceFileId: string | null
    workspaceFileName: string | null
  }>>([])
  const [expandedStudentIds, setExpandedStudentIds] = useState<Set<string>>(new Set())
  const [refreshingStudents, setRefreshingStudents] = useState(false)
  const [refreshStudentsSuccess, setRefreshStudentsSuccess] = useState(false)
  // Manual save function state - must be with other useState hooks
  const [savingCode, setSavingCode] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

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
      // Count is now calculated from actual students array in the API
      setParticipantCount(Number(data.participantCount || 0))
      if (data.language) setLanguage(data.language)
      if (data.code) setCode(data.code)
      if (data.output) setExecutionResult(data.output)
      
      // Also load students initially to get accurate count
      const studentsRes = await fetch(`/api/sessions/${joinCode}/students`, { cache: 'no-store' })
      if (studentsRes.ok) {
        const studentsData = await studentsRes.json()
        setStudents(studentsData.students || [])
        setParticipantCount(studentsData.students?.length || 0)
      }
      
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

  // Fetch students manually (no automatic polling)
  const fetchStudents = useCallback(async () => {
    if (!joinCode) return
    setRefreshingStudents(true)
    setRefreshStudentsSuccess(false)
    try {
      const res = await fetch(`/api/sessions/${joinCode}/students`, { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setStudents(data.students || [])
        setParticipantCount(data.students?.length || 0)
        setRefreshStudentsSuccess(true)
        setTimeout(() => setRefreshStudentsSuccess(false), 2000)
      }
    } catch (e) {
      console.error('Failed to fetch students:', e)
    } finally {
      setRefreshingStudents(false)
    }
  }, [joinCode])

  // Fetch students on initial load
  useEffect(() => {
    if (joinCode) {
      fetchStudents()
    }
  }, [joinCode, fetchStudents])

  const handleRun = useCallback(
    async (currentCode: string, input?: string) => {
      if (!joinCode) return
      setExecuting(true)
      setExecutionResult(null)

      try {
        const result = await executeCode(language, currentCode, input)
        setExecutionResult(result)
        setLastUpdate(new Date())

        // Broadcast to students
        await fetch(`/api/sessions/${joinCode}/broadcast`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            currentCode,
            currentOutput: result,
            languageSlug: language,
          }),
        })
      } catch (e) {
        console.error('Error running code', e)
        const errorResult: ExecutionResult = {
          stdout: '',
          stderr: e instanceof Error ? e.message : 'Unknown error occurred',
          status: 'error',
          exitCode: 1,
        }
        setExecutionResult(errorResult)
        await fetch(`/api/sessions/${joinCode}/broadcast`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            currentCode,
            currentOutput: errorResult,
            languageSlug: language,
          }),
        }).catch(() => {})
      } finally {
        setExecuting(false)
      }
    },
    [joinCode, language],
  )

  const handleLanguageChange = useCallback(
    async (newLanguage: string) => {
      setLanguage(newLanguage)
      if (!joinCode) return

      // Persist/broadcast language change (without overwriting code/output)
      await fetch(`/api/sessions/${joinCode}/broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          languageSlug: newLanguage,
        }),
      }).catch(() => {})
    },
    [joinCode],
  )

  // Manual save function for trainer code
  const handleSaveCode = useCallback(async () => {
    if (!joinCode) return
    setSavingCode(true)
    setSaveSuccess(false)
    try {
      const response = await fetch(`/api/sessions/${joinCode}/broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentCode: code,
          languageSlug: language,
        }),
      })
      if (!response.ok) {
        alert('Failed to save code')
      } else {
        setLastUpdate(new Date())
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 2000)
      }
    } catch (error) {
      console.error('Failed to save code:', error)
      alert('Failed to save code')
    } finally {
      setSavingCode(false)
    }
  }, [joinCode, code, language])

  const handleEnd = useCallback(async () => {
    if (!joinCode) return
    try {
      await fetch(`/api/sessions/${joinCode}/end`, { method: 'POST' })
      setSessionActive(false)
    } catch (e) {
      console.error('Error ending session', e)
    }
  }, [joinCode])

  // Toggle student expansion - MUST be defined before any conditional returns
  const handleToggleStudent = useCallback((userId: string) => {
    setExpandedStudentIds((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) {
        next.delete(userId)
      } else {
        next.add(userId)
      }
      return next
    })
  }, [])

  // All hooks must be defined before any conditional returns
  const currentLanguage = SUPPORTED_LANGUAGES.find((l) => l.id === language)
  const languageLabel = currentLanguage?.name || language

  // Now safe to have conditional returns
  if (!joinCode) {
    return (
      <div className="container mx-auto py-16">
        <p className="text-destructive">Invalid session URL.</p>
        <Link href="/trainer/start" className="text-primary underline">
          Go back
        </Link>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <p className="text-muted-foreground">Loading session…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-16 space-y-4">
        <p className="text-destructive">{error}</p>
        <Link
          href="/trainer/start"
          className="rounded-md border px-4 py-2 text-sm hover:bg-accent"
        >
          Back to Start
        </Link>
      </div>
    )
  }

  return (
    <TrainerSessionWorkspace
      sessionCode={joinCode}
      sessionTitle={sessionTitle}
      participantCount={participantCount}
      sessionActive={sessionActive}
      onEndSession={handleEnd}
      students={students}
      onRefreshStudents={fetchStudents}
      refreshingStudents={refreshingStudents}
      refreshStudentsSuccess={refreshStudentsSuccess}
      expandedStudentIds={expandedStudentIds}
      onToggleStudent={handleToggleStudent}
    />
  )
}

