'use client'

import React, { useState } from 'react'
import { SUPPORTED_LANGUAGES } from '@/components/LiveCodePlayground'
import { executeCode, type ExecutionResult } from '@/services/codeExecution'
import {
  saveCodeSnapshot,
  updateExecutionResult as updateSessionExecutionResult,
  getOrCreateSession,
} from '@/services/liveSessionStore'
import { TrainerView, StudentView } from '@/components/LiveLecture'

type PageProps = {
  params: Promise<{
    lectureId: string
  }>
  searchParams: Promise<{
    role?: 'trainer' | 'student'
  }>
}

export default function LiveLecturePage({ params, searchParams }: PageProps) {
  const [lectureId, setLectureId] = useState<string>('')
  const [role, setRole] = useState<'trainer' | 'student'>('trainer')
  const [language, setLanguage] = useState('javascript')
  const [code, setCode] = useState(
    SUPPORTED_LANGUAGES.find((lang) => lang.id === 'javascript')?.defaultCode || '',
  )
  const [executing, setExecuting] = useState(false)
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [showSaveSuccess, setShowSaveSuccess] = useState(false)

  // Unwrap params and searchParams
  React.useEffect(() => {
    Promise.all([params, searchParams]).then(([p, sp]) => {
      setLectureId(p.lectureId)
      setRole(sp.role || 'trainer')
      // Initialize session
      getOrCreateSession(p.lectureId)
    })
  }, [params, searchParams])

  const handleRun = async (code: string, input?: string) => {
    if (!lectureId) return

    setExecuting(true)
    setExecutionResult(null)

    // Step 1: Save code snapshot (broadcast to students)
    console.log('[Trainer] Saving code snapshot before execution...')
    const snapshot = saveCodeSnapshot(lectureId, code, language)
    setLastSavedAt(snapshot.timestamp)
    setShowSaveSuccess(true)
    setTimeout(() => setShowSaveSuccess(false), 2000) // Hide after 2s

    try {
      // Step 2: Execute code
      console.log('[Trainer] Executing code...')
      const result = await executeCode(language, code, input)
      setExecutionResult(result)

      // Step 3: Update execution result in session (broadcast result to students)
      console.log('[Trainer] Broadcasting execution result...')
      updateSessionExecutionResult(lectureId, result)
    } catch (error) {
      console.error('Execution error:', error)
      const errorResult = {
        stdout: '',
        stderr: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 'error' as const,
        exitCode: 1,
      }
      setExecutionResult(errorResult)
      updateSessionExecutionResult(lectureId, errorResult)
    } finally {
      setExecuting(false)
    }
  }

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage)
    const lang = SUPPORTED_LANGUAGES.find((l) => l.id === newLanguage)
    if (lang) {
      setCode(lang.defaultCode)
    }
    // Clear previous execution result when changing language
    setExecutionResult(null)
  }

  const handleClearOutput = () => {
    setExecutionResult(null)
  }

  // Render student view if role is student
  if (role === 'student') {
    return <StudentView lectureId={lectureId} />
  }

  // Render trainer view
  return (
    <TrainerView
      lectureId={lectureId}
      language={language}
      onLanguageChange={handleLanguageChange}
      code={code}
      onCodeChange={setCode}
      onRun={handleRun}
      executing={executing}
      executionResult={executionResult}
      onClearOutput={handleClearOutput}
      lastSavedAt={lastSavedAt}
      showSaveSuccess={showSaveSuccess}
    />
  )
}

