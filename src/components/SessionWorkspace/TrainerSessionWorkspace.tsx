'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { FileExplorer } from '@/components/Workspace/FileExplorer'
import { WorkspaceEditor } from '@/components/Workspace/WorkspaceEditor'
import { OutputPanel } from '@/components/LiveCodePlayground/OutputPanel'
import { AIAssistantPanel } from '@/components/AIAssistant'
import { executeCode, type ExecutionResult } from '@/services/codeExecution'
import { SUPPORTED_LANGUAGES } from '@/components/LiveCodePlayground/types'
import { Radio, RefreshCw, Sparkles, X, Users, ChevronDown, ChevronUp, Loader2, Save, File, CheckCircle, ArrowLeft, Folder, Terminal } from 'lucide-react'
import { cn } from '@/utilities/ui'
import { FileSelectionModal } from '@/components/Session/FileSelectionModal'

type WorkspaceFile = {
  id: string
  name: string
  content: string
}

interface TrainerSessionWorkspaceProps {
  sessionCode: string
  sessionTitle: string
  participantCount: number
  sessionActive: boolean
  onEndSession: () => void
  students: Array<{
    userId: string
    name: string
    code: string
    language: string
    updatedAt: string | null
    output: any | null
    workspaceFileId: string | null
    workspaceFileName: string | null
  }>
  onRefreshStudents: () => void
  refreshingStudents: boolean
  refreshStudentsSuccess: boolean
  expandedStudentIds: Set<string>
  onToggleStudent: (userId: string) => void
}

export function TrainerSessionWorkspace({
  sessionCode,
  sessionTitle,
  participantCount,
  sessionActive,
  onEndSession,
  students,
  onRefreshStudents,
  refreshingStudents,
  refreshStudentsSuccess,
  expandedStudentIds,
  onToggleStudent,
}: TrainerSessionWorkspaceProps) {
  const [selectedFile, setSelectedFile] = useState<WorkspaceFile | null>(null)
  const [code, setCode] = useState('')
  const [language, setLanguage] = useState('javascript')
  const [executing, setExecuting] = useState(false)
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null)
  const [showAI, setShowAI] = useState(false)
  const [showStudents, setShowStudents] = useState(false)
  const [showFileExplorer, setShowFileExplorer] = useState(true)
  const [showOutput, setShowOutput] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [showFileModal, setShowFileModal] = useState(false)
  const [activeFileId, setActiveFileId] = useState<string | null>(null)
  const [activeFileName, setActiveFileName] = useState<string>('')
  const [savingCode, setSavingCode] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [switchingFile, setSwitchingFile] = useState(false)
  const [lastSavedCode, setLastSavedCode] = useState<string>('') // Track last saved code to enable/disable Run button

  // Load active file from session on mount
  useEffect(() => {
    const loadActiveFile = async () => {
      try {
        const res = await fetch(`/api/sessions/${sessionCode}/live`, { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          if (data.trainerWorkspaceFileId) {
            // Fetch file content
            const fileRes = await fetch(`/api/files/${data.trainerWorkspaceFileId}`, {
              credentials: 'include',
            })
            if (fileRes.ok) {
              const fileData = await fileRes.json()
              // Ensure fileId is a string (Payload returns numbers)
              const fileIdStr = String(fileData.id)
              setSelectedFile({
                id: fileIdStr,
                name: fileData.name,
                content: fileData.content || '',
              })
              setActiveFileId(fileIdStr)
              setActiveFileName(fileData.name)
              
              // Infer language from extension if not provided
              if (fileData.language) {
                setLanguage(fileData.language)
              } else {
                const parts = fileData.name.split('.')
                const ext = parts.length > 1 ? parts.pop()!.toLowerCase() : ''
                if (ext) {
                  const byExt = SUPPORTED_LANGUAGES.find((lang) => lang.extension.replace('.', '') === ext)
                  if (byExt) {
                    setLanguage(byExt.id)
                  }
                }
              }
            }
          } else {
            // No file selected - show modal
            setShowFileModal(true)
          }
        }
      } catch (error) {
        console.error('Failed to load active file:', error)
        // Show modal if load fails - file might not exist or user doesn't have access
        setShowFileModal(true)
      }
    }
    loadActiveFile()
  }, [sessionCode])

  // Update code when file changes
  useEffect(() => {
    if (selectedFile) {
      const fileContent = selectedFile.content || ''
      setCode(fileContent)
      setLastSavedCode(fileContent) // Mark as saved when file is loaded
      const parts = selectedFile.name.split('.')
      const ext = parts.length > 1 ? parts.pop()!.toLowerCase() : ''
      if (ext) {
        const byExt = SUPPORTED_LANGUAGES.find((lang) => lang.extension.replace('.', '') === ext)
        if (byExt) {
          setLanguage(byExt.id)
        }
      }
      setActiveFileId(selectedFile.id)
      setActiveFileName(selectedFile.name)
    }
  }, [selectedFile])

  const saveCurrentFile = useCallback(async (): Promise<boolean> => {
    if (!selectedFile || !sessionCode) return false

    try {
      // Save to workspace file - ensure fileId is string
      const fileIdStr = String(selectedFile.id)
      const saveRes = await fetch(`/api/files/${fileIdStr}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: code }),
      })

      if (!saveRes.ok) {
        throw new Error('Failed to save file')
      }

      // Broadcast file ID to session
      const broadcastRes = await fetch(`/api/sessions/${sessionCode}/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          workspaceFileId: selectedFile.id,
          workspaceFileName: selectedFile.name,
          languageSlug: language,
        }),
      })

      if (!broadcastRes.ok) {
        throw new Error('Failed to broadcast')
      }

      return true
    } catch (error) {
      console.error('Failed to save:', error)
      return false
    }
  }, [selectedFile, code, language, sessionCode])

  const handleFileSelect = useCallback(async (file: { id: string; name: string; content: string }) => {
    // Auto-save current file before switching (if changed)
    if (selectedFile && code !== selectedFile.content) {
      setSwitchingFile(true)
      try {
        await saveCurrentFile()
      } catch (error) {
        console.error('Failed to save before switching:', error)
      } finally {
        setSwitchingFile(false)
      }
    }
    
    // Fetch fresh file content
    try {
      const fileRes = await fetch(`/api/files/${file.id}`, { credentials: 'include' })
      if (fileRes.ok) {
        const fileData = await fileRes.json()
        // Ensure fileId is a string
        const fileIdStr = String(fileData.id)
        setSelectedFile({
          id: fileIdStr,
          name: fileData.name,
          content: fileData.content || '',
        })
      } else {
        // Fallback to provided content
        const fileIdStr = String(file.id)
        setSelectedFile({
          id: fileIdStr,
          name: file.name,
          content: file.content,
        })
      }
    } catch (error) {
      console.error('Failed to load file:', error)
      // Fallback to provided content
      const fileIdStr = String(file.id)
      setSelectedFile({
        id: fileIdStr,
        name: file.name,
        content: file.content,
      })
    }
  }, [selectedFile, code, saveCurrentFile])

  const handleFileSelectFromModal = async (
    fileId: string | null,
    fileName: string,
    content: string,
    fileLanguage: string
  ) => {
    if (fileId === null) {
      // File selection is required - keep modal open
      alert('Please select or create a file to continue')
      return
    }

    // Ensure fileId is a string
    const fileIdStr = String(fileId)

    // Try to fetch full file content, but fallback to provided content if fetch fails
    // This handles cases where file was just created and might not be immediately available
    try {
      const res = await fetch(`/api/files/${fileIdStr}`, { credentials: 'include' })
      if (res.ok) {
        const fileData = await res.json()
        const fileContent = fileData.content || ''
        
        // Set selected file immediately
        setSelectedFile({
          id: String(fileData.id),
          name: fileData.name,
          content: fileContent,
        })
        
        // Update code and language immediately (don't wait for useEffect)
        setCode(fileContent)
        if (fileLanguage) {
          setLanguage(fileLanguage)
        } else {
          // Infer language from file extension if not provided
          const parts = fileData.name.split('.')
          const ext = parts.length > 1 ? parts.pop()!.toLowerCase() : ''
          if (ext) {
            const byExt = SUPPORTED_LANGUAGES.find((lang) => lang.extension.replace('.', '') === ext)
            if (byExt) {
              setLanguage(byExt.id)
            }
          }
        }
        setActiveFileId(String(fileData.id))
        setActiveFileName(fileData.name)
      } else {
        // If fetch fails (e.g., file just created), use provided data
        console.warn('Failed to fetch file, using provided data:', res.status)
        setSelectedFile({
          id: fileIdStr,
          name: fileName,
          content: content || '',
        })
        setCode(content || '')
        if (fileLanguage) {
          setLanguage(fileLanguage)
        } else {
          // Infer language from file extension
          const parts = fileName.split('.')
          const ext = parts.length > 1 ? parts.pop()!.toLowerCase() : ''
          if (ext) {
            const byExt = SUPPORTED_LANGUAGES.find((lang) => lang.extension.replace('.', '') === ext)
            if (byExt) {
              setLanguage(byExt.id)
            }
          }
        }
        setActiveFileId(fileIdStr)
        setActiveFileName(fileName)
      }
    } catch (error) {
      // If fetch fails, use provided data (file was likely just created)
      console.warn('Failed to fetch file, using provided data:', error)
      setSelectedFile({
        id: fileIdStr,
        name: fileName,
        content: content || '',
      })
      setCode(content || '')
      if (fileLanguage) {
        setLanguage(fileLanguage)
      } else {
        // Infer language from file extension
        const parts = fileName.split('.')
        const ext = parts.length > 1 ? parts.pop()!.toLowerCase() : ''
        if (ext) {
          const byExt = SUPPORTED_LANGUAGES.find((lang) => lang.extension.replace('.', '') === ext)
          if (byExt) {
            setLanguage(byExt.id)
          }
        }
      }
      setActiveFileId(fileIdStr)
      setActiveFileName(fileName)
    }
    
    // Close modal and refresh explorer regardless of fetch result
    setShowFileModal(false)
    setRefreshKey((prev) => prev + 1)
  }

  const handleSaveCode = useCallback(async () => {
    if (!selectedFile || !sessionCode) {
      alert('Please select a file first')
      return
    }

    setSavingCode(true)
    setSaveSuccess(false)

    try {
      const success = await saveCurrentFile()
      if (success) {
        setLastSavedCode(code) // Update last saved code after successful save
        setLastUpdate(new Date())
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000) // Increased from 2s to 3s
        setRefreshKey((prev) => prev + 1) // Refresh file explorer
      } else {
        alert('Failed to save. Please try again.')
      }
    } catch (error) {
      console.error('Failed to save:', error)
      alert('Failed to save')
    } finally {
      setSavingCode(false)
    }
  }, [selectedFile, sessionCode, saveCurrentFile])

  const handleRun = async (currentCode: string, input?: string) => {
    // Prevent running if there are unsaved changes (button should be disabled, but check as safety)
    if (currentCode !== lastSavedCode) {
      return
    }

    setExecuting(true)
    setExecutionResult(null)

    try {
      const result = await executeCode(language, currentCode, input)
      setExecutionResult(result)
      setLastUpdate(new Date())

      // Broadcast output to session
      await fetch(`/api/sessions/${sessionCode}/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          workspaceFileId: selectedFile?.id,
          workspaceFileName: selectedFile?.name,
          currentOutput: result,
          languageSlug: language,
        }),
      }).catch(() => {})
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

  const handleFileSaved = () => {
    setRefreshKey((prev) => prev + 1)
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden">
      {/* Session Header */}
      <header className="flex items-center justify-between border-b bg-card px-4 py-2">
        <div className="flex items-center gap-3">
          <Radio className="h-4 w-4 text-red-500" />
          <div className="flex flex-col">
            <span className="text-sm font-medium">{sessionTitle}</span>
            <span className="text-[10px] text-muted-foreground">Join code: {sessionCode}</span>
            {activeFileName && (
              <span className="text-xs text-primary font-medium">Active: {activeFileName}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* File Explorer Toggle */}
          <button
            onClick={() => setShowFileExplorer(!showFileExplorer)}
            className={`flex items-center justify-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
              showFileExplorer
                ? 'bg-card hover:bg-accent'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
            title={showFileExplorer ? 'Hide File Explorer' : 'Show File Explorer'}
          >
            <Folder className="h-3 w-3" />
          </button>
          {/* Output Toggle */}
          <button
            onClick={() => setShowOutput(!showOutput)}
            className={`flex items-center justify-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
              showOutput
                ? 'bg-card hover:bg-accent'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
            title={showOutput ? 'Hide Output' : 'Show Output'}
          >
            <Terminal className="h-3 w-3" />
          </button>
          {/* AI Help Toggle */}
          {selectedFile && (
            <button
              onClick={() => setShowAI(!showAI)}
              className={`flex items-center justify-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                showAI
                  ? 'bg-card hover:bg-accent'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
              title={showAI ? 'Hide AI Help' : 'Show AI Help'}
            >
              <Sparkles className="h-3 w-3" />
            </button>
          )}
          <button
            onClick={() => setShowStudents((prev) => !prev)}
            className="flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-xs hover:bg-accent transition-colors"
          >
            <Users className="h-3 w-3" />
            <span>{participantCount} students</span>
            {showStudents ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          {lastUpdate && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground" suppressHydrationWarning>
              <RefreshCw className="h-3 w-3" />
              <span>Last broadcast: {lastUpdate.toLocaleTimeString()}</span>
            </div>
          )}
          {!sessionActive && (
            <Link
              href="/workspace"
              className="flex items-center gap-1.5 rounded-md border bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <ArrowLeft className="h-3 w-3" />
              Back to Workspace
            </Link>
          )}
          <button
            onClick={onEndSession}
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

      {/* Students Panel */}
      {showStudents && (
        <div className="border-b bg-muted/30 px-4 py-2 max-h-[40vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-medium">Students&apos; Scratchpads</h3>
            <button
              onClick={onRefreshStudents}
              disabled={refreshingStudents}
              className={cn(
                "flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors",
                refreshStudentsSuccess 
                  ? "bg-green-500/20 border-green-500 text-green-700 dark:text-green-400" 
                  : "bg-background hover:bg-accent",
                refreshingStudents && "opacity-50 cursor-not-allowed"
              )}
              title="Refresh students list"
            >
              {refreshingStudents ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
              <span>{refreshStudentsSuccess ? 'Refreshed!' : 'Refresh'}</span>
            </button>
          </div>
          {students.length === 0 ? (
            <div className="text-xs text-muted-foreground space-y-1">
              <p>No students have started coding yet.</p>
              <p className="text-[10px]">Students will appear here once they join and start coding.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {students.map((student) => {
                const isExpanded = expandedStudentIds.has(student.userId)
                return (
                  <div key={student.userId} className="border rounded-md bg-card">
                    <button
                      onClick={() => onToggleStudent(student.userId)}
                      className="w-full flex items-center justify-between p-2 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium">{student.name}</span>
                        {student.workspaceFileName && (
                          <span className="text-[10px] text-primary/70 font-medium">
                            📁 {student.workspaceFileName}
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground" suppressHydrationWarning>
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

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: File Explorer */}
        {showFileExplorer && (
          <div className="w-64 border-r bg-muted/30 overflow-hidden">
            {switchingFile && (
              <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
                <div className="flex items-center gap-2 bg-card border rounded-md px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-xs">Saving current file...</span>
                </div>
              </div>
            )}
            <FileExplorer
              key={refreshKey}
              onFileSelect={handleFileSelect}
              selectedFileId={activeFileId || undefined}
              onFileSaved={handleFileSaved}
            />
          </div>
        )}

        {/* Center: Editor */}
        <div
          className={`flex flex-1 flex-col overflow-hidden ${
            showAI
              ? showFileExplorer && showOutput
                ? 'max-w-[50%]'
                : 'max-w-[65%]'
              : ''
          }`}
        >
          {selectedFile ? (
            <>
              {/* Editor Header with Active File Indicator */}
              <div className="flex items-center justify-between border-b bg-muted/30 px-3 py-1.5">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                    TRAINER
                  </span>
                  <span className="text-xs text-muted-foreground">Active:</span>
                  <span className="text-xs font-medium text-primary flex items-center gap-1">
                    <File className="h-3 w-3" />
                    {activeFileName}
                  </span>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="ml-2 rounded-md border bg-background px-2 py-0.5 text-[10px] focus:outline-none focus:ring-1 focus:ring-ring"
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
                        <CheckCircle className="h-3 w-3" />
                        Saved!
                      </>
                    ) : (
                      <>
                        <Save className="h-3 w-3" />
                        Save & Sync
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setShowAI(!showAI)}
                    className="flex items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-xs hover:bg-accent transition-colors"
                  >
                    <Sparkles className="h-3 w-3" />
                    {showAI ? 'Hide AI' : 'AI Help'}
                  </button>
                </div>
              </div>
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
                hideSaveButton={true}
                runDisabled={code !== lastSavedCode}
              />
            </>
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-center space-y-4">
                <p className="text-muted-foreground">No file selected</p>
                <button
                  onClick={() => setShowFileModal(true)}
                  className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Select or Create File
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Output + AI */}
        {showOutput && (
          <div className={`flex flex-col gap-2 border-l bg-muted/30 p-2 ${showAI ? 'w-64' : 'w-80'}`}>
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

          </div>
        )}

        {/* AI Assistant Panel */}
        {showAI && selectedFile && (
          <div className="w-[35%] border-l bg-muted/30 p-2">
            <AIAssistantPanel
              role="trainer"
              lectureId={sessionCode}
              language={language}
              code={code}
              output={executionResult?.stdout || executionResult?.stderr}
              onClose={() => setShowAI(false)}
              onInsertCode={(newCode) => setCode(newCode)}
            />
          </div>
        )}
      </div>

      {/* File Selection Modal */}
      <FileSelectionModal
        isOpen={showFileModal}
        onSelect={handleFileSelectFromModal}
        onClose={() => {
          // Allow closing, but warn if no file selected (required for session)
          if (!selectedFile) {
            const confirmed = window.confirm(
              'A file is required to start the session. Are you sure you want to cancel? You will need to select a file to continue.'
            )
            if (!confirmed) {
              return // Don't close if user cancels
            }
          }
          setShowFileModal(false)
        }}
      />
    </div>
  )
}

