'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Radio, Download, Upload } from 'lucide-react'

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
import { OutputPanelWrapper } from './OutputPanelWrapper'
import { AIAssistantPanelWrapper } from './AIAssistantPanelWrapper'
import { useExplorerData } from '@/hooks/workspace/useExplorerData'
import { useFolderExplorerHandlers } from '@/hooks/workspace/useFolderExplorerHandlers'
import { useFileSelection } from '@/hooks/workspace/useFileSelection'
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
  const [code, setCode] = useState('')
  const [language, setLanguage] = useState('javascript')
  const [showAI, setShowAI] = useState(false)
  const [showFileExplorer, setShowFileExplorer] = useState(true)
  const [showOutput, setShowOutput] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0) // Force file explorer refresh
  const [paymentStatus, setPaymentStatus] = useState<any>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showGracePeriodModal, setShowGracePeriodModal] = useState(false)
  const [showTrialEndingModal, setShowTrialEndingModal] = useState(false)
  const [showTrialGraceModal, setShowTrialGraceModal] = useState(false)
  const [viewingUserName, setViewingUserName] = useState<string | null>(null)
  const [scopedFolder, setScopedFolder] = useState<(BasicFolderRef & { slug?: string | null }) | null>(null)
  const [scopedFolderLoading, setScopedFolderLoading] = useState(false)
  // Default to Explorer mode for root workspace, Workspace mode for scoped folders
  const [workspaceMode, setWorkspaceMode] = useState<'explorer' | 'workspace'>(scopeFolderId ? 'workspace' : 'explorer')
  const [currentFolderId, setCurrentFolderId] = useState<string | number | null>(scopeFolderId || null)

  // File selection management (no autosave needed in standalone workspace)
  const {
    selectedFile,
    setSelectedFile: setHookSelectedFile,
    handleFileSelect: handleFileSelectFromExplorer,
    handleFileSelectFromModal,
    switchingFile,
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
    autoSaveBeforeSwitch: false,
  })

  // Keep local refreshKey in sync with hook refreshKey for existing consumers
  useEffect(() => {
    if (refreshKey !== hookRefreshKey) {
      setRefreshKey(() => hookRefreshKey)
    }
  }, [hookRefreshKey, refreshKey])

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

  // Update code when file changes (language is handled by onFileChanged callback)
  useEffect(() => {
    if (selectedFile) {
      setCode(selectedFile.content || '')
    }
  }, [selectedFile])

  // handleRun is provided by useWorkspaceCodeExecution hook

  function handleFileSelect(file: WorkspaceFile) {
    // Delegate to shared hook handler to keep behavior consistent
    void handleFileSelectFromExplorer(file)
  }

  // handleDownload and handleUpload are provided by useWorkspaceImportExport hook

  // Check payment status on mount
  useEffect(() => {
    const checkPaymentStatus = async () => {
      try {
        const res = await fetch('/api/workspace/files', { credentials: 'include' })
        if (!res.ok) {
          if (res.status === 403) {
            try {
              const errorData = await res.json()
              if (errorData.paymentStatus) {
                setPaymentStatus(errorData.paymentStatus)
                return
              }
            } catch {
              // Fall through
            }
          }
        } else {
          const data = await res.json()
          if (data.paymentStatus) {
            setPaymentStatus(data.paymentStatus)
            if (data.paymentStatus.isDueSoon && data.paymentStatus.nextInstallment) {
              setShowPaymentModal(true)
            }
            if (data.paymentStatus.isInGracePeriod && data.paymentStatus.nextInstallment) {
              setShowGracePeriodModal(true)
            }
          }
        }
      } catch (error) {
        console.error('Error checking payment status:', error)
      }
    }
    checkPaymentStatus()
  }, [])

  // Update currentFolderId when scopeFolderId changes
  useEffect(() => {
    setCurrentFolderId(scopeFolderId || null)
  }, [scopeFolderId])

  // Fetch scoped folder data when scopeFolderId is provided
  useEffect(() => {
    if (scopeFolderId) {
      const fetchScopedFolder = async () => {
        try {
          setScopedFolderLoading(true)
          const res = await fetch(`/api/folders?limit=1000&depth=2`, { credentials: 'include', cache: 'no-store' })
          if (res.ok) {
            const data = await res.json()
            // Find folder by ID
            const folder = (data.docs || []).find((f: any) => {
              return String(f.id) === String(scopeFolderId)
            })
            if (folder) {
              setScopedFolder(folder as BasicFolderRef & { slug?: string | null })
            }
          }
        } catch (error) {
          console.error('Failed to fetch scoped folder:', error)
        } finally {
          setScopedFolderLoading(false)
        }
      }
      fetchScopedFolder()
    } else {
      setScopedFolder(null)
    }
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
              <Link
                href="/join"
                className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Radio className="h-4 w-4" />
                Join Live Session
              </Link>
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
            <FileExplorerSidebar>
              <FileExplorer
                key={refreshKey}
                onFileSelect={handleFileSelect}
                selectedFileId={selectedFile?.id}
                onFileSaved={() => setRefreshKey((prev) => prev + 1)}
                userId={userId}
                readOnly={readOnly}
                rootFolderSlug={currentFolderId ? String(currentFolderId) : undefined}
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
                onRun={handleRun}
                executing={executing}
                executionResult={executionResult}
                onSave={() => setRefreshKey((prev) => prev + 1)}
                readOnly={readOnly}
                allowRunInReadOnly={readOnly}
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

