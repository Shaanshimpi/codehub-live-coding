'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { FileExplorer } from '@/components/Workspace/FileExplorer'
import { WorkspaceEditor } from '@/components/Workspace/WorkspaceEditor'
import { OutputPanel } from '@/components/LiveCodePlayground/OutputPanel'
import { LiveCodePlayground } from '@/components/LiveCodePlayground'
import { AIAssistantPanel } from '@/components/AIAssistant'
import { executeCode, type ExecutionResult } from '@/services/codeExecution'
import { SUPPORTED_LANGUAGES } from '@/components/LiveCodePlayground/types'
import { inferLanguageFromFileName } from '@/utilities/languageInference'
import { WorkspaceViewControls } from '@/components/Workspace/WorkspaceViewControls'
import { Radio, RefreshCw, X, Users, ChevronDown, ChevronUp, Loader2, ArrowLeft } from 'lucide-react'
import type { BasicFolderRef } from '@/utilities/workspaceScope'
import { buildFolderPathChain } from '@/utilities/workspaceScope'
import { cn } from '@/utilities/ui'
import { FileSelectionModal } from '@/components/Session/FileSelectionModal'
import { useTheme } from '@/providers/Theme'
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
import { SessionMetadataModal } from '@/components/Session/SessionMetadataModal'
import type { WorkspaceFileWithContent } from '@/types/workspace'
import { useSessionData } from '@/hooks/session/useSessionData'

type WorkspaceFile = WorkspaceFileWithContent

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
  const [code, setCode] = useState('')
  const [language, setLanguage] = useState('javascript')
  const [showAI, setShowAI] = useState(false)
  const [showStudents, setShowStudents] = useState(false)
  const [showFileExplorer, setShowFileExplorer] = useState(true)
  const [showOutput, setShowOutput] = useState(true)
  const [workspaceMode, setWorkspaceMode] = useState<'explorer' | 'workspace'>('workspace')
  const [currentFolderId, setCurrentFolderId] = useState<string | number | null>(null)
  const [showFileModal, setShowFileModal] = useState(false)
  const [activeFileId, setActiveFileId] = useState<string | null>(null)
  const [activeFileName, setActiveFileName] = useState<string>('')
  const [showMetadataModal, setShowMetadataModal] = useState(false)
  
  // Local student code edits (not synced with students)
  const [localStudentEdits, setLocalStudentEdits] = useState<Record<string, {
    code: string
    language: string
    executing: boolean
    executionResult: ExecutionResult | null
  }>>({})
  
  const { theme: appTheme } = useTheme()

  // Refs for saveCurrentFile to avoid circular dependency
  const saveCurrentFileRef = useRef<(() => Promise<boolean>) | null>(null)
  // Ref to store latest handleFileSelect to avoid stale closure in useEffect
  const handleFileSelectRef = useRef<((file: { id: string; name?: string; content?: string }) => Promise<void>) | null>(null)

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
      console.log('[TrainerSessionWorkspace] File changed via hook', {
        fileName: file.name,
        inferredLanguage,
        fileId: file.id
      })
    },
  })

  // Update ref with latest handleFileSelect
  useEffect(() => {
    handleFileSelectRef.current = hookHandleFileSelect
  }, [hookHandleFileSelect])

  // Save code management with session sync
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
    sessionSyncType: 'broadcast',
    onSaveSuccess: () => {
      setRefreshKey((prev) => prev + 1) // Refresh file explorer
    },
  })

  // Update ref so useFileSelection can call the latest saveCurrentFile
  useEffect(() => {
    saveCurrentFileRef.current = saveCurrentFile
  }, [saveCurrentFile])

  // Code execution with session sync
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
    sessionSyncType: 'broadcast',
    lastSavedCode,
  })

  // Explorer data for explorer mode
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
    enabled: workspaceMode === 'explorer',
  })

  // Track if we've attempted to load the active file to prevent infinite loops
  const hasAttemptedLoadRef = useRef(false)

  // Load active file from session on mount (only once per session)
  // Use React Query to fetch session data (cached)
  const { data: sessionData } = useSessionData(sessionCode, {
    refetchInterval: false, // Don't poll - just get initial data
    enabled: !!sessionCode,
  })

  useEffect(() => {
    // Don't run if we've already attempted to load or if a file is already selected
    if (hasAttemptedLoadRef.current || selectedFile || !sessionData) {
      return
    }

    const loadActiveFile = async () => {
      hasAttemptedLoadRef.current = true
      try {
        if (sessionData.trainerWorkspaceFileId) {
          // Fetch file content
          const fileRes = await fetch(`/api/files/${sessionData.trainerWorkspaceFileId}`, {
            credentials: 'include',
          })
          if (fileRes.ok) {
            const fileData = await fileRes.json()
            // Ensure fileId is a string (Payload returns numbers)
            const fileIdStr = String(fileData.id)
            // Trigger file selection - hook's onFileChanged will handle state updates
            if (handleFileSelectRef.current) {
              await handleFileSelectRef.current({
                id: fileIdStr,
                name: fileData.name,
                content: fileData.content || '',
              })
            }
            
            // Set language if provided by API (onFileChanged will infer if not)
            if (fileData.language) {
              setLanguage(fileData.language)
            }
          } else {
            // File fetch failed - show modal
            setShowFileModal(true)
          }
        } else {
          // No file selected - show modal
          setShowFileModal(true)
        }
      } catch (error) {
        console.error('Failed to load active file:', error)
        // Show modal if load fails - file might not exist or user doesn't have access
        setShowFileModal(true)
      }
    }
    loadActiveFile()
  }, [sessionData, selectedFile]) // Depend on sessionData and selectedFile

  // Reset the load attempt flag when session code changes
  useEffect(() => {
    hasAttemptedLoadRef.current = false
  }, [sessionCode])

  // File selection updates are handled by useFileSelection hook's onFileChanged callback

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

  // Handler to initialize or update local student code
  const handleStudentCodeChange = useCallback((studentId: string, code: string) => {
    setLocalStudentEdits((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        code,
        language: prev[studentId]?.language || 'javascript',
        executing: prev[studentId]?.executing || false,
        executionResult: prev[studentId]?.executionResult || null,
      },
    }))
  }, [])

  // Handler to change student code language
  const handleStudentLanguageChange = useCallback((studentId: string, language: string) => {
    setLocalStudentEdits((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        language,
        code: prev[studentId]?.code || '',
        executing: prev[studentId]?.executing || false,
        executionResult: null, // Clear output when language changes
      },
    }))
  }, [])

  // Handler to run student code locally
  const handleStudentCodeRun = useCallback(async (studentId: string, code: string, language: string, input?: string) => {
    setLocalStudentEdits((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        executing: true,
        code: prev[studentId]?.code || code,
        language: prev[studentId]?.language || language,
        executionResult: null,
      },
    }))

    try {
      const result = await executeCode(language, code, input)
      setLocalStudentEdits((prev) => ({
        ...prev,
        [studentId]: {
          ...prev[studentId],
          executing: false,
          executionResult: result,
        },
      }))
    } catch (e) {
      console.error('Error running student code:', e)
      const errorResult: ExecutionResult = {
        stdout: '',
        stderr: e instanceof Error ? e.message : 'Unknown error occurred',
        status: 'error',
        exitCode: 1,
      }
      setLocalStudentEdits((prev) => ({
        ...prev,
        [studentId]: {
          ...prev[studentId],
          executing: false,
          executionResult: errorResult,
        },
      }))
    }
  }, [])

  // Initialize local edits when student is expanded
  useEffect(() => {
    students.forEach((student) => {
      if (expandedStudentIds.has(student.userId)) {
        setLocalStudentEdits((prev) => {
          // Only initialize if not already exists
          if (prev[student.userId]) {
            return prev
          }
          return {
            ...prev,
            [student.userId]: {
              code: student.code || '',
              language: student.language || 'javascript',
              executing: false,
              executionResult: null,
            },
          }
        })
      }
    })
  }, [expandedStudentIds, students])

  // handleSaveCode and handleRun are provided by hooks

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden">
      {/* Session Header */}
      <header className="flex items-center justify-between border-b bg-card px-4 py-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Radio className="h-5 w-5 text-red-500 flex-shrink-0" />
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            {/* First row: Large title and join code */}
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => setShowMetadataModal(true)}
                className="text-left text-lg font-semibold hover:text-primary transition-colors cursor-pointer truncate"
                title="Click to view session details"
              >
                {sessionTitle}
              </button>
              <button
                onClick={() => setShowMetadataModal(true)}
                className="text-left text-base font-mono font-semibold text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                title="Click to view session details"
              >
                {sessionCode}
              </button>
            </div>
            {/* Second row: Smaller details */}
            {activeFileName && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="text-primary font-medium">Active:</span>
                <span className="truncate">{activeFileName}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
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
                        {/* Local editable code editor */}
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <div className="text-[10px] font-medium text-muted-foreground">
                              Code (Local Edit - Not Synced):
                            </div>
                            <select
                              value={localStudentEdits[student.userId]?.language || student.language || 'javascript'}
                              onChange={(e) => handleStudentLanguageChange(student.userId, e.target.value)}
                              className="rounded-md border bg-background px-2 py-0.5 text-[10px] focus:outline-none focus:ring-1 focus:ring-ring"
                            >
                              {SUPPORTED_LANGUAGES.map((lang) => (
                                <option key={lang.id} value={lang.id}>
                                  {lang.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="h-64 border rounded-md overflow-hidden">
                            <LiveCodePlayground
                              language={localStudentEdits[student.userId]?.language || student.language || 'javascript'}
                              code={(localStudentEdits[student.userId]?.code ?? student.code) || '// No code yet'}
                              onChange={(newCode) => handleStudentCodeChange(student.userId, newCode)}
                              onRun={(currentCode, input) => {
                                const lang = localStudentEdits[student.userId]?.language || student.language || 'javascript'
                                handleStudentCodeRun(student.userId, currentCode, lang, input)
                              }}
                              readOnly={false}
                              theme={appTheme === 'dark' ? 'vs-dark' : 'vs'}
                              height="100%"
                              runDisabled={false}
                              executing={localStudentEdits[student.userId]?.executing || false}
                              executionResult={localStudentEdits[student.userId]?.executionResult || null}
                              onStopExecution={() => {
                                setLocalStudentEdits((prev) => ({
                                  ...prev,
                                  [student.userId]: {
                                    ...prev[student.userId],
                                    executing: false,
                                  },
                                }))
                              }}
                            />
                          </div>
                          {/* Local execution output */}
                          {localStudentEdits[student.userId]?.executionResult && (
                            <div className="border rounded-md bg-muted/30">
                              <div className="text-[10px] font-medium text-muted-foreground p-2 border-b">
                                Local Execution Output:
                              </div>
                              <OutputPanel
                                result={localStudentEdits[student.userId]!.executionResult}
                                executing={localStudentEdits[student.userId]?.executing || false}
                                onClear={() => {
                                  setLocalStudentEdits((prev) => ({
                                    ...prev,
                                    [student.userId]: {
                                      ...prev[student.userId],
                                      executionResult: null,
                                    },
                                  }))
                                }}
                              />
                            </div>
                          )}
                          {/* Original student output (if exists) - show as reference */}
                          {student.output && (
                            <div className="border rounded-md bg-muted/10">
                              <div className="text-[10px] font-medium text-muted-foreground p-2 border-b">
                                Student&apos;s Original Output (Reference):
                              </div>
                              <div className="text-xs font-mono bg-muted/30 p-2 max-h-32 overflow-y-auto">
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
      {workspaceMode === 'explorer' ? (
        /* Explorer Mode */
        <div className="flex flex-1 overflow-hidden">
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
                setCurrentFolderId(null)
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
              await refreshExplorerData()
              setRefreshKey((prev) => prev + 1)
            }}
            readOnly={false}
          />
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
                {/* Editor Header */}
                <WorkspaceEditorHeader
                  role="trainer"
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
                  role="trainer"
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
      )}

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

      {/* Session Metadata Modal */}
      <SessionMetadataModal
        sessionCode={sessionCode}
        isOpen={showMetadataModal}
        onClose={() => setShowMetadataModal(false)}
      />
    </div>
  )
}

