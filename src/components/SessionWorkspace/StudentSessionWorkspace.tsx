'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { FileExplorer } from '@/components/Workspace/FileExplorer'
import { WorkspaceEditor } from '@/components/Workspace/WorkspaceEditor'
import { OutputPanel } from '@/components/LiveCodePlayground/OutputPanel'
import { AIAssistantPanel } from '@/components/AIAssistant'
import { FolderExplorerView } from '@/components/Workspace/FolderExplorerView'
import { WorkspaceModeToggle } from '@/components/Workspace/WorkspaceModeToggle'
import { WorkspaceModeLayout } from '@/components/Workspace/WorkspaceModeLayout'
import { WorkspaceHeader } from '@/components/Workspace/WorkspaceHeader'
import { NoFileSelectedView } from '@/components/Workspace/NoFileSelectedView'
import { FileExplorerSidebar } from '@/components/Workspace/FileExplorerSidebar'
import { OutputPanelWrapper } from '@/components/Workspace/OutputPanelWrapper'
import { AIAssistantPanelWrapper } from '@/components/Workspace/AIAssistantPanelWrapper'
import { FileSwitchingOverlay } from '@/components/Workspace/FileSwitchingOverlay'
import { WorkspaceEditorHeader } from '@/components/Workspace/WorkspaceEditorHeader'
import { useExplorerData } from '@/hooks/workspace/useExplorerData'
import { useFileSelection } from '@/hooks/workspace/useFileSelection'
import { useSaveCode } from '@/hooks/workspace/useSaveCode'
import { useWorkspaceCodeExecution } from '@/hooks/workspace/useWorkspaceCodeExecution'
import { executeCode, type ExecutionResult } from '@/services/codeExecution'
import { SUPPORTED_LANGUAGES } from '@/components/LiveCodePlayground/types'
import { inferLanguageFromFileName } from '@/utilities/languageInference'
import { WorkspaceViewControls } from '@/components/Workspace/WorkspaceViewControls'
import { ViewToggleButton } from '@/components/Workspace/ViewToggleButton'
import { Radio, Eye, File, ArrowLeft, Bell, RefreshCw, Terminal } from 'lucide-react'
import { cn } from '@/utilities/ui'
import { FileSelectionModal } from '@/components/Session/FileSelectionModal'
import type { BasicFolderRef } from '@/utilities/workspaceScope'
import { buildFolderPathChain } from '@/utilities/workspaceScope'
import type { WorkspaceFileWithContent } from '@/types/workspace'

type WorkspaceFile = WorkspaceFileWithContent

type ActiveTab = 'trainer' | 'mycode'

// Helper function to check if an error is a cancellation error (should be ignored)
function isCancellationError(error: unknown): boolean {
  // Check for standard AbortError from AbortController
  if (error instanceof Error && error.name === 'AbortError') {
    return true
  }
  if (error && typeof error === 'object') {
    if ('type' in error && error.type === 'cancelation') {
      return true
    }
    if ('msg' in error && error.msg === 'operation is manually canceled') {
      return true
    }
  }
  return false
}

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

  // Trainer&apos;s file (read-only)
  const [trainerFile, setTrainerFile] = useState<WorkspaceFile | null>(null)
  const [trainerLanguage, setTrainerLanguage] = useState('javascript')
  const [trainerExecuting, setTrainerExecuting] = useState(false)
  const [trainerExecutionResult, setTrainerExecutionResult] = useState<ExecutionResult | null>(null)
  const [trainerCode, setTrainerCode] = useState('')
  const [trainerOutput, setTrainerOutput] = useState<ExecutionResult | null>(null)
  const [trainerFileName, setTrainerFileName] = useState<string>('')

  // Student's file (editable)
  const [code, setCode] = useState('')
  const [language, setLanguage] = useState('javascript')
  const [showAI, setShowAI] = useState(false)
  const [showFileExplorer, setShowFileExplorer] = useState(true)
  const [showOutput, setShowOutput] = useState(true)
  const [workspaceMode, setWorkspaceMode] = useState<'explorer' | 'workspace'>('workspace')
  const [currentFolderId, setCurrentFolderId] = useState<string | number | null>(null)
  const [refreshingTrainerCode, setRefreshingTrainerCode] = useState(false)
  const [showFileModal, setShowFileModal] = useState(false)
  const [activeFileId, setActiveFileId] = useState<string | null>(null)
  const [activeFileName, setActiveFileName] = useState<string>('')

  // Refs for saveCurrentFile to avoid circular dependency
  const saveCurrentFileRef = useRef<(() => Promise<boolean>) | null>(null)

  // File selection management with auto-save
  const {
    selectedFile,
    handleFileSelect: hookHandleFileSelect,
    handleFileSelectFromModal: hookHandleFileSelectFromModal,
    switchingFile,
    refreshKey,
    setRefreshKey,
  } = useFileSelection({
    sessionCode,
    autoSaveBeforeSwitch: true,
    saveCurrentFile: async () => {
      // Use ref to call the latest saveCurrentFile from useSaveCode
      if (saveCurrentFileRef.current) {
        return await saveCurrentFileRef.current()
      }
      return false
    },
    onFileChanged: (file) => {
      // Update code and language when file changes
      setCode(file.content || '')
      const inferredLanguage = inferLanguageFromFileName(file.name, language || 'javascript')
      setLanguage(inferredLanguage)
      setActiveFileId(file.id)
      setActiveFileName(file.name)
      console.log('[StudentSessionWorkspace] File changed via hook', {
        fileName: file.name,
        inferredLanguage,
        fileId: file.id
      })
    },
  })

  // Save code management with session sync (scratchpad)
  const {
    savingCode,
    saveSuccess,
    lastSavedCode,
    lastUpdate,
    handleSaveCode,
    saveCurrentFile,
  } = useSaveCode({
    selectedFile,
    code,
    language,
    sessionCode,
    sessionSyncType: 'scratchpad',
    onSaveSuccess: () => {
      setRefreshKey((prev) => prev + 1) // Refresh file explorer
    },
  })

  // Update ref so useFileSelection can call the latest saveCurrentFile
  useEffect(() => {
    saveCurrentFileRef.current = saveCurrentFile
  }, [saveCurrentFile])

  // Code execution with session sync (scratchpad)
  const {
    executing,
    executionResult,
    handleRun,
    clearResult,
  } = useWorkspaceCodeExecution({
    language,
    sessionCode,
    selectedFile,
    syncToSession: true,
    sessionSyncType: 'scratchpad',
    lastSavedCode,
  })

  /**
   * Legacy behavior (requested):
   * - Student should NOT auto-sync trainer code.
   * - Student only updates trainer code/output when they click Refresh.
   *
   * Also: student must not call `/api/files/:id` for trainer files because that endpoint is
   * owner-protected and will 403 for non-owners.
   */
  const fetchTrainerMeta = useCallback(async (signal?: AbortSignal) => {
    if (!sessionCode) return

    try {
      const res = await fetch(`/api/sessions/${sessionCode}/live`, { 
        cache: 'no-store',
        signal 
      })
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
      // Ignore cancellation errors (from AbortController or manual cancellation)
      if (isCancellationError(error) || error instanceof Error && error.name === 'AbortError') {
        return
      }
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
        const inferredLanguage = inferLanguageFromFileName(fileName, trainerLanguage || 'javascript')
        setTrainerLanguage(inferredLanguage)
        console.log('[StudentSessionWorkspace] Trainer language inferred on refresh', {
          fileName,
          inferredLanguage
        })
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

      // Note: lastUpdate from useSaveCode is only for saves, not trainer updates
      if (activeTab !== 'trainer') {
        setHasNewTrainerUpdate(true)
      }
    } catch (error) {
      // Ignore cancellation errors (from AbortController or manual cancellation)
      if (isCancellationError(error) || error instanceof Error && error.name === 'AbortError') {
        return
      }
      console.error('Failed to refresh trainer code:', error)
    } finally {
      setRefreshingTrainerCode(false)
    }
  }, [sessionCode, activeTab])

  // On mount, fetch just metadata so student can see trainer selected file name (without syncing code).
  useEffect(() => {
    const abortController = new AbortController()
    
    // Use .catch() to handle promise rejections (including cancellations)
    fetchTrainerMeta(abortController.signal).catch((error) => {
      if (isCancellationError(error) || error instanceof Error && error.name === 'AbortError') {
        return // Silently ignore cancellation errors
      }
      console.error('Failed to fetch trainer meta:', error)
    })
    
    // Cleanup: abort fetch if component unmounts or dependencies change
    return () => {
      abortController.abort()
    }
  }, [fetchTrainerMeta])

  // Explorer data for explorer mode (only in My Code tab)
  const {
    explorerFolders,
    explorerFiles,
    explorerLoading,
    explorerError,
    currentFolder,
    childFolders,
    childFiles,
    refreshExplorerData,
  } = useExplorerData({
    workspaceMode,
    currentFolderId,
    enabled: workspaceMode === 'explorer' && activeTab === 'mycode',
  })

  // Load student's active file from session on mount
  useEffect(() => {
    const abortController = new AbortController()
    
    const loadActiveFile = async () => {
      try {
        const res = await fetch(`/api/sessions/${sessionCode}/live`, { 
          cache: 'no-store',
          signal: abortController.signal 
        })
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
        // Ignore cancellation errors (from AbortController or manual cancellation)
        if (isCancellationError(error) || error instanceof Error && error.name === 'AbortError') {
          return
        }
        console.error('Failed to load active file:', error)
        setShowFileModal(true)
      }
    }
    
    loadActiveFile()
    
    // Cleanup: abort fetch if component unmounts or dependencies change
    return () => {
      abortController.abort()
    }
  }, [sessionCode, selectedFile])


  // File selection updates are handled by useFileSelection hook's onFileChanged callback

  // Auto-save and sync disabled - only manual save via button click
  // Removed periodic auto-sync to reduce API calls

  const handleFileSelect = useCallback(async (file: { id: string; name?: string; content?: string }) => {
    await hookHandleFileSelect(file)
  }, [hookHandleFileSelect])

  const handleFileSelectFromModal = async (
    fileId: string | null,
    fileName: string,
    content: string,
    fileLanguage: string
  ) => {
    await hookHandleFileSelectFromModal(fileId, fileName, content, fileLanguage)
    
    // Update language if provided (hook doesn't handle this)
        if (fileLanguage) {
          setLanguage(fileLanguage)
    }
    
    // Close modal
    setShowFileModal(false)
  }

  // handleSaveCode is provided by useSaveCode hook

  // handleRun is provided by useWorkspaceCodeExecution hook

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

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden">
      {/* Session Header */}
      <WorkspaceHeader
        leftContent={
          <>
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
          </>
        }
        rightContent={
          <>
            {/* Toggles for "My Code" tab */}
            {activeTab === 'mycode' && (
              <>
                {/* Workspace Mode Toggle */}
                <WorkspaceModeToggle
                  mode={workspaceMode}
                  onChange={setWorkspaceMode}
                  data-testid="mode-toggle"
                />
                {/* View Controls */}
                <WorkspaceViewControls
                  showFileExplorer={showFileExplorer}
                  showOutput={showOutput}
                  showAI={showAI}
                  hasSelectedFile={!!selectedFile}
                  workspaceMode={workspaceMode}
                  onToggleFileExplorer={() => setShowFileExplorer(!showFileExplorer)}
                  onToggleOutput={() => setShowOutput(!showOutput)}
                  onToggleAI={() => setShowAI(!showAI)}
                  size="sm"
                />
              </>
            )}
            {/* Output Toggle (shown in both tabs) */}
            {activeTab !== 'mycode' && (
              <ViewToggleButton
                icon={<Terminal className="h-3 w-3" />}
                activeLabel="Hide Output"
                inactiveLabel="Show Output"
                isActive={showOutput}
              onClick={() => setShowOutput(!showOutput)}
                size="sm"
              />
            )}
            {lastUpdate && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground" suppressHydrationWarning>
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
          </>
        }
        data-testid="workspace-header"
      />

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
          Trainer&apos;s Code
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
                    onSave={() => setRefreshKey((prev) => prev + 1)}
                    readOnly={true}
                    runDisabled={false} // Allow running trainer's code
                    allowRunInReadOnly={true} // Show Run button even in read-only mode
                  />
                </>
              ) : (
                <div className="flex h-full flex-col items-center justify-center">
                  <div className="text-center space-y-4">
                    <p className="text-muted-foreground">Trainer hasn&apos;t selected a file yet</p>
                    <button
                      onClick={handleRefreshTrainerCode}
                      disabled={refreshingTrainerCode || !sessionActive}
                      className={cn(
                        "flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                        refreshingTrainerCode || !sessionActive
                          ? "opacity-50 cursor-not-allowed bg-muted text-muted-foreground"
                          : "bg-primary text-primary-foreground hover:bg-primary/90"
                      )}
                      title="Check if trainer has selected a file"
                    >
                      <RefreshCw className={cn("h-4 w-4", refreshingTrainerCode && "animate-spin")} />
                      {refreshingTrainerCode ? 'Checking...' : 'Refresh'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Output Panel */}
            {showOutput && (
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
            )}
          </>
        ) : (
          /* Student's Code View (Editable) */
          workspaceMode === 'explorer' ? (
            /* Explorer Mode */
            <div className="flex flex-1 overflow-hidden">
              {(() => {
                return (
                  <FolderExplorerView
                    currentFolder={currentFolder}
                    childFolders={childFolders}
                    childFiles={childFiles}
                    loading={explorerLoading}
                    error={explorerError}
                    isRoot={!currentFolder}
                    allFolders={explorerFolders}
                    onOpenFolder={(folderId) => {
                      if (folderId === '') {
                        setCurrentFolderId(null) // Go to root
                      } else {
                        setCurrentFolderId(folderId)
                      }
                    }}
                    onOpenFile={async (fileId) => {
                      // Use handleFileSelect which now uses React Query caching
                      // Pass file without content - React Query will fetch and cache it
                      handleFileSelect({
                        id: String(fileId),
                        // name and content will be fetched by React Query
                      })
                      setWorkspaceMode('workspace')
                    }}
                    onOpenFolderInWorkspace={(folderId) => {
                      setCurrentFolderId(folderId)
                      setWorkspaceMode('workspace')
                    }}
                    onItemChanged={async () => {
                      // Refresh explorer data after rename/move/delete
                      await refreshExplorerData()
                      // Also refresh file explorer if in workspace mode
                      setRefreshKey((prev) => prev + 1)
                    }}
                    readOnly={false}
                  />
                )
              })()}
            </div>
          ) : (
            /* Workspace Mode */
            <WorkspaceModeLayout
              fileExplorer={
                <FileExplorerSidebar
                  loadingOverlay={
                    <FileSwitchingOverlay visible={switchingFile} />
                  }
                  overlayVisible={switchingFile}
                >
                  <FileExplorer
                    key={refreshKey}
                    onFileSelect={handleFileSelect}
                    selectedFileId={activeFileId || undefined}
                    onFileSaved={() => setRefreshKey((prev) => prev + 1)}
                    rootFolderSlug={currentFolderId ? String(currentFolderId) : undefined}
                    readOnly={false}
                  />
                </FileExplorerSidebar>
              }
              editor={
                selectedFile ? (
                  <>
                    <WorkspaceEditorHeader
                      role="student"
                      fileName={activeFileName}
                      language={language}
                      onLanguageChange={setLanguage}
                      onSave={handleSaveCode}
                      savingCode={savingCode}
                      saveSuccess={saveSuccess}
                      showAI={showAI}
                      onToggleAI={() => setShowAI(!showAI)}
                    />
                    <WorkspaceEditor
                      fileId={selectedFile.id}
                      fileName={selectedFile.name}
                      code={code}
                      language={language}
                      onLanguageChange={setLanguage}
                      onChange={setCode}
                      onRun={handleRun}
                      executing={executing}
                      executionResult={executionResult}
                      onSave={() => setRefreshKey((prev) => prev + 1)}
                      hideSaveButton={true}
                      runDisabled={code !== lastSavedCode}
                    />
                  </>
                ) : (
                  <NoFileSelectedView
                    actionText="Select or Create File"
                    onAction={() => setShowFileModal(true)}
                  />
                )
              }
              outputPanel={
                <OutputPanelWrapper>
                  <OutputPanel
                    result={executionResult}
                    executing={executing}
                    onClear={clearResult}
                  />
                </OutputPanelWrapper>
              }
              aiPanel={
                selectedFile ? (
                  <AIAssistantPanelWrapper>
                    <AIAssistantPanel
                      role="student"
                      lectureId={sessionCode}
                      language={language}
                      code={code}
                      output={executionResult?.stdout || executionResult?.stderr}
                      onClose={() => setShowAI(false)}
                      onInsertCode={(newCode) => setCode(newCode)}
                    />
                  </AIAssistantPanelWrapper>
                ) : null
              }
              showFileExplorer={showFileExplorer}
              showOutput={showOutput}
              showAI={showAI && !!selectedFile}
              data-testid="workspace-layout"
            />
          )
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

