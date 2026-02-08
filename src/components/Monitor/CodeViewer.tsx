'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { GraduationCap, Users, Clock } from 'lucide-react'
import { LiveCodePlayground } from '@/components/LiveCodePlayground'
import { OutputPanel } from '@/components/LiveCodePlayground/OutputPanel'
import { useTheme } from '@/providers/Theme'
import { executeCode, type ExecutionResult } from '@/services/codeExecution'
import { SUPPORTED_LANGUAGES } from '@/components/LiveCodePlayground/types'

interface User {
  id: string
  name: string
  code: string
  language: string
  updatedAt: string
  output: ExecutionResult | null
  isTrainer?: true | false
}

interface CodeViewerProps {
  user: User | null
}

export function CodeViewer({ user }: CodeViewerProps) {
  const { theme: appTheme } = useTheme()
  const monacoTheme = appTheme === 'dark' ? 'vs-dark' : 'vs'

  // Observer's own state (not synced with user)
  // Code is read-only (synced from user), but language can be changed for execution
  const [code, setCode] = useState<string>('')
  const [language, setLanguage] = useState<string>('javascript')
  const [executing, setExecuting] = useState(false)
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null)

  // Update code and language when user changes
  useEffect(() => {
    if (user) {
      setCode(user.code || '')
      setLanguage(user.language || 'javascript')
      // Clear observer's output when switching users
      setExecutionResult(null)
    }
  }, [user])

  // Keep code synced with user's code (read-only)
  useEffect(() => {
    if (user) {
      setCode(user.code || '')
    }
  }, [user?.code, user])

  const handleRun = useCallback(async (currentCode: string, input?: string) => {
    setExecuting(true)
    setExecutionResult(null)

    try {
      const result = await executeCode(language, currentCode, input)
      setExecutionResult(result)
    } catch (e) {
      console.error('Error running code', e)
      const errorResult: ExecutionResult = {
        stdout: '',
        stderr: e instanceof Error ? e.message : 'Unknown error occurred',
        status: 'error',
        exitCode: 1,
      }
      setExecutionResult(errorResult)
    } finally {
      setExecuting(false)
    }
  }, [language])

  const handleLanguageChange = useCallback((newLanguage: string) => {
    setLanguage(newLanguage)
    // Clear output when changing language
    setExecutionResult(null)
  }, [])

  const handleClearOutput = useCallback(() => {
    setExecutionResult(null)
  }, [])

  if (!user) {
    return (
      <div className="flex h-full items-center justify-center bg-muted/30">
        <div className="text-center space-y-2">
          <Users className="h-12 w-12 mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Select a user from the sidebar to view their code</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header Bar */}
      <div className="border-b bg-muted/30 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {user.isTrainer ? (
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium text-primary">Trainer</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">Student</span>
              </div>
            )}
            <div className="h-4 w-px bg-border" />
            <span className="text-sm font-semibold">{user.name}</span>
            {user.updatedAt && (
              <>
                <div className="h-4 w-px bg-border" />
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span suppressHydrationWarning>
                    Updated {new Date(user.updatedAt).toLocaleTimeString()}
                  </span>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Language:</span>
            <select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="rounded-md border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.id} value={lang.id}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Code Editor - Read-only, but can run with different language */}
      <div className="flex-1 overflow-hidden">
        <LiveCodePlayground
          language={language}
          code={code}
          onChange={() => {}} // Read-only - no changes allowed
          onRun={handleRun}
          readOnly={true}
          theme={monacoTheme}
          height="100%"
          runDisabled={false}
          allowRunInReadOnly={true} // Allow running even when read-only
          executing={executing}
          executionResult={executionResult}
          onStopExecution={() => setExecuting(false)}
        />
      </div>

      {/* Output Panel - Observer's own output */}
      {executionResult && (
        <div className="border-t bg-muted/30">
          <OutputPanel
            result={executionResult}
            executing={executing}
            onClear={handleClearOutput}
          />
        </div>
      )}
    </div>
  )
}

