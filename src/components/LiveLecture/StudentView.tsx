'use client'

import React, { useState, useEffect } from 'react'
import { LiveCodePlayground, SUPPORTED_LANGUAGES } from '@/components/LiveCodePlayground'
import { OutputPanel } from '@/components/LiveCodePlayground/OutputPanel'
import { AIAssistantPanel } from '@/components/AIAssistant'
import { Eye, Code, RefreshCw, Bell } from 'lucide-react'
import { executeCode, type ExecutionResult } from '@/services/codeExecution'
import {
  getCurrentSnapshot,
  subscribeToEvents,
} from '@/services/liveSessionStore'
import type { CodeSnapshot } from '@/types/live-session'

interface StudentViewProps {
  lectureId: string
}

type ActiveTab = 'trainer' | 'scratchpad'

export function StudentView({ lectureId }: StudentViewProps) {
  // Tab state
  const [activeTab, setActiveTab] = useState<ActiveTab>('trainer')
  const [hasNewTrainerUpdate, setHasNewTrainerUpdate] = useState(false)

  // Trainer's code (read-only)
  const [trainerSnapshot, setTrainerSnapshot] = useState<CodeSnapshot | null>(null)
  const [trainerLanguage, setTrainerLanguage] = useState('javascript')
  const [trainerCode, setTrainerCode] = useState('')
  const [trainerOutput, setTrainerOutput] = useState<ExecutionResult | null>(null)

  // Student's scratchpad (editable)
  const [scratchpadLanguage, setScratchpadLanguage] = useState('javascript')
  const [scratchpadCode, setScratchpadCode] = useState(
    SUPPORTED_LANGUAGES.find((lang) => lang.id === 'javascript')?.defaultCode || '',
  )
  const [scratchpadExecuting, setScratchpadExecuting] = useState(false)
  const [scratchpadOutput, setScratchpadOutput] = useState<ExecutionResult | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [showAI, setShowAI] = useState(false)

  // Subscribe to trainer's updates
  useEffect(() => {
    if (!lectureId) return

    // Load initial snapshot
    const snapshot = getCurrentSnapshot(lectureId)
    if (snapshot) {
      updateTrainerView(snapshot)
    }

    // Subscribe to live updates
    const unsubscribe = subscribeToEvents(lectureId, (event) => {
      console.log('[Student] Received event:', event.type)
      setLastUpdate(new Date())

      if (event.type === 'code_saved') {
        updateTrainerView(event.data)
        // Show notification badge if not on trainer tab
        if (activeTab !== 'trainer') {
          setHasNewTrainerUpdate(true)
        }
      } else if (event.type === 'execution_completed') {
        setTrainerOutput(event.data)
        if (activeTab !== 'trainer') {
          setHasNewTrainerUpdate(true)
        }
      }
    })

    return unsubscribe
  }, [lectureId, activeTab])

  const updateTrainerView = (snapshot: CodeSnapshot) => {
    setTrainerSnapshot(snapshot)
    setTrainerLanguage(snapshot.language)
    setTrainerCode(snapshot.code)
    if (snapshot.executionResult) {
      setTrainerOutput(snapshot.executionResult)
    }
  }

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab)
    if (tab === 'trainer') {
      setHasNewTrainerUpdate(false)
    }
  }

  const handleScratchpadRun = async (code: string, input?: string) => {
    setScratchpadExecuting(true)
    setScratchpadOutput(null)

    try {
      const result = await executeCode(scratchpadLanguage, code, input)
      setScratchpadOutput(result)
    } catch (error) {
      console.error('Scratchpad execution error:', error)
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
    if (lang) {
      setScratchpadCode(lang.defaultCode)
    }
    setScratchpadOutput(null)
  }

  // Prevent copying trainer's code
  const preventCopy = (e: React.ClipboardEvent) => {
    e.preventDefault()
    console.log('💡 Tip: Type the code yourself to learn better!')
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden">
      {/* Header with Tabs */}
      <header className="flex flex-col border-b bg-card">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-2 w-2 rounded-full bg-blue-500" aria-hidden="true" />
            <h1 className="text-sm font-medium">
              Live Lecture: <span className="font-mono">{lectureId}</span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {lastUpdate && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <RefreshCw className="h-3 w-3" />
                <span>Last update: {lastUpdate.toLocaleTimeString()}</span>
              </div>
            )}

            <span className="rounded-md bg-blue-500/20 px-2 py-1 text-[10px] font-medium text-blue-500">
              STUDENT
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 pb-0">
          {/* Trainer Tab */}
          <button
            onClick={() => handleTabChange('trainer')}
            className={`relative flex items-center gap-2 rounded-t-lg border-x border-t px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'trainer'
                ? 'bg-primary/10 text-primary border-primary/30'
                : 'bg-muted/30 text-muted-foreground hover:bg-muted/50 border-transparent'
            }`}
          >
            <Eye className="h-4 w-4" />
            <span>Trainer's Code</span>
            {hasNewTrainerUpdate && activeTab !== 'trainer' && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white animate-pulse">
                !
              </span>
            )}
          </button>

          {/* Scratchpad Tab */}
          <button
            onClick={() => handleTabChange('scratchpad')}
            className={`flex items-center gap-2 rounded-t-lg border-x border-t px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'scratchpad'
                ? 'bg-success/10 text-success border-success/30'
                : 'bg-muted/30 text-muted-foreground hover:bg-muted/50 border-transparent'
            }`}
          >
            <Code className="h-4 w-4" />
            <span>Your Scratchpad</span>
          </button>
        </div>
      </header>

      {/* Tab Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* TRAINER TAB CONTENT */}
        {activeTab === 'trainer' && (
          <div className="flex flex-1 gap-2 overflow-hidden p-2">
            {/* Trainer's code - Non-selectable & Non-copyable */}
            <div className="flex flex-1 flex-col rounded-lg border border-primary/50 bg-card overflow-hidden select-none">
              <div className="flex items-center justify-between border-b bg-primary/10 px-3 py-1.5">
                <div className="flex items-center gap-2">
                  <Eye className="h-3 w-3 text-primary" />
                  <h2 className="text-xs font-medium text-primary">
                    Trainer's Code (View Only - Type to Learn!)
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">
                    {trainerLanguage.toUpperCase()}
                  </span>
                  <span className="text-[10px] text-primary/60 italic">
                    ⚠️ Type it yourself to learn
                  </span>
                </div>
              </div>
              <div
                className="flex-1 select-none"
                style={{ userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none' }}
                onCopy={preventCopy}
                onCut={preventCopy}
              >
                <LiveCodePlayground
                  language={trainerLanguage}
                  code={trainerCode || '// Waiting for trainer...'}
                  onChange={() => {}}
                  onRun={() => {}}
                  readOnly={true}
                  executing={false}
                  theme="vs-dark"
                />
              </div>
            </div>

            {/* Trainer's output */}
            <div className="flex w-80 flex-col rounded-lg border border-primary/50 bg-card overflow-hidden">
              <div className="border-b bg-primary/10 px-3 py-1.5">
                <h2 className="text-xs font-medium text-primary">Trainer's Output</h2>
              </div>
              <OutputPanel
                result={trainerOutput}
                executing={false}
                onClear={() => setTrainerOutput(null)}
              />
            </div>
          </div>
        )}

        {/* SCRATCHPAD TAB CONTENT */}
        {activeTab === 'scratchpad' && (
          <div className="flex flex-1 gap-2 overflow-hidden p-2">
            {/* Student's scratchpad */}
            <div
              className={`flex flex-1 flex-col rounded-lg border border-success/50 bg-card overflow-hidden ${showAI ? 'max-w-[50%]' : ''}`}
            >
              <div className="flex items-center justify-between border-b bg-success/10 px-3 py-1.5">
                <div className="flex items-center gap-2">
                  <Code className="h-3 w-3 text-success" />
                  <h2 className="text-xs font-medium text-success">Your Private Scratchpad</h2>
                </div>
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
                showAIHelper={true}
                onAIRequest={() => setShowAI(true)}
                theme="vs-dark"
              />
            </div>

            {/* AI Assistant Panel (conditional) */}
            {showAI && (
              <div className="flex w-[35%] flex-col">
                <AIAssistantPanel
                  role="student"
                  lectureId={lectureId}
                  language={scratchpadLanguage}
                  code={scratchpadCode}
                  output={scratchpadOutput?.stdout || scratchpadOutput?.stderr}
                  onClose={() => setShowAI(false)}
                  onInsertCode={(newCode) => {
                    setScratchpadCode(newCode)
                    setShowAI(false)
                  }}
                />
              </div>
            )}

            {/* Student's output */}
            <div
              className={`flex flex-col rounded-lg border border-success/50 bg-card overflow-hidden ${showAI ? 'w-64' : 'w-80'}`}
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
          </div>
        )}
      </div>
    </div>
  )
}
