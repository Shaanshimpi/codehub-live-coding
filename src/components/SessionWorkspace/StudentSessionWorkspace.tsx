'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { FileExplorer } from '@/components/Workspace/FileExplorer'
import { WorkspaceEditor } from '@/components/Workspace/WorkspaceEditor'
import { OutputPanel } from '@/components/LiveCodePlayground/OutputPanel'
import { AIAssistantPanel } from '@/components/AIAssistant'
import { executeCode, type ExecutionResult } from '@/services/codeExecution'
import { SUPPORTED_LANGUAGES } from '@/components/LiveCodePlayground/types'
import { Radio, Sparkles, Eye, File, CheckCircle, Loader2, Save, ArrowLeft, Bell, RefreshCw } from 'lucide-react'
import { cn } from '@/utilities/ui'
import { FileSelectionModal } from '@/components/Session/FileSelectionModal'

type WorkspaceFile = {
  id: string
  name: string
  content: string
}

type ActiveTab = 'trainer' | 'mycode'

interface StudentSessionWorkspaceProps {
  sessionCode: string
  sessionTitle: string
  sessionActive: boolean
}

export function StudentSessionWorkspace({
  sessionCode,
  sessionTitle,
  sessionActive,
}: StudentSessionWorkspaceProps) {
  // Tab state
  const [activeTab, setActiveTab] = useState<ActiveTab>('trainer')
  const [hasNewTrainerUpdate, setHasNewTrainerUpdate] = useState(false)

  // Trainer's file (read-only)
  const [trainerFile, setTrainerFile] = useState<WorkspaceFile | null>(null)
  const [trainerLanguage, setTrainerLanguage] = useState('javascript')
  const [trainerExecuting, setTrainerExecuting] = useState(false)
  const [trainerExecutionResult, setTrainerExecutionResult] = useState<ExecutionResult | null>(null)
  const [trainerCode, setTrainerCode] = useState('')
  const [trainerOutput, setTrainerOutput] = useState<ExecutionResult | null>(null)
  const [trainerFileName, setTrainerFileName] = useState<string>('')

  // Student's file (editable)
  const [selectedFile, setSelectedFile] = useState<WorkspaceFile | null>(null)
  const [code, setCode] = useState('')
  const [language, setLanguage] = useState('javascript')
  const [executing, setExecuting] = useState(false)
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null)
  const [showAI, setShowAI] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [refreshingTrainerCode, setRefreshingTrainerCode] = useState(false)
  const [showFileModal, setShowFileModal] = useState(false)
  const [activeFileId, setActiveFileId] = useState<string | null>(null)
  const [activeFileName, setActiveFileName] = useState<string>('')
  const [savingCode, setSavingCode] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [switchingFile, setSwitchingFile] = useState(false)
  const [lastSavedCode, setLastSavedCode] = useState<string>('') // Track last saved code to enable/disable Run button

  /**
   * Legacy behavior (requested):
   * - Student should NOT auto-sync trainer code.
   * - Student only updates trainer code/output when they click Refresh.
   *
   * Also: student must not call `/api/files/:id` for trainer files because that endpoint is
   * owner-protected and will 403 for non-owners.
   */
  const fetchTrainerMeta = useCallback(async () => {
    if (!sessionCode) return

    try {
      const res = await fetch(`/api/sessions/${sessionCode}/live`, { cache: 'no-store' })
      if (!res.ok) return

      const data = await res.json()
      setTrainerFileName(data.trainerWorkspaceFileName || '')

      // Set trainer language from API response
      if (data.language) {
        setTrainerLanguage(String(data.language))
      } else if (data.trainerWorkspaceFileName) {
        // Fallback: infer language from file extension
        const fileName = String(data.trainerWorkspaceFileName)
        const parts = fileName.split('.')
        if (parts.length > 1) {
          const ext = parts[parts.length - 1].toLowerCase()
          const byExt = SUPPORTED_LANGUAGES.find((lang) => lang.extension.replace('.', '') === ext)
          if (byExt) {
            setTrainerLanguage(byExt.id)
          }
        }
      }

      if (data.trainerWorkspaceFileId) {
        const fileIdStr = String(data.trainerWorkspaceFileId)
        setTrainerFile((prev) => ({
          id: fileIdStr,
          name: data.trainerWorkspaceFileName || prev?.name || 'Trainer File',
          content: '',
        }))
      } else {
        setTrainerFile(null)
      }
    } catch (error) {
      console.error('Failed to fetch trainer meta:', error)
    }
  }, [sessionCode])

  const handleRefreshTrainerCode = useCallback(async () => {
    if (!sessionCode) return

    setRefreshingTrainerCode(true)
    try {
      const res = await fetch(`/api/sessions/${sessionCode}/live`, { cache: 'no-store' })
      if (!res.ok) return

      const data = await res.json()
      // `/api/sessions/[code]/live` returns { code, output, trainerWorkspaceFileId, trainerWorkspaceFileName, language, ... }
      
      // Update trainer language FIRST (before code) to ensure language is always updated
      // Priority: 1) API language, 2) Infer from file name, 3) Keep current if neither works
      if (data.language) {
        setTrainerLanguage(String(data.language))
      } else if (data.trainerWorkspaceFileName) {
        // Fallback: infer language from file extension
        const fileName = String(data.trainerWorkspaceFileName)
        const parts = fileName.split('.')
        if (parts.length > 1) {
          const ext = parts[parts.length - 1].toLowerCase()
          const byExt = SUPPORTED_LANGUAGES.find((lang) => lang.extension.replace('.', '') === ext)
          if (byExt) {
            setTrainerLanguage(byExt.id)
          }
        }
      }
      // If neither works, keep current language (don't reset to default)
      
      // Update code and other data
      setTrainerFileName(data.trainerWorkspaceFileName || '')
      setTrainerCode(data.code || '')
      setTrainerOutput(data.output || null)

      if (data.trainerWorkspaceFileId) {
        const fileIdStr = String(data.trainerWorkspaceFileId)
        setTrainerFile({
          id: fileIdStr,
          name: data.trainerWorkspaceFileName || 'Trainer File',
          content: '',
        })
      } else {
        setTrainerFile(null)
      }

      setLastUpdate(new Date())
      if (activeTab !== 'trainer') {
        setHasNewTrainerUpdate(true)
      }
    } catch (error) {
      console.error('Failed to refresh trainer code:', error)
    } finally {
      setRefreshingTrainerCode(false)
    }
  }, [sessionCode, activeTab])

  // On mount, fetch just metadata so student can see trainer selected file name (without syncing code).
  useEffect(() => {
    void fetchTrainerMeta()
  }, [fetchTrainerMeta])

  // Load student's active file from session on mount
  useEffect(() => {
    const loadActiveFile = async () => {
      try {
        const res = await fetch(`/api/sessions/${sessionCode}/live`, { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          // Check if student has a saved workspace file in their scratchpad
          // This would be in studentScratchpads, but we'll check on first sync
          // For now, show modal if no file selected
          if (!selectedFile) {
            setShowFileModal(true)
          }
        }
      } catch (error) {
        console.error('Failed to load active file:', error)
        setShowFileModal(true)
      }
    }
    loadActiveFile()
  }, [sessionCode])

  const saveCurrentFile = useCallback(async (): Promise<boolean> => {
    if (!selectedFile || !sessionCode) return false

    try {
      // Save to workspace file
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

      // Sync to session scratchpad
      const syncRes = await fetch(`/api/sessions/${sessionCode}/scratchpad`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          workspaceFileId: selectedFile.id,
          workspaceFileName: selectedFile.name,
          language: language,
        }),
      })

      if (!syncRes.ok) {
        throw new Error('Failed to sync to session')
      }

      return true
    } catch (error) {
      console.error('Failed to save:', error)
      return false
    }
  }, [selectedFile, code, language, sessionCode])

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

  // Auto-save and sync disabled - only manual save via button click
  // Removed periodic auto-sync to reduce API calls

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
        setTimeout(() => setSaveSuccess(false), 3000)
        setRefreshKey((prev) => prev + 1)
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

      // Sync output to session
      await fetch(`/api/sessions/${sessionCode}/scratchpad`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          workspaceFileId: selectedFile?.id,
          workspaceFileName: selectedFile?.name,
          language: language,
          output: result,
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

  const handleRunTrainerCode = async (currentCode: string, input?: string) => {
    setTrainerExecuting(true)
    setTrainerExecutionResult(null)

    try {
      const result = await executeCode(trainerLanguage, currentCode, input)
      setTrainerExecutionResult(result)
      setTrainerOutput(result) // Also update trainerOutput for consistency
    } catch (error) {
      console.error('Execution error:', error)
      const errorResult: ExecutionResult = {
        stdout: '',
        stderr: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 'error',
        exitCode: 1,
      }
      setTrainerExecutionResult(errorResult)
      setTrainerOutput(errorResult)
    } finally {
      setTrainerExecuting(false)
    }
  }

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab)
    if (tab === 'trainer') {
      setHasNewTrainerUpdate(false)
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
            {trainerFileName && (
              <span className="text-xs text-muted-foreground">Trainer: {trainerFileName}</span>
            )}
            {activeFileName && (
              <span className="text-xs text-primary font-medium">My file: {activeFileName}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {lastUpdate && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>Last update: {lastUpdate.toLocaleTimeString()}</span>
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
        </div>
      </header>

      {!sessionActive && (
        <div className="border-b bg-destructive/10 px-4 py-2 text-xs text-destructive">
          This session has ended. You can no longer sync your code.
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex border-b bg-muted/30">
        <button
          onClick={() => handleTabChange('trainer')}
          className={cn(
            "flex items-center gap-2 px-4 py-2 text-xs font-medium transition-colors border-b-2",
            activeTab === 'trainer'
              ? "border-primary text-primary bg-background"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Eye className="h-3 w-3" />
          Trainer's Code
          {hasNewTrainerUpdate && (
            <Bell className="h-3 w-3 text-primary animate-pulse" />
          )}
        </button>
        <button
          onClick={() => handleTabChange('mycode')}
          className={cn(
            "flex items-center gap-2 px-4 py-2 text-xs font-medium transition-colors border-b-2",
            activeTab === 'mycode'
              ? "border-primary text-primary bg-background"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <File className="h-3 w-3" />
          My Code
        </button>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {activeTab === 'trainer' ? (
          /* Trainer's Code View (Read-only) */
          <>
            <div className="flex flex-1 flex-col overflow-hidden">
              {trainerFile ? (
                <>
                  <div className="flex items-center justify-between border-b bg-muted/30 px-3 py-1.5">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                        TRAINER (Read-only)
                      </span>
                      <span className="text-xs text-muted-foreground">File:</span>
                      <span className="text-xs font-medium text-primary flex items-center gap-1">
                        <File className="h-3 w-3" />
                        {trainerFileName}
                      </span>
                      <select
                        value={trainerLanguage}
                        disabled
                        className="ml-2 rounded-md border bg-muted px-2 py-0.5 text-[10px] opacity-50"
                      >
                        {SUPPORTED_LANGUAGES.map((lang) => (
                          <option key={lang.id} value={lang.id}>
                            {lang.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={handleRefreshTrainerCode}
                      disabled={refreshingTrainerCode || !sessionActive}
                      className={cn(
                        "flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-medium transition-colors",
                        refreshingTrainerCode || !sessionActive
                          ? "opacity-50 cursor-not-allowed bg-muted text-muted-foreground"
                          : "bg-background text-foreground hover:bg-muted"
                      )}
                      title="Refresh trainer's code"
                    >
                      <RefreshCw className={cn("h-3 w-3", refreshingTrainerCode && "animate-spin")} />
                      Refresh
                    </button>
                  </div>
                  <WorkspaceEditor
                    fileId={trainerFile.id}
                    fileName={trainerFile.name}
                    code={trainerCode}
                    language={trainerLanguage}
                    onLanguageChange={() => {}} // Disabled
                    onChange={() => {}} // Read-only
                    onRun={handleRunTrainerCode}
                    executing={trainerExecuting}
                    executionResult={trainerExecutionResult || trainerOutput}
                    onSave={handleFileSaved}
                    readOnly={true}
                    runDisabled={false} // Allow running trainer's code
                    allowRunInReadOnly={true} // Show Run button even in read-only mode
                  />
                </>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center space-y-4">
                    <p className="text-muted-foreground">Trainer hasn't selected a file yet</p>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Output Panel */}
            <div className="flex flex-col gap-2 border-l bg-muted/30 p-2 w-80">
              <div className="flex flex-1 flex-col rounded-lg border bg-card overflow-hidden">
                <div className="border-b bg-muted/30 px-3 py-1.5">
                  <h2 className="text-xs font-medium">Output</h2>
                </div>
                <OutputPanel
                  result={trainerExecutionResult || trainerOutput}
                  executing={trainerExecuting}
                  onClear={() => {
                    setTrainerOutput(null)
                    setTrainerExecutionResult(null)
                  }}
                />
              </div>
            </div>
          </>
        ) : (
          /* Student's Code View (Editable) */
          <div className="flex flex-1 overflow-hidden">
            {/* Left: File Explorer */}
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

            {/* Center: Editor */}
            <div className={`flex flex-1 flex-col overflow-hidden ${showAI ? 'max-w-[50%]' : ''}`}>
              {selectedFile ? (
                <>
                  <div className="flex items-center justify-between border-b bg-muted/30 px-3 py-1.5">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success">
                        MY CODE
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

            {/* AI Assistant Panel */}
            {showAI && selectedFile && (
              <div className="w-[35%] border-l bg-muted/30 p-2">
                <AIAssistantPanel
                  role="student"
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
        )}
      </div>

      {/* File Selection Modal */}
      <FileSelectionModal
        isOpen={showFileModal}
        onSelect={handleFileSelectFromModal}
        onClose={() => {
          if (!selectedFile) {
            const confirmed = window.confirm(
              'A file is required to save your work. Are you sure you want to cancel?'
            )
            if (!confirmed) {
              return
            }
          }
          setShowFileModal(false)
        }}
      />
    </div>
  )
}

