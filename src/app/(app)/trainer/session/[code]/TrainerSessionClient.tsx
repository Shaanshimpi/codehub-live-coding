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
    try {
      const res = await fetch(`/api/sessions/${joinCode}/students`, { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setStudents(data.students || [])
        // Update participant count from actual students array
        setParticipantCount(data.students?.length || 0)
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
  const [savingCode, setSavingCode] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const handleSaveCode = useCallback(async () => {
    if (!joinCode) return
    setSavingCode(true)
    setSaveSuccess(false)
    console.log('💾 [Trainer] Saving code...', { joinCode, codeLength: code.length, language })
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
        const errorText = await response.text()
        console.error('❌ [Trainer] Failed to save code:', response.status, response.statusText, errorText)
        alert('Failed to save code')
      } else {
        const data = await response.json()
        setLastUpdate(new Date())
        setSaveSuccess(true)
        console.log('✅ [Trainer] Code saved successfully', data)
        setTimeout(() => setSaveSuccess(false), 2000) // Hide success indicator after 2s
      }
    } catch (error) {
      console.error('❌ [Trainer] Failed to save code:', error)
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
          <button
            onClick={() => setShowStudents((prev) => !prev)}
            className="flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-xs hover:bg-accent transition-colors"
          >
            <Users className="h-3 w-3" />
            <span>{participantCount} students</span>
            {showStudents ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
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

      {/* Students' code panel */}
      {showStudents && (
        <div className="border-b bg-muted/30 px-4 py-2 max-h-[40vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-medium">Students' Scratchpads</h3>
            <button
              onClick={fetchStudents}
              disabled={refreshingStudents}
              className="flex items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-xs hover:bg-accent transition-colors disabled:opacity-50"
              title="Refresh students list"
            >
              {refreshingStudents ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
              <span>Refresh</span>
            </button>
          </div>
          {students.length === 0 ? (
            <p className="text-xs text-muted-foreground">No students have started coding yet.</p>
          ) : (
            <div className="space-y-2">
              {students.map((student) => {
                const isExpanded = expandedStudentIds.has(student.userId)
                return (
                  <div key={student.userId} className="border rounded-md bg-card">
                    <button
                      onClick={() => {
                        setExpandedStudentIds((prev) => {
                          const next = new Set(prev)
                          if (next.has(student.userId)) {
                            next.delete(student.userId)
                          } else {
                            next.add(student.userId)
                          }
                          return next
                        })
                      }}
                      className="w-full flex items-center justify-between p-2 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium">{student.name}</span>
                        {student.workspaceFileName && (
                          <span className="text-[10px] text-primary/70 font-medium">
                            📁 {student.workspaceFileName}
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          {student.language} • {student.updatedAt ? new Date(student.updatedAt).toLocaleTimeString() : 'Never'}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {isExpanded ? '▼' : '▶'}
                      </span>
                    </button>
                    {isExpanded && (
                      <div className="border-t p-2 space-y-2">
                        <div>
                          <div className="text-[10px] font-medium text-muted-foreground mb-1">Code:</div>
                          <div className="text-xs font-mono bg-muted/30 p-2 rounded max-h-32 overflow-y-auto">
                            <pre className="whitespace-pre-wrap break-words">{student.code || '// No code yet'}</pre>
                          </div>
                        </div>
                        {student.output && (
                          <div>
                            <div className="text-[10px] font-medium text-muted-foreground mb-1">Output:</div>
                            <div className="text-xs font-mono bg-muted/30 p-2 rounded max-h-32 overflow-y-auto">
                              {student.output.stdout && (
                                <div className="whitespace-pre-wrap break-words text-foreground mb-1">
                                  {student.output.stdout}
                                </div>
                              )}
                              {student.output.stderr && (
                                <div className="whitespace-pre-wrap break-words text-destructive">
                                  {student.output.stderr}
                                </div>
                              )}
                              {!student.output.stdout && !student.output.stderr && (
                                <div className="text-muted-foreground">No output</div>
                              )}
                              {student.output.status && (
                                <div className="text-[10px] text-muted-foreground mt-1">
                                  Status: {student.output.status}
                                  {student.output.executionTime !== undefined && (
                                    <span className="ml-2">Time: {student.output.executionTime.toFixed(2)}s</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Main content: editor + output + AI */}
      <div className="flex flex-1 gap-2 overflow-hidden p-2">
        {/* Editor + AI */}
        <div
          className={`flex flex-1 flex-col rounded-lg border bg-card overflow-hidden ${
            showAI ? 'max-w-[50%]' : ''
          }`}
        >
          <div className="flex items-center justify-between border-b bg-muted/30 px-3 py-1.5">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                TRAINER
              </span>
            <select
              value={language}
              onChange={(e) => void handleLanguageChange(e.target.value)}
              className="rounded-md border bg-background px-2 py-0.5 text-[10px] focus:outline-none focus:ring-1 focus:ring-ring"
              aria-label="Programming language"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.id} value={lang.id}>
                  {lang.name}
                </option>
              ))}
            </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveCode}
                disabled={savingCode}
                className={cn(
                  "flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors",
                  saveSuccess 
                    ? "bg-green-500/20 border-green-500 text-green-700 dark:text-green-400" 
                    : "bg-background hover:bg-accent",
                  savingCode && "opacity-50 cursor-not-allowed"
                )}
              >
                {savingCode ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Saving...
                  </>
                ) : saveSuccess ? (
                  <>
                    <Save className="h-3 w-3" />
                    Saved!
                  </>
                ) : (
                  <>
                    <Save className="h-3 w-3" />
                    Save
                  </>
                )}
              </button>
              <button
                onClick={() => setShowAI((prev) => !prev)}
                className="flex items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-xs hover:bg-accent transition-colors"
              >
                <Sparkles className="h-3 w-3" />
                {showAI ? 'Hide AI' : 'AI Help'}
              </button>
            </div>
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

