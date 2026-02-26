'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Radio, Download, Upload, Loader2 } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { invalidateWorkspaceData } from '@/hooks/workspace/useWorkspaceData'
import { usePaymentStatus, type PaymentStatus } from '@/hooks/payment/usePaymentStatus'

import { FileExplorer } from './FileExplorer'
import { WorkspaceEditor } from './WorkspaceEditor'
import { OutputPanel } from '@/components/LiveCodePlayground/OutputPanel'
import { AIAssistantPanel } from '@/components/AIAssistant'
import { PaymentBlocked } from '@/components/Payment/PaymentBlocked'
import { inferLanguageFromFileName } from '@/utilities/languageInference'
import { WorkspaceViewControls } from './WorkspaceViewControls'
import { PaymentDueModal } from '@/components/Payment/PaymentDueModal'
import { PaymentGracePeriodModal } from '@/components/Payment/PaymentGracePeriodModal'
import { TrialEndingSoonModal } from '@/components/Payment/TrialEndingSoonModal'
import { TrialGracePeriodModal } from '@/components/Payment/TrialGracePeriodModal'
import { UploadModal } from './UploadModal'
import { buildFolderPathChain, type BasicFolderRef } from '@/utilities/workspaceScope'
import { FolderExplorerView } from './FolderExplorerView'
import { WorkspaceModeToggle } from './WorkspaceModeToggle'
import { WorkspaceModeLayout } from './WorkspaceModeLayout'
import { WorkspaceHeader } from './WorkspaceHeader'
import { NoFileSelectedView } from './NoFileSelectedView'
import { FileExplorerSidebar } from './FileExplorerSidebar'
import { FileSwitchingOverlay } from './FileSwitchingOverlay'
import { OutputPanelWrapper } from './OutputPanelWrapper'
import { AIAssistantPanelWrapper } from './AIAssistantPanelWrapper'
import { useExplorerData } from '@/hooks/workspace/useExplorerData'
import { useWorkspaceData } from '@/hooks/workspace/useWorkspaceData'
import { useFolderExplorerHandlers } from '@/hooks/workspace/useFolderExplorerHandlers'
import { useFileSelection } from '@/hooks/workspace/useFileSelection'
import { useSaveCode } from '@/hooks/workspace/useSaveCode'
import { useSaveAndRun } from '@/hooks/workspace/useSaveAndRun'
import { useWorkspaceCodeExecution } from '@/hooks/workspace/useWorkspaceCodeExecution'
import { useWorkspaceImportExport } from '@/hooks/workspace/useWorkspaceImportExport'
import type { WorkspaceFileWithContent } from '@/types/workspace'

type WorkspaceFile = WorkspaceFileWithContent

interface WorkspaceLayoutProps {
  userId?: string | number
  readOnly?: boolean
  /**
   * Optional folder ID that defines the root of the visible workspace subtree.
   * When provided, only this folder and its descendants are shown in the tree.
   */
  scopeFolderId?: string | number
}

export function WorkspaceLayout({ userId, readOnly = false, scopeFolderId }: WorkspaceLayoutProps = {}) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const [navigatingToJoin, setNavigatingToJoin] = useState(false)
  const [code, setCode] = useState('')
  const [language, setLanguage] = useState('javascript')
  const [showAI, setShowAI] = useState(false)
  const [showFileExplorer, setShowFileExplorer] = useState(true)
  const [showOutput, setShowOutput] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0) // Refresh trigger for FileExplorer
  
  // Use React Query for payment status (cached, shared across components)
  const { data: paymentStatus } = usePaymentStatus()
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showGracePeriodModal, setShowGracePeriodModal] = useState(false)
  const [showTrialEndingModal, setShowTrialEndingModal] = useState(false)
  const [showTrialGraceModal, setShowTrialGraceModal] = useState(false)
  const [viewingUserName, setViewingUserName] = useState<string | null>(null)
  // Workspace data for deriving scoped folder (shared cache with explorer)
  const { folders: workspaceFolders, isLoading: workspaceFoldersLoading } = useWorkspaceData(userId)
  const scopedFolder = React.useMemo(() => {
    if (!scopeFolderId) return null
    const folder = workspaceFolders.find((f) => String(f.id) === String(scopeFolderId))
    return folder ? (folder as BasicFolderRef & { slug?: string | null }) : null
  }, [scopeFolderId, workspaceFolders])
  const scopedFolderLoading = scopeFolderId ? workspaceFoldersLoading : false
  // Default to Explorer mode for root workspace, Workspace mode for scoped folders
  const [workspaceMode, setWorkspaceMode] = useState<'explorer' | 'workspace'>(scopeFolderId ? 'workspace' : 'explorer')
  const [currentFolderId, setCurrentFolderId] = useState<string | number | null>(scopeFolderId || null)

  const saveCurrentFileRef = useRef<(() => Promise<boolean>) | null>(null)

  // File selection with auto-save before switch and loading state
  const {
    selectedFile,
    setSelectedFile: setHookSelectedFile,
    handleFileSelect: handleFileSelectFromExplorer,
    handleFileSelectFromModal,
    switchingFile,
    loadingFile,
    refreshKey: hookRefreshKey,
    setRefreshKey: setHookRefreshKey,
  } = useFileSelection({
    onFileChanged: (file) => {
      const inferredLanguage = inferLanguageFromFileName(file.name, language || 'javascript')
      setLanguage(inferredLanguage)
      console.log('[WorkspaceLayout] File changed via hook', {
        fileName: file.name,
        inferredLanguage,
        fileId: file.id
      })
    },
    autoSaveBeforeSwitch: true,
    saveCurrentFile: async () => {
      if (saveCurrentFileRef.current) return await saveCurrentFileRef.current()
      return false
    },
    hasUnsavedChanges: () => selectedFile != null && code !== lastSavedCode,
  })

  // Save code (workspace-only, no session sync)
  const {
    lastSavedCode,
    saveCurrentFile,
  } = useSaveCode({
    selectedFile,
    code,
    language,
    onSaveSuccess: () => {
      invalidateWorkspaceData(queryClient, userId)
      setHookRefreshKey((prev) => prev + 1)
    },
  })
  useEffect(() => {
    saveCurrentFileRef.current = saveCurrentFile
  }, [saveCurrentFile])

  // Keep local refreshKey in sync with hook refreshKey for existing consumers
  // Also invalidate workspace cache when refreshKey changes
  useEffect(() => {
    if (refreshKey !== hookRefreshKey) {
      setRefreshKey(() => hookRefreshKey)
    }
  }, [hookRefreshKey, refreshKey])

  // Handle refresh by invalidating React Query cache
  const handleRefresh = useCallback(() => {
    console.log('[WorkspaceLayout] Refreshing workspace data', { userId })
    invalidateWorkspaceData(queryClient, userId)
    setRefreshKey((prev) => prev + 1)
  }, [queryClient, userId])

  // Memoized callbacks for file operations
  const handleFileSaved = useCallback(() => {
    console.log('[WorkspaceLayout] File saved, invalidating cache', { userId })
    invalidateWorkspaceData(queryClient, userId)
    setRefreshKey((prev) => prev + 1)
  }, [queryClient, userId])

  const handleEditorSave = useCallback(() => {
    console.log('[WorkspaceLayout] File saved from editor, invalidating cache', { userId })
    invalidateWorkspaceData(queryClient, userId)
    setRefreshKey((prev) => prev + 1)
  }, [queryClient, userId])

  // Code execution (no session sync for standalone workspace)
  const {
    executing,
    executionResult,
    handleRun,
    clearResult,
  } = useWorkspaceCodeExecution({
    language,
    syncToSession: false,
  })

  // Save and run (same behavior as session: save if dirty then run, simultaneous)
  const handleSaveAndRun = useSaveAndRun({
    code,
    lastSavedCode,
    saveCurrentFile,
    handleRun,
  })

  // Import/Export functionality
  const {
    downloading,
    uploading,
    uploadProgress,
    uploadMessage,
    handleDownload,
    handleUpload,
  } = useWorkspaceImportExport({
    onUploadSuccess: () => {
      // Refresh workspace
      console.log('[WorkspaceLayout] Upload success, invalidating cache', { userId })
      invalidateWorkspaceData(queryClient, userId)
      setRefreshKey((prev) => prev + 1)
      // Reload files
      window.location.reload()
    },
  })

  // Explorer data management
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
    userId,
    workspaceMode,
    currentFolderId,
    enabled: true,
  })

  const {
    handleOpenFolder,
    handleOpenFile,
    handleOpenFolderInWorkspace,
    handleItemChanged,
  } = useFolderExplorerHandlers({
    currentFolderId,
    setCurrentFolderId,
    setWorkspaceMode,
    onFileSelect: handleFileSelectFromExplorer,
    refreshExplorerData,
    setRefreshKey: setHookRefreshKey,
  })

  // Update code only when the selected file *id* changes (user switched file), not when selectedFile ref updates (e.g. refetch)
  const lastSyncedFileIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (!selectedFile) {
      lastSyncedFileIdRef.current = null
      return
    }
    if (selectedFile.id !== lastSyncedFileIdRef.current) {
      lastSyncedFileIdRef.current = selectedFile.id
      setCode(selectedFile.content || '')
    }
  }, [selectedFile])

  // handleRun is provided by useWorkspaceCodeExecution hook

  const handleFileSelect = useCallback((file: { id: string; name?: string; content?: string }) => {
    // Delegate to shared hook handler to keep behavior consistent
    void handleFileSelectFromExplorer(file)
  }, [handleFileSelectFromExplorer])

  // handleDownload and handleUpload are provided by useWorkspaceImportExport hook

  // Show modals when payment status changes
  useEffect(() => {
    if (paymentStatus) {
      if (paymentStatus.isDueSoon && paymentStatus.nextInstallment) {
        setShowPaymentModal(true)
      }
      if (paymentStatus.isInGracePeriod && paymentStatus.nextInstallment) {
        setShowGracePeriodModal(true)
      }
      if (paymentStatus.isTrialEndingSoon && paymentStatus.trialEndDate) {
        setShowTrialEndingModal(true)
      }
      if (paymentStatus.isTrialInGracePeriod && paymentStatus.trialEndDate) {
        setShowTrialGraceModal(true)
      }
    }
  }, [paymentStatus])

  // Update currentFolderId when scopeFolderId changes
  useEffect(() => {
    setCurrentFolderId(scopeFolderId || null)
  }, [scopeFolderId])

  const scopedBreadcrumb = scopedFolder ? buildFolderPathChain(scopedFolder) : []

  // Show payment blocked screen if student is blocked
  if (paymentStatus?.isBlocked) {
    return (
      <PaymentBlocked
        reason={paymentStatus.reason}
        nextInstallment={paymentStatus.nextInstallment}
        daysOverdue={paymentStatus.daysOverdue}
      />
    )
  }

  return (
    <div className={`flex h-full w-full flex-col overflow-hidden ${uploading ? 'pointer-events-none' : ''}`}>
      {/* Upload Modal */}
      <UploadModal 
        isOpen={uploading} 
        progress={uploadProgress}
        message={uploadMessage}
      />
      {/* Header - Only show if not in dashboard workspace view (userId prop means we're in dashboard) */}
      {!userId && (
        <WorkspaceHeader
          leftContent={
            <>
              <Link href="/" className="text-lg font-semibold">
                CodeHub
              </Link>
              <div className="flex items-center gap-2 min-w-0">
                <WorkspaceModeToggle
                  mode={workspaceMode}
                  onChange={setWorkspaceMode}
                  data-testid="mode-toggle"
                />
                {scopeFolderId && scopedFolder ? (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground min-w-0">
                    <Link
                      href="/workspace"
                      className="hover:text-foreground hover:underline transition-colors truncate"
                    >
                      Workspace
                    </Link>
                    {scopedBreadcrumb.map((folder, index) => {
                      const isLast = index === scopedBreadcrumb.length - 1
                      return (
                        <React.Fragment key={folder.id}>
                          <span>/</span>
                          {isLast ? (
                            <span className="truncate font-medium text-foreground">
                              {folder.name || 'Folder'}
                            </span>
                          ) : (
                            <Link
                              href={`/workspace/folder/${folder.id}`}
                              className="hover:text-foreground hover:underline transition-colors truncate"
                            >
                              {folder.name || 'Untitled'}
                            </Link>
                          )}
                        </React.Fragment>
                      )
                    })}
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Workspace</span>
                )}
              </div>
            </>
          }
          rightContent={
            <>
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
                disabled={uploading}
                size="md"
              />
              {/* Download Workspace */}
              <button
                onClick={handleDownload}
                disabled={downloading || uploading}
                className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                title="Download workspace as ZIP"
              >
                <Download className="h-4 w-4" />
                {downloading ? 'Downloading...' : 'Download'}
              </button>
              {/* Upload Workspace */}
              <label className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm font-medium transition-colors hover:bg-accent cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${uploading ? 'pointer-events-none' : ''}`}>
                <Upload className="h-4 w-4" />
                {uploading ? 'Uploading...' : 'Upload'}
                <input
                  type="file"
                  accept=".zip"
                  onChange={handleUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  setNavigatingToJoin(true)
                  router.push('/join')
                }}
                disabled={navigatingToJoin}
                className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {navigatingToJoin ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Radio className="h-4 w-4" />
                )}
                <span>{navigatingToJoin ? 'Opening...' : 'Join Live Session'}</span>
              </button>
            </>
          }
          data-testid="workspace-header"
        />
      )}
      
      {/* Dashboard Workspace View - Show controls bar when userId is provided */}
      {userId && (
        <div className="flex items-center gap-2 border-b bg-card px-4 py-2">
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
            disabled={uploading}
            size="md"
          />
          {/* Download Workspace */}
          <button
            onClick={handleDownload}
            disabled={downloading || uploading}
            className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
            title="Download workspace as ZIP"
          >
            <Download className="h-4 w-4" />
            {downloading ? 'Downloading...' : 'Download'}
          </button>
          {/* Upload Workspace */}
          <label className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm font-medium transition-colors hover:bg-accent cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${uploading ? 'pointer-events-none' : ''}`}>
            <Upload className="h-4 w-4" />
            {uploading ? 'Uploading...' : 'Upload'}
            <input
              type="file"
              accept=".zip"
              onChange={handleUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
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
            onOpenFolder={handleOpenFolder}
            onOpenFile={handleOpenFile}
            onOpenFolderInWorkspace={handleOpenFolderInWorkspace}
            onItemChanged={handleItemChanged}
            readOnly={readOnly}
          />
        </div>
      ) : (
        /* Workspace Mode */
        <WorkspaceModeLayout
          fileExplorer={
            <FileExplorerSidebar
              loadingOverlay={
                <FileSwitchingOverlay
                  visible={true}
                  message={switchingFile ? 'Saving current file...' : 'Loading file...'}
                />
              }
              overlayVisible={switchingFile || loadingFile}
            >
              <FileExplorer
                onFileSelect={handleFileSelect}
                selectedFileId={selectedFile?.id}
                onFileSaved={handleFileSaved}
                userId={userId}
                readOnly={readOnly}
                rootFolderSlug={currentFolderId ? String(currentFolderId) : undefined}
                refreshTrigger={refreshKey}
              />
            </FileExplorerSidebar>
          }
          editor={
            selectedFile ? (
              <WorkspaceEditor
                fileId={selectedFile.id}
                fileName={selectedFile.name}
                code={code}
                language={language}
                onLanguageChange={setLanguage}
                onChange={setCode}
                onRun={handleSaveAndRun}
                executing={executing}
                executionResult={executionResult}
                onSave={handleEditorSave}
                readOnly={readOnly}
                allowRunInReadOnly={readOnly}
                runButtonLabel="Save and Run"
              />
            ) : (
              <NoFileSelectedView />
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
                  lectureId="workspace"
                  language={language}
                  code={code}
                  output={executionResult?.stdout || executionResult?.stderr}
                  onClose={() => setShowAI(false)}
                  onInsertCode={(newCode) => {
                    setCode(newCode)
                  }}
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

      {/* Payment Due Modal */}
      {paymentStatus?.isDueSoon && paymentStatus.nextInstallment && (
        <PaymentDueModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          nextInstallment={paymentStatus.nextInstallment}
          daysUntilDue={paymentStatus.daysUntilDue || 0}
        />
      )}

      {/* Grace Period Modal */}
      {paymentStatus?.isInGracePeriod && paymentStatus.nextInstallment && (
        <PaymentGracePeriodModal
          isOpen={showGracePeriodModal}
          onClose={() => setShowGracePeriodModal(false)}
          nextInstallment={paymentStatus.nextInstallment}
          daysRemaining={paymentStatus.daysRemainingInGracePeriod || 0}
        />
      )}

      {/* Trial Ending Soon Modal */}
      {paymentStatus?.isTrialEndingSoon && paymentStatus.trialEndDate && (
        <TrialEndingSoonModal
          isOpen={showTrialEndingModal}
          onClose={() => setShowTrialEndingModal(false)}
          trialEndDate={paymentStatus.trialEndDate}
          daysUntilEnd={paymentStatus.daysUntilTrialEnd || 0}
        />
      )}

      {/* Trial Grace Period Modal */}
      {paymentStatus?.isTrialInGracePeriod && paymentStatus.trialEndDate && (
        <TrialGracePeriodModal
          isOpen={showTrialGraceModal}
          onClose={() => setShowTrialGraceModal(false)}
          trialEndDate={paymentStatus.trialEndDate}
        />
      )}
    </div>
  )
}

