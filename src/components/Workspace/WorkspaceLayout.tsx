'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Sparkles, Radio, Folder, Terminal, Download, Upload, ArrowLeft, FolderOpen, LayoutTemplate, File as FileIcon } from 'lucide-react'

import { FileExplorer } from './FileExplorer'
import { WorkspaceEditor } from './WorkspaceEditor'
import { OutputPanel } from '@/components/LiveCodePlayground/OutputPanel'
import { AIAssistantPanel } from '@/components/AIAssistant'
import { executeCode, type ExecutionResult } from '@/services/codeExecution'
import { SUPPORTED_LANGUAGES } from '@/components/LiveCodePlayground/types'
import { PaymentBlocked } from '@/components/Payment/PaymentBlocked'
import { PaymentDueModal } from '@/components/Payment/PaymentDueModal'
import { PaymentGracePeriodModal } from '@/components/Payment/PaymentGracePeriodModal'
import { TrialEndingSoonModal } from '@/components/Payment/TrialEndingSoonModal'
import { TrialGracePeriodModal } from '@/components/Payment/TrialGracePeriodModal'
import { UploadModal } from './UploadModal'
import { buildFolderPathChain, type BasicFolderRef } from '@/utilities/workspaceScope'
import { FolderExplorerView } from './FolderExplorerView'

type WorkspaceFile = {
  id: string
  name: string
  content: string
}

interface WorkspaceLayoutProps {
  userId?: string | number
  readOnly?: boolean
  /**
   * Optional folder slug that defines the root of the visible workspace subtree.
   * When provided, only this folder and its descendants are shown in the tree.
   */
  scopeFolderSlug?: string
}

export function WorkspaceLayout({ userId, readOnly = false, scopeFolderSlug }: WorkspaceLayoutProps = {}) {
  const [selectedFile, setSelectedFile] = useState<WorkspaceFile | null>(null)
  const [code, setCode] = useState('')
  const [language, setLanguage] = useState('javascript')
  const [executing, setExecuting] = useState(false)
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null)
  const [showAI, setShowAI] = useState(false)
  const [showFileExplorer, setShowFileExplorer] = useState(true)
  const [showOutput, setShowOutput] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0) // Force file explorer refresh
  const [paymentStatus, setPaymentStatus] = useState<any>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showGracePeriodModal, setShowGracePeriodModal] = useState(false)
  const [showTrialEndingModal, setShowTrialEndingModal] = useState(false)
  const [showTrialGraceModal, setShowTrialGraceModal] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadMessage, setUploadMessage] = useState('')
  const [viewingUserName, setViewingUserName] = useState<string | null>(null)
  const [scopedFolder, setScopedFolder] = useState<(BasicFolderRef & { slug?: string | null }) | null>(null)
  const [scopedFolderLoading, setScopedFolderLoading] = useState(false)
  // Default to Explorer mode for root workspace, Workspace mode for scoped folders
  const [workspaceMode, setWorkspaceMode] = useState<'explorer' | 'workspace'>(scopeFolderSlug ? 'workspace' : 'explorer')
  const [explorerFolders, setExplorerFolders] = useState<Array<BasicFolderRef & { parentFolder?: BasicFolderRef | null; slug?: string | null }>>([])
  const [explorerFiles, setExplorerFiles] = useState<Array<{ id: string; name: string; folder?: { id: string | number; name?: string | null; slug?: string | null } | null }>>([])
  const [explorerLoading, setExplorerLoading] = useState(false)
  const [explorerError, setExplorerError] = useState<string | null>(null)
  const [currentFolderSlug, setCurrentFolderSlug] = useState<string | null>(scopeFolderSlug || null)

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

  const handleDownload = async () => {
    try {
      setDownloading(true)
      const res = await fetch('/api/workspace/download', {
        credentials: 'include',
      })
      
      if (!res.ok) {
        throw new Error('Failed to download workspace')
      }
      
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `workspace-${Date.now()}.zip`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      alert('Failed to download workspace')
      console.error(error)
    } finally {
      setDownloading(false)
    }
  }

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.zip')) {
      alert('Please upload a ZIP file')
      return
    }

    try {
      setUploading(true)
      setUploadProgress(0)
      setUploadMessage('Preparing upload...')
      
      const formData = new FormData()
      formData.append('file', file)

      setUploadProgress(20)
      setUploadMessage('Uploading ZIP file...')

      const res = await fetch('/api/workspace/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })

      setUploadProgress(60)
      setUploadMessage('Processing files...')

      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        throw new Error(error.error || 'Failed to upload workspace')
      }

      setUploadProgress(80)
      setUploadMessage('Finalizing...')

      const data = await res.json()
      
      setUploadProgress(100)
      setUploadMessage(`Success! ${data.filesCreated} files processed, ${data.foldersCreated} folders created.`)
      
      // Wait a moment to show success message
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Refresh workspace
      setRefreshKey((prev) => prev + 1)
      // Reload files
      window.location.reload()
    } catch (error) {
      setUploadMessage(error instanceof Error ? error.message : 'Failed to upload workspace')
      await new Promise(resolve => setTimeout(resolve, 2000))
      alert(error instanceof Error ? error.message : 'Failed to upload workspace')
    } finally {
      setUploading(false)
      setUploadProgress(0)
      setUploadMessage('')
      // Reset input
      event.target.value = ''
    }
  }

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

  // Update currentFolderSlug when scopeFolderSlug changes
  useEffect(() => {
    setCurrentFolderSlug(scopeFolderSlug || null)
  }, [scopeFolderSlug])

  // Fetch scoped folder data when scopeFolderSlug is provided
  useEffect(() => {
    if (scopeFolderSlug) {
      const fetchScopedFolder = async () => {
        try {
          setScopedFolderLoading(true)
          const res = await fetch(`/api/folders?limit=1000&depth=2`, { credentials: 'include', cache: 'no-store' })
          if (res.ok) {
            const data = await res.json()
            // Find folder by slug, with fallback to ID for backward compatibility
            const folder = (data.docs || []).find((f: any) => {
              if (f.slug === scopeFolderSlug) return true
              // Fallback: try matching by ID
              if (String(f.id) === scopeFolderSlug) return true
              return false
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
  }, [scopeFolderSlug])

  // Fetch folders and files for Explorer mode
  useEffect(() => {
    if (workspaceMode === 'explorer') {
      const fetchExplorerData = async () => {
        try {
          setExplorerLoading(true)
          setExplorerError(null)

          const foldersEndpoint = userId 
            ? `/api/dashboard/workspace/${userId}/folders`
            : '/api/folders?limit=1000&depth=2'
          const filesEndpoint = userId
            ? `/api/dashboard/workspace/${userId}/files`
            : '/api/workspace/files'

          const [foldersRes, filesRes] = await Promise.all([
            fetch(foldersEndpoint, { credentials: 'include', cache: 'no-store' }),
            fetch(filesEndpoint, { credentials: 'include', cache: 'no-store' }),
          ])

          if (!foldersRes.ok) {
            throw new Error('Failed to load folders')
          }

          if (!filesRes.ok) {
            throw new Error('Failed to load files')
          }

          const foldersData = await foldersRes.json()
          const filesData = await filesRes.json()

          setExplorerFolders((foldersData.docs || []) as Array<BasicFolderRef & { parentFolder?: BasicFolderRef | null; slug?: string | null }>)
          setExplorerFiles((filesData.files || filesData.docs || []) as Array<{ id: string; name: string; folder?: { id: string | number; name?: string | null; slug?: string | null } | null }>)
        } catch (e) {
          console.error('Error loading explorer data', e)
          setExplorerError('Failed to load workspace data')
        } finally {
          setExplorerLoading(false)
        }
      }

      fetchExplorerData()
    }
  }, [workspaceMode, currentFolderSlug, userId])

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
        <header className="flex items-center justify-between border-b bg-card px-4 py-2">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/" className="text-lg font-semibold">
              CodeHub
            </Link>
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex items-center gap-1 rounded-md border bg-background overflow-hidden">
                <button
                  onClick={() => setWorkspaceMode('explorer')}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    workspaceMode === 'explorer'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background hover:bg-accent'
                  }`}
                  title="Explorer Mode - Browse folders"
                >
                  <FolderOpen className="h-3 w-3" />
                  Explorer
                </button>
                <button
                  onClick={() => setWorkspaceMode('workspace')}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    workspaceMode === 'workspace'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background hover:bg-accent'
                  }`}
                  title="Workspace Mode - Edit code"
                >
                  <LayoutTemplate className="h-3 w-3" />
                  Workspace
                </button>
              </div>
              {scopeFolderSlug && scopedFolder ? (
                <div className="flex items-center gap-1 text-xs text-muted-foreground min-w-0">
                  <Link
                    href="/workspace"
                    className="hover:text-foreground hover:underline transition-colors truncate"
                  >
                    Workspace
                  </Link>
                  {scopedBreadcrumb.map((folder, index) => {
                    const isLast = index === scopedBreadcrumb.length - 1
                    const folderWithSlug = folder as BasicFolderRef & { slug?: string | null }
                    return (
                      <React.Fragment key={folder.id}>
                        <span>/</span>
                        {isLast ? (
                          <span className="truncate font-medium text-foreground">
                            {folder.name || 'Folder'}
                          </span>
                        ) : (
                          <Link
                            href={`/workspace/folder/${folderWithSlug.slug || folder.id}`}
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
          </div>
          <div className="flex items-center gap-2">
          {/* File Explorer Toggle (only in Workspace mode) */}
          {workspaceMode === 'workspace' && (
            <button
              onClick={() => setShowFileExplorer(!showFileExplorer)}
              disabled={uploading}
              className={`flex items-center justify-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm font-medium transition-colors ${
                showFileExplorer
                  ? 'bg-card hover:bg-accent'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              title={showFileExplorer ? 'Hide File Explorer' : 'Show File Explorer'}
            >
              <Folder className="h-4 w-4" />
            </button>
          )}
          {/* Output Toggle */}
          <button
            onClick={() => setShowOutput(!showOutput)}
            disabled={uploading}
            className={`flex items-center justify-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm font-medium transition-colors ${
              showOutput
                ? 'bg-card hover:bg-accent'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title={showOutput ? 'Hide Output' : 'Show Output'}
          >
            <Terminal className="h-4 w-4" />
          </button>
          {/* AI Help Toggle */}
          {selectedFile && (
            <button
              onClick={() => setShowAI(!showAI)}
              disabled={uploading}
              className={`flex items-center justify-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm font-medium transition-colors ${
                showAI
                  ? 'bg-card hover:bg-accent'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              title={showAI ? 'Hide AI Help' : 'Show AI Help'}
            >
              <Sparkles className="h-4 w-4" />
            </button>
          )}
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
          </div>
        </header>
      )}
      
      {/* Dashboard Workspace View - Show controls bar when userId is provided */}
      {userId && (
        <div className="flex items-center gap-2 border-b bg-card px-4 py-2">
          {/* Workspace Mode Toggle */}
          <div className="flex items-center gap-1 rounded-md border bg-background overflow-hidden">
            <button
              onClick={() => setWorkspaceMode('explorer')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition-colors ${
                workspaceMode === 'explorer'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background hover:bg-accent'
              }`}
              title="Explorer Mode - Browse folders"
            >
              <FolderOpen className="h-3 w-3" />
              Explorer
            </button>
            <button
              onClick={() => setWorkspaceMode('workspace')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition-colors ${
                workspaceMode === 'workspace'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background hover:bg-accent'
              }`}
              title="Workspace Mode - Edit code"
            >
              <LayoutTemplate className="h-3 w-3" />
              Workspace
            </button>
          </div>
          {/* File Explorer Toggle (only in Workspace mode) */}
          {workspaceMode === 'workspace' && (
            <button
              onClick={() => setShowFileExplorer(!showFileExplorer)}
              disabled={uploading}
              className={`flex items-center justify-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm font-medium transition-colors ${
                showFileExplorer
                  ? 'bg-card hover:bg-accent'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              title={showFileExplorer ? 'Hide File Explorer' : 'Show File Explorer'}
            >
              <Folder className="h-4 w-4" />
            </button>
          )}
          {/* Output Toggle */}
          <button
            onClick={() => setShowOutput(!showOutput)}
            disabled={uploading}
            className={`flex items-center justify-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm font-medium transition-colors ${
              showOutput
                ? 'bg-card hover:bg-accent'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title={showOutput ? 'Hide Output' : 'Show Output'}
          >
            <Terminal className="h-4 w-4" />
          </button>
          {/* AI Help Toggle */}
          {selectedFile && (
            <button
              onClick={() => setShowAI(!showAI)}
              disabled={uploading}
              className={`flex items-center justify-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm font-medium transition-colors ${
                showAI
                  ? 'bg-card hover:bg-accent'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              title={showAI ? 'Hide AI Help' : 'Show AI Help'}
            >
              <Sparkles className="h-4 w-4" />
            </button>
          )}
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
          {(() => {
            const currentFolder = currentFolderSlug
              ? explorerFolders.find((f) => f.slug === currentFolderSlug || String(f.id) === currentFolderSlug) || null
              : null
            const childFolders = currentFolder
              ? explorerFolders.filter(
                  (f) => f.parentFolder && String(f.parentFolder.id) === String(currentFolder.id)
                )
              : explorerFolders.filter((f) => !f.parentFolder)
            const childFiles = currentFolder
              ? explorerFiles.filter((f) => f.folder && String(f.folder.id) === String(currentFolder.id))
              : explorerFiles.filter((f) => !f.folder)

            // Handler to refresh both explorer data and file explorer
            const handleItemChanged = async () => {
              // Refresh explorer data
              try {
                setExplorerLoading(true)
                setExplorerError(null)

                const foldersEndpoint = userId 
                  ? `/api/dashboard/workspace/${userId}/folders`
                  : '/api/folders?limit=1000&depth=2'
                const filesEndpoint = userId
                  ? `/api/dashboard/workspace/${userId}/files`
                  : '/api/workspace/files'

                const [foldersRes, filesRes] = await Promise.all([
                  fetch(foldersEndpoint, { credentials: 'include', cache: 'no-store' }),
                  fetch(filesEndpoint, { credentials: 'include', cache: 'no-store' }),
                ])

                if (foldersRes.ok && filesRes.ok) {
                  const foldersData = await foldersRes.json()
                  const filesData = await filesRes.json()

                  setExplorerFolders((foldersData.docs || []) as Array<BasicFolderRef & { parentFolder?: BasicFolderRef | null; slug?: string | null }>)
                  setExplorerFiles((filesData.files || filesData.docs || []) as Array<{ id: string; name: string; folder?: { id: string | number; name?: string | null; slug?: string | null } | null }>)
                }
              } catch (e) {
                console.error('Error refreshing explorer data', e)
              } finally {
                setExplorerLoading(false)
              }
              
              // Also refresh file explorer in workspace mode
              setRefreshKey((prev) => prev + 1)
            }

            return (
              <FolderExplorerView
                currentFolder={currentFolder}
                childFolders={childFolders}
                childFiles={childFiles}
                loading={explorerLoading}
                error={explorerError}
                isRoot={!currentFolder}
                allFolders={explorerFolders}
                onOpenFolder={(slug) => {
                  if (slug === '') {
                    setCurrentFolderSlug(null)
                  } else {
                    setCurrentFolderSlug(slug)
                  }
                }}
                onOpenFile={async (fileId) => {
                  // Fetch file content and select it
                  try {
                    const fileRes = await fetch(`/api/files/${fileId}`, {
                      credentials: 'include',
                    })
                    if (fileRes.ok) {
                      const fileData = await fileRes.json()
                      handleFileSelect({
                        id: String(fileData.id),
                        name: fileData.name,
                        content: fileData.content || '',
                      })
                      setWorkspaceMode('workspace')
                    }
                  } catch (error) {
                    console.error('Failed to load file:', error)
                  }
                }}
                onOpenFolderInWorkspace={(slug) => {
                  setCurrentFolderSlug(slug)
                  setWorkspaceMode('workspace')
                }}
                onItemChanged={handleItemChanged}
                readOnly={readOnly}
              />
            )
          })()}
        </div>
      ) : (
        /* Workspace Mode */
        <div className="flex flex-1 overflow-hidden">
          {/* Left: File Explorer */}
          {showFileExplorer && (
            <div className="w-64 border-r bg-muted/30 overflow-hidden">
              <FileExplorer
                key={refreshKey}
                onFileSelect={handleFileSelect}
                selectedFileId={selectedFile?.id}
                onFileSaved={handleFileSaved}
                userId={userId}
                readOnly={readOnly}
                rootFolderSlug={currentFolderSlug || undefined}
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
                readOnly={readOnly}
                allowRunInReadOnly={readOnly}
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
          {showOutput && (
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

            </div>
          )}

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

