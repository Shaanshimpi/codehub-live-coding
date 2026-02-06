'use client'

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Code, Eye, RefreshCw, X, FilePlus, Save } from 'lucide-react'

import { LiveCodePlayground, SUPPORTED_LANGUAGES } from '@/components/LiveCodePlayground'
import { OutputPanel } from '@/components/LiveCodePlayground/OutputPanel'
import { AIAssistantPanel } from '@/components/AIAssistant'
import { executeCode, type ExecutionResult } from '@/services/codeExecution'
import { cn } from '@/utilities/ui'
import { FileSelectionModal } from '@/components/Session/FileSelectionModal'
import { File, ChevronDown } from 'lucide-react'

type ActiveTab = 'trainer' | 'scratchpad'

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

export function StudentSessionClient() {
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
  
  // Workspace file integration
  const [workspaceFileId, setWorkspaceFileId] = useState<string | null>(null)
  const [workspaceFileName, setWorkspaceFileName] = useState<string>('Session Scratchpad')
  const [showFileSelectionModal, setShowFileSelectionModal] = useState(false)
  const [fileSelectionComplete, setFileSelectionComplete] = useState(false)
  const [showFileDropdown, setShowFileDropdown] = useState(false)

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

      const nextTrainerLang = (data.language || 'javascript').toLowerCase()
      if (nextTrainerLang && nextTrainerLang !== trainerLanguage) {
        setTrainerLanguage(nextTrainerLang)
      }

      // Update with whatever the API returns
      setTrainerCode(data.code || '')
      setTrainerOutput(mapOutputToExecutionResult(data.output))
      setLastUpdate(new Date())
      if (activeTab !== 'trainer') {
        setHasNewTrainerUpdate(true)
      }

      setLoading(false)
      setError(null)
    } catch (e) {
      // Ignore cancellation errors
      if (e && typeof e === 'object' && 'type' in e && e.type === 'cancelation') {
        return
      }
      if (!(e && typeof e === 'object' && 'msg' in e && e.msg === 'operation is manually canceled')) {
        setError('Failed to load session.')
        setLoading(false)
      }
    }
  }, [joinCode, activeTab, trainerLanguage, fileSelectionComplete])

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

  // Manual refresh function for trainer code
  const [refreshingTrainerCode, setRefreshingTrainerCode] = useState(false)
  const [refreshSuccess, setRefreshSuccess] = useState(false)
  const handleRefreshTrainerCode = useCallback(async () => {
    if (!joinCode) return
    setRefreshingTrainerCode(true)
    setRefreshSuccess(false)
    try {
      await pollLive()
      setRefreshSuccess(true)
      setTimeout(() => setRefreshSuccess(false), 2000)
    } catch (error) {
      console.error('Failed to refresh trainer code:', error)
    } finally {
      setRefreshingTrainerCode(false)
    }
  }, [joinCode, pollLive])
  
  // Load trainer code once on mount
  useEffect(() => {
    if (joinCode && fileSelectionComplete) {
      pollLive()
    }
  }, [joinCode, fileSelectionComplete, pollLive])

  const handleScratchpadRun = async (code: string, input?: string) => {
    setScratchpadExecuting(true)
    setScratchpadOutput(null)
    try {
      const result = await executeCode(scratchpadLanguage, code, input)
      setScratchpadOutput(result)
      
      // Sync output to backend so trainer can see it
      if (joinCode) {
        await fetch(`/api/sessions/${joinCode}/scratchpad`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code: code, // Use the executed code, not scratchpadCode state
            language: scratchpadLanguage,
            output: result,
          }),
        }).catch(() => {}) // Silently fail - this is just for trainer visibility
      }
    } catch (error) {
      const errorResult: ExecutionResult = {
        stdout: '',
        stderr: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 'error',
        exitCode: 1,
      }
      setScratchpadOutput(errorResult)
      
      // Sync error output to backend
      if (joinCode) {
        await fetch(`/api/sessions/${joinCode}/scratchpad`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code: code, // Use the executed code, not scratchpadCode state
            language: scratchpadLanguage,
            output: errorResult,
          }),
        }).catch(() => {})
      }
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

  // Handle file selection from modal
  const handleFileSelect = async (fileId: string | null, fileName: string, content: string, language: string) => {
    if (fileId === 'new') {
      // Create new workspace file
      try {
        const res = await fetch('/api/files', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: fileName,
            content: '',
          }),
        })
        if (res.ok) {
          const newFile = await res.json()
          setWorkspaceFileId(newFile.doc.id)
          setWorkspaceFileName(newFile.doc.name)
          setScratchpadCode('')
          setScratchpadLanguage(language)
        }
      } catch (error) {
        console.error('Failed to create file:', error)
        // Fallback to scratchpad
        setWorkspaceFileId(null)
        setWorkspaceFileName('Session Scratchpad')
        setScratchpadCode('')
        setScratchpadLanguage(language)
      }
    } else if (fileId) {
      // Use existing workspace file
      setWorkspaceFileId(fileId)
      setWorkspaceFileName(fileName)
      setScratchpadCode(content)
      setScratchpadLanguage(language)
    } else {
      // Use session scratchpad
      setWorkspaceFileId(null)
      setWorkspaceFileName('Session Scratchpad')
      setScratchpadCode('')
      setScratchpadLanguage(language)
    }
    setFileSelectionComplete(true)
    setShowFileSelectionModal(false)
  }

  // Fetch workspace files for switch file dropdown
  const [workspaceFiles, setWorkspaceFiles] = useState<Array<{id: string, name: string, content: string, language: string}>>([])
  
  const fetchWorkspaceFiles = useCallback(async () => {
    try {
      const res = await fetch('/api/workspace/files')
      if (res.ok) {
        const data = await res.json()
        setWorkspaceFiles(data.files || [])
      }
    } catch (error) {
      console.error('Failed to fetch workspace files:', error)
    }
  }, [])

  // Load workspace files when dropdown is opened
  useEffect(() => {
    if (showFileDropdown) {
      fetchWorkspaceFiles()
    }
  }, [showFileDropdown, fetchWorkspaceFiles])

  // Handle switching to a different file
  const handleSwitchFile = (fileId: string | null) => {
    if (fileId === null) {
      // Switch to scratchpad
      setWorkspaceFileId(null)
      setWorkspaceFileName('Session Scratchpad')
      setScratchpadCode('')
      setScratchpadLanguage('javascript')
      setShowFileDropdown(false)
      return
    }
    
    const file = workspaceFiles.find((f) => f.id === fileId)
    if (file) {
      setWorkspaceFileId(file.id)
      setWorkspaceFileName(file.name)
      setScratchpadCode(file.content)
      setScratchpadLanguage(file.language)
      setShowFileDropdown(false)
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!showFileDropdown) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.file-dropdown-container')) {
        setShowFileDropdown(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [showFileDropdown])

  // Sync scratchpad code to backend
  const syncScratchpad = useCallback(async () => {
    if (!joinCode || !fileSelectionComplete) {
      throw new Error('File selection not complete')
    }
    if (typeof scratchpadCode !== 'string' || typeof scratchpadLanguage !== 'string') {
      throw new Error('Invalid code or language')
    }
    
    const response = await fetch(`/api/sessions/${joinCode}/scratchpad`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: scratchpadCode,
        language: scratchpadLanguage,
        workspaceFileId: workspaceFileId,
      }),
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to sync: ${response.status} - ${errorText}`)
    }

    // Also sync to workspace file if using one
    if (workspaceFileId) {
      await fetch(`/api/files/${workspaceFileId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: scratchpadCode,
        }),
      }).catch(() => {
        // Silently fail - workspace sync is secondary
      })
    }
  }, [joinCode, scratchpadCode, scratchpadLanguage, workspaceFileId, fileSelectionComplete])

  // Manual save function for student scratchpad
  const [savingScratchpad, setSavingScratchpad] = useState(false)
  const [saveScratchpadSuccess, setSaveScratchpadSuccess] = useState(false)
  const handleSaveScratchpad = useCallback(async () => {
    if (!joinCode || !fileSelectionComplete) return
    setSavingScratchpad(true)
    setSaveScratchpadSuccess(false)
    try {
      await syncScratchpad()
      setSaveScratchpadSuccess(true)
      setTimeout(() => setSaveScratchpadSuccess(false), 2000)
    } catch (error) {
      console.error('Failed to save scratchpad:', error)
    } finally {
      setSavingScratchpad(false)
    }
  }, [joinCode, fileSelectionComplete, syncScratchpad])

  const handleLeave = async () => {
    await fetch(`/api/sessions/${joinCode}/leave`, { method: 'POST' }).catch(() => {})
    router.push('/workspace')
  }

  // Prevent copying trainer code (encourage typing)
  const preventCopy = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault()
    e.stopPropagation()
    return false
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
          <Link
            className="rounded-md border px-4 py-2 text-sm hover:bg-accent"
            href="/workspace"
          >
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
              activeTab === 'trainer'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted',
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

          <div className="flex items-center gap-2">
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
              Your Code
            </button>
            {activeTab === 'scratchpad' && fileSelectionComplete && (
              <div className="relative file-dropdown-container">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowFileDropdown(!showFileDropdown)
                  }}
                  className="flex items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-xs hover:bg-accent transition-colors"
                >
                  {workspaceFileId ? (
                    <>
                      <File className="h-3 w-3" />
                      <span>{workspaceFileName}</span>
                    </>
                  ) : (
                    <>
                      <File className="h-3 w-3" />
                      <span>Session Scratchpad</span>
                    </>
                  )}
                  <ChevronDown className="h-3 w-3" />
                </button>
                {showFileDropdown && (
                  <div className="absolute top-full left-0 mt-1 bg-card border rounded-md shadow-lg z-50 min-w-[200px] max-h-64 overflow-y-auto">
                    <div className="p-1 space-y-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSwitchFile(null)
                        }}
                        className={cn(
                          "w-full text-left px-2 py-1.5 text-xs hover:bg-muted rounded-md flex items-center gap-2",
                          !workspaceFileId && "bg-primary/10"
                        )}
                      >
                        <File className="h-3 w-3" />
                        Session Scratchpad
                      </button>
                      {workspaceFiles.length > 0 && (
                        <>
                          <div className="border-t my-1" />
                          {workspaceFiles.map((file) => (
                            <button
                              key={file.id}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleSwitchFile(file.id)
                              }}
                              className={cn(
                                "w-full text-left px-2 py-1.5 text-xs hover:bg-muted rounded-md flex items-center gap-2",
                                workspaceFileId === file.id && "bg-primary/10"
                              )}
                            >
                              <File className="h-3 w-3" />
                              <span className="flex-1 truncate">{file.name}</span>
                            </button>
                          ))}
                        </>
                      )}
                      <div className="border-t my-1" />
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setShowFileSelectionModal(true)
                          setShowFileDropdown(false)
                        }}
                        className="w-full text-left px-2 py-1.5 text-xs hover:bg-muted rounded-md flex items-center gap-2"
                      >
                        <FilePlus className="h-3 w-3" />
                        Create New File...
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-1 gap-2 overflow-hidden pt-2">
          {activeTab === 'trainer' && (
            <>
              <div
                className="flex flex-1 flex-col rounded-lg border border-primary/50 bg-card overflow-hidden select-none"
                style={{
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  MozUserSelect: 'none',
                  msUserSelect: 'none',
                  pointerEvents: 'auto',
                }}
                onCopy={preventCopy}
                onCut={preventCopy}
                onMouseDown={(e) => {
                  if (activeTab === 'trainer') {
                    e.preventDefault()
                  }
                }}
              >
                <div className="flex items-center justify-between border-b bg-primary/10 px-3 py-1.5">
                  <h2 className="text-xs font-medium text-primary">
                    Trainer&apos;s Code (View Only — type it yourself)
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleRefreshTrainerCode}
                      disabled={refreshingTrainerCode}
                      className={cn(
                        "flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors",
                        refreshSuccess 
                          ? "bg-green-500/20 border-green-500 text-green-700 dark:text-green-400" 
                          : "bg-background hover:bg-accent",
                        refreshingTrainerCode && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      {refreshingTrainerCode ? (
                        <>
                          <RefreshCw className="h-3 w-3 animate-spin" />
                          Refreshing...
                        </>
                      ) : refreshSuccess ? (
                        <>
                          <RefreshCw className="h-3 w-3" />
                          Refreshed!
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-3 w-3" />
                          Refresh
                        </>
                      )}
                    </button>
                    <span className="text-[10px] text-muted-foreground">
                      {trainerLanguage.toUpperCase()}
                    </span>
                  </div>
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
                <OutputPanel
                  result={trainerOutput}
                  executing={false}
                  onClear={() => setTrainerOutput(null)}
                />
              </div>
            </>
          )}

          {activeTab === 'scratchpad' && (
            <>
              <div
                className={cn(
                  'flex flex-1 flex-col rounded-lg border border-success/50 bg-card overflow-hidden',
                  showAI && 'max-w-[50%]',
                )}
              >
                <div className="flex items-center justify-between border-b bg-success/10 px-3 py-1.5">
                  <h2 className="text-xs font-medium text-success">Your Private Scratchpad</h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSaveScratchpad}
                      disabled={savingScratchpad || !fileSelectionComplete}
                      className={cn(
                        "flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors",
                        saveScratchpadSuccess 
                          ? "bg-green-500/20 border-green-500 text-green-700 dark:text-green-400" 
                          : "bg-background hover:bg-accent",
                        (savingScratchpad || !fileSelectionComplete) && "opacity-50 cursor-not-allowed"
                      )}
                      title={!fileSelectionComplete ? "Please select a file first" : "Save your code"}
                    >
                      {savingScratchpad ? <Save className="h-3 w-3 animate-pulse" /> : <Save className="h-3 w-3" />}
                      {saveScratchpadSuccess ? 'Saved!' : 'Save'}
                    </button>
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

              <div
                className={cn(
                  'flex flex-col rounded-lg border border-success/50 bg-card overflow-hidden',
                  showAI ? 'w-64' : 'w-80',
                )}
              >
                <div className="border-b bg-success/10 px-3 py-1.5">
                  <h2 className="text-xs font-medium text-success">Your Output</h2>
                </div>
                <OutputPanel
                  result={scratchpadOutput}
                  executing={scratchpadExecuting}
                  onClear={() => setScratchpadOutput(null)}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* File Selection Modal */}
      <FileSelectionModal
        isOpen={showFileSelectionModal}
        onSelect={handleFileSelect}
        onClose={() => {
          if (!fileSelectionComplete) {
            // If they close without selecting, default to scratchpad
            handleFileSelect(null, 'Session Scratchpad', '', 'javascript')
          } else {
            setShowFileSelectionModal(false)
          }
        }}
      />
    </div>
  )
}


