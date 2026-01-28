'use client'

import React, { useState } from 'react'
import { LiveCodePlayground, SUPPORTED_LANGUAGES } from '@/components/LiveCodePlayground'
import { OutputPanel } from '@/components/LiveCodePlayground/OutputPanel'
import { AIAssistantPanel } from '@/components/AIAssistant'
import { Save, CheckCircle } from 'lucide-react'
import type { ExecutionResult } from '@/services/codeExecution'

interface TrainerViewProps {
  lectureId: string
  language: string
  onLanguageChange: (language: string) => void
  code: string
  onCodeChange: (code: string) => void
  onRun: (code: string, input?: string) => void
  executing: boolean
  executionResult: ExecutionResult | null
  onClearOutput: () => void
  lastSavedAt: Date | null
  showSaveSuccess: boolean
}

export function TrainerView({
  lectureId,
  language,
  onLanguageChange,
  code,
  onCodeChange,
  onRun,
  executing,
  executionResult,
  onClearOutput,
  lastSavedAt,
  showSaveSuccess,
}: TrainerViewProps) {
  const [showAI, setShowAI] = useState(false)

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden">
      {/* Compact header bar */}
      <header className="flex items-center justify-between border-b bg-card px-4 py-2">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-2 w-2 rounded-full bg-success" aria-hidden="true" />
          <h1 className="text-sm font-medium">
            Live Lecture: <span className="font-mono">{lectureId}</span>
          </h1>
        </div>

        {/* Language Selector & Save Status */}
        <div className="flex items-center gap-3">
          <select
            value={language}
            onChange={(e) => onLanguageChange(e.target.value)}
            className="rounded-md border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.id} value={lang.id}>
                {lang.name}
              </option>
            ))}
          </select>

          {/* Save Status Indicator */}
          {showSaveSuccess && (
            <div className="flex items-center gap-1.5 rounded-md bg-success/20 px-2 py-1 text-xs text-success animate-in fade-in">
              <CheckCircle className="h-3 w-3" />
              <span>Saved & Broadcast</span>
            </div>
          )}

          {lastSavedAt && !showSaveSuccess && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Save className="h-3 w-3" />
              <span>Last saved: {lastSavedAt.toLocaleTimeString()}</span>
            </div>
          )}

          <span className="rounded-md bg-primary/20 px-2 py-1 text-[10px] font-medium text-primary">
            TRAINER
          </span>
        </div>
      </header>

      {/* Main content area - three panels */}
      <div className="flex flex-1 gap-2 overflow-hidden p-2">
        {/* Left: Code editor panel */}
        <div className={`flex flex-1 flex-col rounded-lg border bg-card overflow-hidden ${showAI ? 'max-w-[50%]' : ''}`}>
          <LiveCodePlayground
            language={language}
            code={code}
            onChange={onCodeChange}
            onRun={onRun}
            executing={executing}
            showAIHelper={true}
            onAIRequest={() => setShowAI(true)}
            theme="vs-dark"
          />
        </div>

        {/* AI Assistant Panel (conditional) */}
        {showAI && (
          <div className="flex w-[35%] flex-col">
            <AIAssistantPanel
              role="trainer"
              lectureId={lectureId}
              language={language}
              code={code}
              output={executionResult?.stdout || executionResult?.stderr}
              onClose={() => setShowAI(false)}
              onInsertCode={(newCode) => {
                onCodeChange(newCode)
                setShowAI(false)
              }}
            />
          </div>
        )}

        {/* Right side: Output + Participants stacked */}
        <div className={`flex flex-col gap-2 ${showAI ? 'w-64' : 'w-80'}`}>
          {/* Output panel */}
          <div className="flex flex-1 flex-col rounded-lg border bg-card overflow-hidden">
            <div className="border-b bg-muted/30 px-3 py-1.5">
              <h2 className="text-xs font-medium">Output</h2>
            </div>
            <OutputPanel result={executionResult} executing={executing} onClear={onClearOutput} />
          </div>

          {/* Participants / Metadata panel */}
          <div className="flex flex-1 flex-col rounded-lg border bg-card overflow-hidden">
            <div className="border-b bg-muted/30 px-3 py-1.5">
              <h2 className="text-xs font-medium">Lecture Details</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <div className="space-y-2 text-xs">
                <div>
                  <span className="font-medium">Lecture:</span> {lectureId}
                </div>
                <div>
                  <span className="font-medium">Language:</span> {language}
                </div>
                {lastSavedAt && (
                  <div className="pt-2">
                    <span className="font-medium">Last Saved:</span>
                    <p className="text-muted-foreground">{lastSavedAt.toLocaleString()}</p>
                  </div>
                )}
                <div className="pt-2 text-muted-foreground">
                  <p className="text-success">✓ Monaco Editor (34 languages)</p>
                  <p className="text-success">✓ Real code execution</p>
                  <p className="text-success">✓ Save on Run</p>
                  <p className="text-warning">⚡ Broadcast to students</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

