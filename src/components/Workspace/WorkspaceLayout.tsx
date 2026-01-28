'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Sparkles, Radio } from 'lucide-react'

import { FileExplorer } from './FileExplorer'
import { WorkspaceEditor } from './WorkspaceEditor'
import { OutputPanel } from '@/components/LiveCodePlayground/OutputPanel'
import { AIAssistantPanel } from '@/components/AIAssistant'
import { executeCode, type ExecutionResult } from '@/services/codeExecution'
import { SUPPORTED_LANGUAGES } from '@/components/LiveCodePlayground/types'

type WorkspaceFile = {
  id: string
  name: string
  content: string
}

export function WorkspaceLayout() {
  const [selectedFile, setSelectedFile] = useState<WorkspaceFile | null>(null)
  const [code, setCode] = useState('')
  const [language, setLanguage] = useState('javascript')
  const [executing, setExecuting] = useState(false)
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null)
  const [showAI, setShowAI] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0) // Force file explorer refresh

  // Update code (and infer language from extension) when file changes
  useEffect(() => {
    if (selectedFile) {
      setCode(selectedFile.content || '')
      const parts = selectedFile.name.split('.')
      const ext = parts.length > 1 ? parts.pop()!.toLowerCase() : ''
      if (ext) {
        const byExt = SUPPORTED_LANGUAGES.find((lang) => lang.extension.replace('.', '') === ext)
        if (byExt) {
          setLanguage(byExt.id)
          return
        }
      }
      // fallback
      setLanguage((prev) => prev || 'javascript')
    }
  }, [selectedFile])

  const handleRun = async (currentCode: string, input?: string) => {
    setExecuting(true)
    setExecutionResult(null)

    try {
      const result = await executeCode(language, currentCode, input)
      setExecutionResult(result)
    } catch (error) {
      console.error('Execution error:', error)
      setExecutionResult({
        stdout: '',
        stderr: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 'error',
        exitCode: 1,
      })
    } finally {
      setExecuting(false)
    }
  }

  const handleFileSelect = (file: WorkspaceFile) => {
    setSelectedFile(file)
  }

  const handleFileSaved = () => {
    // Refresh file explorer to show updated file
    setRefreshKey((prev) => prev + 1)
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between border-b bg-card px-4 py-2">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-lg font-semibold">
            CodeHub
          </Link>
          <span className="text-sm text-muted-foreground">Workspace</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/join"
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Radio className="h-4 w-4" />
            Join Live Session
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: File Explorer */}
        <div className="w-64 border-r bg-muted/30 overflow-hidden">
          <FileExplorer
            key={refreshKey}
            onFileSelect={handleFileSelect}
            selectedFileId={selectedFile?.id}
            onFileSaved={handleFileSaved}
          />
        </div>

        {/* Center: Editor */}
        <div className={`flex flex-1 flex-col overflow-hidden ${showAI ? 'max-w-[50%]' : ''}`}>
          {selectedFile ? (
            <WorkspaceEditor
              fileId={selectedFile.id}
              fileName={selectedFile.name}
              code={code}
              language={language}
              onLanguageChange={setLanguage}
              onChange={setCode}
              onRun={handleRun}
              executing={executing}
              onSave={handleFileSaved}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-center space-y-2">
                <p className="text-muted-foreground">No file selected</p>
                <p className="text-sm text-muted-foreground">Select a file from the explorer or create a new one</p>
              </div>
            </div>
          )}
        </div>

        {/* Right: Output + AI */}
        <div className={`flex flex-col gap-2 border-l bg-muted/30 p-2 ${showAI ? 'w-64' : 'w-80'}`}>
          {/* Output Panel */}
          <div className="flex flex-1 flex-col rounded-lg border bg-card overflow-hidden">
            <div className="border-b bg-muted/30 px-3 py-1.5">
              <h2 className="text-xs font-medium">Output</h2>
            </div>
            <OutputPanel
              result={executionResult}
              executing={executing}
              onClear={() => setExecutionResult(null)}
            />
          </div>

          {/* AI Assistant Toggle */}
          {selectedFile && (
            <button
              onClick={() => setShowAI(!showAI)}
              className="flex items-center justify-center gap-2 rounded-md border bg-card px-3 py-2 text-sm font-medium hover:bg-accent transition-colors"
            >
              <Sparkles className="h-4 w-4" />
              {showAI ? 'Hide' : 'Show'} AI Help
            </button>
          )}
        </div>

        {/* AI Assistant Panel */}
        {showAI && selectedFile && (
          <div className="w-[35%] border-l bg-muted/30 p-2">
            <AIAssistantPanel
              role="student"
              lectureId="workspace" // Not a real lecture, but needed for AI
              language={language}
              code={code}
              output={executionResult?.stdout || executionResult?.stderr}
              onClose={() => setShowAI(false)}
              onInsertCode={(newCode) => {
                setCode(newCode)
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

