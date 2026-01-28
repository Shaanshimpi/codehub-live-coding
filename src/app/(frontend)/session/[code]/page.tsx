'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Code, Eye, RefreshCw, Radio, X } from 'lucide-react'

import { LiveCodePlayground, SUPPORTED_LANGUAGES } from '@/components/LiveCodePlayground'
import { OutputPanel } from '@/components/LiveCodePlayground/OutputPanel'
import { AIAssistantPanel } from '@/components/AIAssistant'
import { executeCode, type ExecutionResult } from '@/services/codeExecution'
import { cn } from '@/utilities/ui'

type ActiveTab = 'trainer' | 'scratchpad'

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

function mapOutputToExecutionResult(output: any): ExecutionResult | null {
  if (!output) return null
  // We store OneCompiler-like objects; be defensive
  return {
    stdout: output.stdout || '',
    stderr: output.stderr || '',
    status: output.status || 'success',
    executionTime: output.executionTime,
    memory: output.memory,
    exitCode: output.exitCode,
  }
}

export default function StudentSessionPage() {
  const params = useParams<{ code: string }>()
  const router = useRouter()

  const joinCode = useMemo(() => normalizeCodeParam(params?.code), [params])

  const [activeTab, setActiveTab] = useState<ActiveTab>('trainer')
  const [hasNewTrainerUpdate, setHasNewTrainerUpdate] = useState(false)

  // Live session state
  const [sessionTitle, setSessionTitle] = useState<string>('Live Session')
  const [sessionActive, setSessionActive] = useState<boolean>(true)
  const [participantCount, setParticipantCount] = useState<number>(0)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Trainer broadcast (read-only)
  const [trainerLanguage, setTrainerLanguage] = useState('javascript')
  const [trainerCode, setTrainerCode] = useState('')
  const [trainerOutput, setTrainerOutput] = useState<ExecutionResult | null>(null)

  // Student scratchpad (private)
  const [scratchpadLanguage, setScratchpadLanguage] = useState('javascript')
  const [scratchpadCode, setScratchpadCode] = useState(
    SUPPORTED_LANGUAGES.find((l) => l.id === 'javascript')?.defaultCode || '',
  )
  const [scratchpadExecuting, setScratchpadExecuting] = useState(false)
  const [scratchpadOutput, setScratchpadOutput] = useState<ExecutionResult | null>(null)
  const [showAI, setShowAI] = useState(false)

  const pollLive = useCallback(async () => {
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

      // trainer language from session (optional)
      const nextTrainerLang = (data.language || 'javascript').toLowerCase()
      if (nextTrainerLang && nextTrainerLang !== trainerLanguage) {
        // This is display-only; Monaco language mapping is handled inside LiveCodePlayground
        setTrainerLanguage(nextTrainerLang)
      }

      const nextTrainerCode = data.code || ''
      const changed = nextTrainerCode !== trainerCode
      if (changed) {
        setTrainerCode(nextTrainerCode)
        setLastUpdate(new Date())
        if (activeTab !== 'trainer') setHasNewTrainerUpdate(true)
      }

      const nextOut = mapOutputToExecutionResult(data.output)
      // only update if changed-ish
      if (JSON.stringify(nextOut) !== JSON.stringify(trainerOutput)) {
        setTrainerOutput(nextOut)
        setLastUpdate(new Date())
        if (activeTab !== 'trainer') setHasNewTrainerUpdate(true)
      }

      setLoading(false)
      setError(null)
    } catch (e) {
      console.error(e)
      setError('Failed to load session.')
      setLoading(false)
    }
  }, [joinCode, activeTab, trainerCode, trainerOutput, trainerLanguage])

  // Join on mount; leave on unmount
  useEffect(() => {
    if (!joinCode) return

    let cancelled = false

    async function join() {
      try {
        await fetch(`/api/sessions/${joinCode}/join`, { method: 'POST' })
      } catch {
        // ignore
      }
      if (!cancelled) pollLive()
    }

    join()

    return () => {
      cancelled = true
      fetch(`/api/sessions/${joinCode}/leave`, { method: 'POST' }).catch(() => {})
    }
  }, [joinCode, pollLive])

  // Poll every 2s
  useEffect(() => {
    if (!joinCode) return
    const id = setInterval(() => {
      pollLive()
    }, 2000)
    return () => clearInterval(id)
  }, [joinCode, pollLive])

  const handleScratchpadRun = async (code: string, input?: string) => {
    setScratchpadExecuting(true)
    setScratchpadOutput(null)
    try {
      const result = await executeCode(scratchpadLanguage, code, input)
      setScratchpadOutput(result)
    } catch (error) {
      setScratchpadOutput({
        stdout: '',
        stderr: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 'error',
        exitCode: 1,
      })
    } finally {
      setScratchpadExecuting(false)
    }
  }

  const handleScratchpadLanguageChange = (newLanguage: string) => {
    setScratchpadLanguage(newLanguage)
    const lang = SUPPORTED_LANGUAGES.find((l) => l.id === newLanguage)
    if (lang) setScratchpadCode(lang.defaultCode)
    setScratchpadOutput(null)
  }

  const handleLeave = async () => {
    await fetch(`/api/sessions/${joinCode}/leave`, { method: 'POST' }).catch(() => {})
    router.push('/workspace')
  }

  // Prevent copying trainer code (encourage typing)
  const preventCopy = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault()
  }, [])

  if (!joinCode) {
    return (
      <div className="container mx-auto py-16">
        <p className="text-muted-foreground">Invalid session code.</p>
        <Link className="text-primary underline" href="/join">
          Go back
        </Link>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Joining session…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-16 space-y-4">
        <p className="text-destructive">{error}</p>
        <div className="flex gap-3">
          <Link className="rounded-md border px-4 py-2 text-sm hover:bg-accent" href="/join">
            Back to Join
          </Link>
          <Link className="rounded-md border px-4 py-2 text-sm hover:bg-accent" href="/workspace">
            Back to Workspace
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between border-b bg-card px-4 py-2">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-2 w-2 rounded-full bg-red-500" aria-hidden="true" />
          <h1 className="text-sm font-medium">
            {sessionTitle} <span className="text-muted-foreground">({joinCode})</span>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {lastUpdate && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <RefreshCw className="h-3 w-3" />
              <span>Updated: {lastUpdate.toLocaleTimeString()}</span>
            </div>
          )}
          <span className="text-xs text-muted-foreground">👥 {participantCount}</span>

          <button
            onClick={handleLeave}
            className="flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-xs hover:bg-accent transition-colors"
          >
            <X className="h-3 w-3" />
            Leave
          </button>
        </div>
      </header>

      {!sessionActive && (
        <div className="border-b bg-destructive/10 px-4 py-2 text-sm text-destructive">
          This session has ended. You can go back to your workspace.
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-1 flex-col overflow-hidden p-2">
        <div className="flex items-center gap-2 border-b pb-2">
          <button
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium transition-colors',
              activeTab === 'trainer' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
            )}
            onClick={() => {
              setActiveTab('trainer')
              setHasNewTrainerUpdate(false)
            }}
          >
            <Eye className="h-4 w-4" />
            Trainer&apos;s Code
            {hasNewTrainerUpdate && (
              <span className="relative ml-2 flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
              </span>
            )}
          </button>

          <button
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium transition-colors',
              activeTab === 'scratchpad'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted',
            )}
            onClick={() => setActiveTab('scratchpad')}
          >
            <Code className="h-4 w-4" />
            Your Scratchpad
          </button>
        </div>

        <div className="flex flex-1 gap-2 overflow-hidden pt-2">
          {activeTab === 'trainer' && (
            <>
              <div
                className="flex flex-1 flex-col rounded-lg border border-primary/50 bg-card overflow-hidden select-none"
                style={{ userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none' }}
                onCopy={preventCopy}
                onCut={preventCopy}
              >
                <div className="flex items-center justify-between border-b bg-primary/10 px-3 py-1.5">
                  <h2 className="text-xs font-medium text-primary">
                    Trainer&apos;s Code (View Only — type it yourself)
                  </h2>
                  <span className="text-[10px] text-muted-foreground">{trainerLanguage.toUpperCase()}</span>
                </div>

                <LiveCodePlayground
                  language={trainerLanguage}
                  code={trainerCode || '// Waiting for trainer...'}
                  onChange={() => {}}
                  onRun={() => {}}
                  readOnly
                  executing={false}
                  showAIHelper={false}
                  theme="vs-dark"
                />
              </div>

              <div className="flex w-80 flex-col rounded-lg border border-primary/50 bg-card overflow-hidden">
                <div className="border-b bg-primary/10 px-3 py-1.5">
                  <h2 className="text-xs font-medium text-primary">Trainer&apos;s Output</h2>
                </div>
                <OutputPanel result={trainerOutput} executing={false} onClear={() => setTrainerOutput(null)} />
              </div>
            </>
          )}

          {activeTab === 'scratchpad' && (
            <>
              <div className={cn('flex flex-1 flex-col rounded-lg border border-success/50 bg-card overflow-hidden', showAI && 'max-w-[50%]')}>
                <div className="flex items-center justify-between border-b bg-success/10 px-3 py-1.5">
                  <h2 className="text-xs font-medium text-success">Your Private Scratchpad</h2>
                  <select
                    value={scratchpadLanguage}
                    onChange={(e) => handleScratchpadLanguageChange(e.target.value)}
                    className="rounded-md border bg-background px-2 py-0.5 text-[10px] focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <option key={lang.id} value={lang.id}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                </div>

                <LiveCodePlayground
                  language={scratchpadLanguage}
                  code={scratchpadCode}
                  onChange={setScratchpadCode}
                  onRun={handleScratchpadRun}
                  executing={scratchpadExecuting}
                  showAIHelper
                  onAIRequest={() => setShowAI(true)}
                  theme="vs-dark"
                />
              </div>

              {showAI && (
                <div className="flex w-[35%] flex-col">
                  <AIAssistantPanel
                    role="student"
                    lectureId={joinCode}
                    language={scratchpadLanguage}
                    code={scratchpadCode}
                    output={scratchpadOutput?.stdout || scratchpadOutput?.stderr}
                    onClose={() => setShowAI(false)}
                    onInsertCode={(newCode) => setScratchpadCode(newCode)}
                  />
                </div>
              )}

              <div className={cn('flex flex-col rounded-lg border border-success/50 bg-card overflow-hidden', showAI ? 'w-64' : 'w-80')}>
                <div className="border-b bg-success/10 px-3 py-1.5">
                  <h2 className="text-xs font-medium text-success">Your Output</h2>
                </div>
                <OutputPanel result={scratchpadOutput} executing={scratchpadExecuting} onClear={() => setScratchpadOutput(null)} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}


