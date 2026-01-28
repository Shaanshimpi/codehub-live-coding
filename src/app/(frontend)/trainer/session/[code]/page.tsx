'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Radio, RefreshCw, Sparkles, X } from 'lucide-react'

import { LiveCodePlayground } from '@/components/LiveCodePlayground'
import { OutputPanel } from '@/components/LiveCodePlayground/OutputPanel'
import { AIAssistantPanel } from '@/components/AIAssistant'
import { executeCode, type ExecutionResult } from '@/services/codeExecution'
import { SUPPORTED_LANGUAGES } from '@/components/LiveCodePlayground/types'

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

export default function TrainerSessionPage() {
  const params = useParams<{ code: string }>()
  const router = useRouter()
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
      setParticipantCount(Number(data.participantCount || 0))
      if (data.language) setLanguage(data.language)
      if (data.code) setCode(data.code)
      if (data.output) setExecutionResult(data.output)
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
          }),
        }).catch(() => {})
      } finally {
        setExecuting(false)
      }
    },
    [joinCode, language],
  )

  const handleEnd = useCallback(async () => {
    if (!joinCode) return
    try {
      await fetch(`/api/sessions/${joinCode}/end`, { method: 'POST' })
      setSessionActive(false)
    } catch (e) {
      console.error('Error ending session', e)
    }
  }, [joinCode])

  const currentLanguage = SUPPORTED_LANGUAGES.find((l) => l.id === language)
  const languageLabel = currentLanguage?.name || language

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
        <Link href="/trainer/start" className="rounded-md border px-4 py-2 text-sm hover:bg-accent">
          Back to Start
        </Link>
      </div>
    )
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden">
      {/* Header bar */}
      <header className="flex items-center justify-between border-b bg-card px-4 py-2">
        <div className="flex items-center gap-3">
          <Radio className="h-4 w-4 text-red-500" />
          <div className="flex flex-col">
            <span className="text-sm font-medium">{sessionTitle}</span>
            <span className="text-[10px] text-muted-foreground">Join code: {joinCode}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">👥 {participantCount} students</span>
          {lastUpdate && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <RefreshCw className="h-3 w-3" />
              <span>Last broadcast: {lastUpdate.toLocaleTimeString()}</span>
            </div>
          )}
          <button
            onClick={handleEnd}
            disabled={!sessionActive}
            className="flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-xs hover:bg-accent transition-colors disabled:opacity-50"
          >
            <X className="h-3 w-3" />
            {sessionActive ? 'End Session' : 'Session Ended'}
          </button>
        </div>
      </header>

      {!sessionActive && (
        <div className="border-b bg-destructive/10 px-4 py-2 text-xs text-destructive">
          This session has ended. Students can no longer join.
        </div>
      )}

      {/* Main content: editor + output + AI */}
      <div className="flex flex-1 gap-2 overflow-hidden p-2">
        {/* Editor + AI */}
        <div className={`flex flex-1 flex-col rounded-lg border bg-card overflow-hidden ${showAI ? 'max-w-[50%]' : ''}`}>
          <div className="flex items-center justify-between border-b bg-muted/30 px-3 py-1.5">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                TRAINER
              </span>
              <span className="text-xs text-muted-foreground">{languageLabel}</span>
            </div>
            <button
              onClick={() => setShowAI((prev) => !prev)}
              className="flex items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-xs hover:bg-accent transition-colors"
            >
              <Sparkles className="h-3 w-3" />
              {showAI ? 'Hide AI' : 'AI Help'}
            </button>
          </div>

          <LiveCodePlayground
            language={language}
            code={code}
            onChange={setCode}
            onRun={handleRun}
            executing={executing}
            showAIHelper={false}
            theme="vs-dark"
          />
        </div>

        {showAI && (
          <div className="flex w-[35%] flex-col">
            <AIAssistantPanel
              role="trainer"
              lectureId={joinCode}
              language={language}
              code={code}
              output={executionResult?.stdout || executionResult?.stderr}
              onClose={() => setShowAI(false)}
              onInsertCode={(newCode) => setCode(newCode)}
            />
          </div>
        )}

        {/* Output panel */}
        <div className={`flex flex-col rounded-lg border bg-card overflow-hidden ${showAI ? 'w-64' : 'w-80'}`}>
          <div className="border-b bg-muted/30 px-3 py-1.5">
            <h2 className="text-xs font-medium">Output</h2>
          </div>
          <OutputPanel
            result={executionResult}
            executing={executing}
            onClear={() => setExecutionResult(null)}
          />
        </div>
      </div>
    </div>
  )
}


