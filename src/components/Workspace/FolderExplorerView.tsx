'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Folder as FolderIcon, File as FileIcon, ArrowLeft, LayoutTemplate, MoreVertical, Edit2, FolderOpen, Trash2, FolderPlus, FilePlus } from 'lucide-react'

import type { BasicFolderRef } from '@/utilities/workspaceScope'
import { buildFolderPathChain } from '@/utilities/workspaceScope'
import { RenameItemModal } from './RenameItemModal'
import { MoveItemModal } from './MoveItemModal'
import { CreateFolderModal } from './CreateFolderModal'
import { CreateFileModal } from './CreateFileModal'
import type { Folder, WorkspaceFileWithFolder } from '@/types/workspace'

type WorkspaceFile = WorkspaceFileWithFolder

interface FolderExplorerViewProps {
  /** Current folder being viewed (null for root) */
  currentFolder: Folder | null
  /** Direct child folders of currentFolder */
  childFolders: Folder[]
  /** Files in currentFolder */
  childFiles: WorkspaceFile[]
  /** Loading state */
  loading: boolean
  /** Error message */
  error: string | null
  /** Whether this is the root view */
  isRoot?: boolean
  /** Link to go back (for non-root views) */
  backLink?: string
  /** Function to open full workspace editor (for root view) */
  onOpenFullWorkspace?: () => void
  /** Function to open a folder (for internal navigation, e.g., in session) */
  onOpenFolder?: (folderId: string | number) => void
  /** Function to open a file (for internal navigation, e.g., in session) */
  onOpenFile?: (fileId: string) => void
  /** Function to open a folder in workspace mode (switches mode and sets folder context) */
  onOpenFolderInWorkspace?: (folderId: string | number) => void
  /** All folders (needed for breadcrumb navigation when using callbacks) */
  allFolders?: Folder[]
  /** Callback when item is renamed/moved/deleted (to refresh data) */
  onItemChanged?: () => void
  /** Whether actions are read-only */
  readOnly?: boolean
}

export function FolderExplorerView({
  currentFolder,
  childFolders,
  childFiles,
  loading,
  error,
  isRoot = false,
  backLink,
  onOpenFullWorkspace,
  onOpenFolder,
  onOpenFile,
  onOpenFolderInWorkspace,
  allFolders = [],
  onItemChanged,
  readOnly = false,
}: FolderExplorerViewProps) {
  const breadcrumb = currentFolder ? buildFolderPathChain(currentFolder) : []
  const [showRenameModal, setShowRenameModal] = useState<{ type: 'file' | 'folder'; id: string; name: string } | null>(null)
  const [showMoveModal, setShowMoveModal] = useState<{ type: 'file' | 'folder'; id: string; currentParentId: string | number | null } | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ type: 'file' | 'folder'; id: string; name: string } | null>(null)
  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const [showCreateFile, setShowCreateFile] = useState(false)

  // Helper to handle folder opening
  const handleOpenFolder = (folder: Folder) => {
    if (onOpenFolder && folder.id) {
      onOpenFolder(folder.id)
    } else if (folder.id) {
      // Fallback to Link navigation for standalone workspace
      window.location.href = `/workspace/explorer/${folder.id}`
    }
  }

  // Helper to handle file opening
  const handleOpenFile = (file: WorkspaceFile) => {
    if (onOpenFile) {
      onOpenFile(file.id)
    } else if (currentFolder?.id) {
      // Fallback to Link navigation for standalone workspace
      window.location.href = `/workspace/folder/${currentFolder.id}?fileId=${file.id}`
    } else {
      window.location.href = `/workspace?fileId=${file.id}`
    }
  }

  // Handlers for rename/move/delete
  const handleRename = async (type: 'file' | 'folder', id: string, newName: string) => {
    try {
      const endpoint = type === 'file' ? `/api/files/${id}` : `/api/folders/${id}`
      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: newName }),
      })
      if (res.ok && onItemChanged) {
        onItemChanged()
      } else if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        alert(error.error || `Failed to rename ${type}`)
      }
    } catch (error) {
      console.error(`Failed to rename ${type}:`, error)
      alert(`Failed to rename ${type}`)
    }
  }

  const handleMove = async (type: 'file' | 'folder', id: string, newParentId: string | number | null) => {
    try {
      const endpoint = type === 'file' ? `/api/files/${id}` : `/api/folders/${id}`
      const body = type === 'file' ? { folder: newParentId } : { parentFolder: newParentId }
      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })
      if (res.ok && onItemChanged) {
        onItemChanged()
      } else if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        alert(error.error || `Failed to move ${type}`)
      }
    } catch (error) {
      console.error(`Failed to move ${type}:`, error)
      alert(`Failed to move ${type}`)
    }
  }

  const handleDelete = async (type: 'file' | 'folder', id: string) => {
    try {
      const endpoint = type === 'file' ? `/api/files/${id}/delete` : `/api/folders/${id}/delete`
      const res = await fetch(endpoint, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (res.ok && onItemChanged) {
        onItemChanged()
      } else if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        alert(error.error || `Failed to delete ${type}`)
      }
    } catch (error) {
      console.error(`Failed to delete ${type}:`, error)
      alert(`Failed to delete ${type}`)
    }
  }

  // Helper to navigate back in breadcrumb
  const handleBreadcrumbClick = (folder: BasicFolderRef & { slug?: string | null }, index: number) => {
    if (!onOpenFolder) return
    
    // Find the parent of this folder
    const folderInList = allFolders.find((f) => String(f.id) === String(folder.id))
    if (folderInList?.parentFolder) {
      const parent = allFolders.find((f) => String(f.id) === String(folderInList.parentFolder!.id))
      if (parent?.id) {
        onOpenFolder(parent.id)
      } else {
        onOpenFolder('') // Go to root
      }
    } else {
      onOpenFolder('') // Go to root
    }
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden" data-testid="folder-explorer-view">
      {/* Header with breadcrumb */}
      <header className="flex items-center justify-between border-b bg-card px-4 py-2">
        <div className="flex flex-1 items-center gap-3 overflow-hidden">
          {!isRoot && (backLink || onOpenFolder) && (
            <>
              {onOpenFolder ? (
                <button
                  onClick={() => {
                    if (currentFolder?.parentFolder) {
                      const parent = allFolders.find(
                        (f) => String(f.id) === String(currentFolder.parentFolder!.id)
                      )
                      if (parent?.id) {
                        onOpenFolder(parent.id)
                      } else {
                        onOpenFolder('') // Go to root
                      }
                    } else {
                      onOpenFolder('') // Go to root
                    }
                  }}
                  className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-[10px] font-medium hover:bg-accent transition-colors"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Back
                </button>
              ) : backLink ? (
                <Link
                  href={backLink}
                  className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-[10px] font-medium hover:bg-accent transition-colors"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Back
                </Link>
              ) : null}
            </>
          )}
          <div className="flex min-w-0 flex-col">
            <span className="text-xs font-semibold text-muted-foreground">
              {isRoot ? 'Workspace Explorer' : 'Folder Explorer'}
            </span>
            <div className="flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground" data-testid="breadcrumb">
              {onOpenFolder ? (
                <button
                  onClick={() => onOpenFolder('')}
                  className="hover:text-foreground hover:underline transition-colors"
                >
                  My Workspace
                </button>
              ) : (
                <Link
                  href="/workspace"
                  className="hover:text-foreground hover:underline transition-colors"
                >
                  My Workspace
                </Link>
              )}
              {breadcrumb.map((folder, index) => {
                const isLast = index === breadcrumb.length - 1
                const folderWithSlug = folder as BasicFolderRef & { slug?: string | null }
                return (
                  <React.Fragment key={folder.id}>
                    <span>/</span>
                    {isLast ? (
                      <span className="font-medium text-foreground">
                        {folder.name || 'Untitled'}
                      </span>
                    ) : onOpenFolder ? (
                      <button
                        onClick={() => handleBreadcrumbClick(folderWithSlug, index)}
                        className="hover:text-foreground hover:underline transition-colors"
                      >
                        {folder.name || 'Untitled'}
                      </button>
                    ) : (
                      <Link
                        href={`/workspace/explorer/${folder.id}`}
                        className="hover:text-foreground hover:underline transition-colors"
                      >
                        {folder.name || 'Untitled'}
                      </Link>
                    )}
                  </React.Fragment>
                )
              })}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!readOnly && (
            <>
              <button
                type="button"
                onClick={() => setShowCreateFolder(true)}
                className="inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
                title="Create new folder"
              >
                <FolderPlus className="h-3.5 w-3.5" />
                New Folder
              </button>
              <button
                type="button"
                onClick={() => setShowCreateFile(true)}
                className="inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
                title="Create new file"
              >
                <FilePlus className="h-3.5 w-3.5" />
                New File
              </button>
            </>
          )}
          {isRoot && onOpenFullWorkspace ? (
            <button
              type="button"
              onClick={onOpenFullWorkspace}
              className="inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
            >
              <LayoutTemplate className="h-3.5 w-3.5" />
              Open full workspace editor
            </button>
          ) : currentFolder && onOpenFolderInWorkspace ? (
            <button
              type="button"
              onClick={() => onOpenFolderInWorkspace(currentFolder.id)}
              className="inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
              title="Open this folder in Workspace editor view"
            >
              <LayoutTemplate className="h-3.5 w-3.5" />
              Open in Workspace
            </button>
          ) : currentFolder ? (
            <Link
              href={`/workspace/folder/${currentFolder.id}`}
              className="inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
              title="Open this folder in Workspace editor view"
            >
              <LayoutTemplate className="h-3.5 w-3.5" />
              Open in Workspace
            </Link>
          ) : null}
        </div>
      </header>

      <main className="flex-1 overflow-auto bg-muted/20">
        <div className="mx-auto flex h-full max-w-5xl flex-col gap-4 px-4 py-4">
          {loading ? (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-sm text-muted-foreground">
                {isRoot ? 'Loading workspace...' : 'Loading folder…'}
              </p>
            </div>
          ) : error ? (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          ) : !isRoot && !currentFolder ? (
            <div className="flex flex-1 flex-col items-center justify-center text-center gap-2">
              <FolderIcon className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Folder not found</p>
              <p className="text-xs text-muted-foreground">
                It may have been deleted or you do not have access.
              </p>
            </div>
          ) : childFolders.length === 0 && childFiles.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center text-center gap-2">
              <FolderIcon className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                {isRoot ? 'No folders or files yet' : 'This folder is empty'}
              </p>
              <p className="text-xs text-muted-foreground">
                {isRoot
                  ? 'Create a folder or file from the full workspace editor to get started.'
                  : 'You can create files and folders from the workspace editor.'}
              </p>
              {isRoot && onOpenFullWorkspace && (
                <button
                  type="button"
                  onClick={onOpenFullWorkspace}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <LayoutTemplate className="h-3.5 w-3.5" />
                  Open full workspace editor
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Child folders */}
              {childFolders.length > 0 && (
                <section>
                  <h2 className="mb-2 text-xs font-semibold text-muted-foreground">
                    {isRoot ? 'Root folders' : 'Subfolders'}
                  </h2>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {childFolders.map((folder) => (
                      <FolderCard
                        key={folder.id}
                        folder={folder}
                        currentFolder={currentFolder}
                        readOnly={readOnly}
                        onOpenFolder={() => handleOpenFolder(folder)}
                        onOpenInWorkspace={onOpenFolderInWorkspace ? () => onOpenFolderInWorkspace(folder.id) : undefined}
                        onRename={() => setShowRenameModal({ type: 'folder', id: String(folder.id), name: folder.name || 'Untitled' })}
                        onMove={() => setShowMoveModal({ type: 'folder', id: String(folder.id), currentParentId: currentFolder?.id || null })}
                        onDelete={() => {
                          if (window.confirm(`Are you sure you want to delete folder "${folder.name}"? This will also delete all files inside.`)) {
                            handleDelete('folder', String(folder.id))
                          }
                        }}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Files in this folder */}
              {childFiles.length > 0 && (
                <section>
                  <h2 className="mb-2 text-xs font-semibold text-muted-foreground">
                    {isRoot ? 'Files at root' : 'Files'}
                  </h2>
                  <div className="flex flex-col gap-1">
                    {childFiles.map((file) => (
                      <FileCard
                        key={file.id}
                        file={file}
                        currentFolder={currentFolder}
                        readOnly={readOnly}
                        onOpenFile={() => handleOpenFile(file)}
                        onRename={() => setShowRenameModal({ type: 'file', id: file.id, name: file.name })}
                        onMove={() => setShowMoveModal({ type: 'file', id: file.id, currentParentId: currentFolder?.id || null })}
                        onDelete={() => {
                          if (window.confirm(`Are you sure you want to delete "${file.name}"?`)) {
                            handleDelete('file', file.id)
                          }
                        }}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      {showRenameModal && (
        <RenameItemModal
          isOpen={true}
          itemType={showRenameModal.type}
          currentName={showRenameModal.name}
          itemId={showRenameModal.id}
          onClose={() => setShowRenameModal(null)}
          onSuccess={() => {
            setShowRenameModal(null)
            if (onItemChanged) onItemChanged()
          }}
        />
      )}
      {showMoveModal && (
        <MoveItemModal
          isOpen={true}
          itemType={showMoveModal.type}
          itemId={showMoveModal.id}
          currentParentId={showMoveModal.currentParentId}
          folders={allFolders.filter(f => f.name).map(f => ({ 
            id: f.id, 
            name: f.name!, 
            parentFolder: f.parentFolder ? { id: f.parentFolder.id, name: f.parentFolder.name || undefined } : null 
          }))}
          onClose={() => setShowMoveModal(null)}
          onSuccess={() => {
            setShowMoveModal(null)
            if (onItemChanged) onItemChanged()
          }}
        />
      )}
      {showCreateFolder && (
        <CreateFolderModal
          folders={allFolders.filter(f => f.name).map(f => ({ 
            id: String(f.id), 
            name: f.name!, 
            parentFolder: f.parentFolder ? { id: String(f.parentFolder.id), name: f.parentFolder.name || undefined } : undefined 
          }))}
          currentFolderId={currentFolder?.id || null}
          onClose={() => setShowCreateFolder(false)}
          onSuccess={() => {
            setShowCreateFolder(false)
            if (onItemChanged) onItemChanged()
          }}
        />
      )}
      {showCreateFile && (
        <CreateFileModal
          folders={allFolders.filter(f => f.name).map(f => ({ 
            id: String(f.id), 
            name: f.name!, 
            parentFolder: f.parentFolder ? { id: String(f.parentFolder.id), name: f.parentFolder.name || undefined } : undefined 
          }))}
          currentFolderId={currentFolder?.id || null}
          onClose={() => setShowCreateFile(false)}
          onSuccess={() => {
            setShowCreateFile(false)
            if (onItemChanged) onItemChanged()
          }}
        />
      )}
    </div>
  )
}

// Helper component for folder card with actions
function FolderCard({
  folder,
  currentFolder,
  readOnly,
  onOpenFolder,
  onOpenInWorkspace,
  onRename,
  onMove,
  onDelete,
}: {
  folder: Folder
  currentFolder: Folder | null
  readOnly: boolean
  onOpenFolder: () => void
  onOpenInWorkspace?: () => void
  onRename: () => void
  onMove: () => void
  onDelete: () => void
}) {
  const [showMenu, setShowMenu] = useState(false)

  return (
    <div className="group relative flex flex-col justify-between rounded-lg border bg-card px-3 py-2 shadow-sm hover:bg-accent/40 transition-colors" data-testid="folder-item">
      <div className="flex items-center justify-between gap-2">
        <div
          onClick={onOpenFolder}
          className="flex items-center gap-2 flex-1 cursor-pointer min-w-0"
          title="Open this folder in Explorer view"
        >
          <FolderIcon className="h-4 w-4 text-primary" />
          <span className="truncate text-sm font-medium">{folder.name || 'Untitled'}</span>
        </div>
        {!readOnly && (
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowMenu(!showMenu)
              }}
              className="opacity-0 group-hover:opacity-100 hover:bg-accent rounded p-1 transition-opacity"
              title="Folder actions"
            >
              <MoreVertical className="h-3 w-3" />
            </button>
            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-6 z-20 w-40 rounded-md border bg-card shadow-lg">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowMenu(false)
                      onRename()
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-accent text-left"
                  >
                    <Edit2 className="h-3 w-3" />
                    Rename
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowMenu(false)
                      onMove()
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-accent text-left"
                  >
                    <FolderOpen className="h-3 w-3" />
                    Move
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowMenu(false)
                      onDelete()
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-destructive/20 text-destructive text-left"
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
      <div className="mt-3 flex gap-2">
        <button
          onClick={onOpenFolder}
          className="flex-1 rounded-md border px-2 py-1 text-xs text-foreground bg-background/60 text-center hover:bg-background transition-colors"
        >
          Open in Explorer
        </button>
        {onOpenInWorkspace ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onOpenInWorkspace()
            }}
            className="flex-1 rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors text-center"
            title="Open this folder in Workspace editor view"
          >
            Open in Workspace
          </button>
        ) : (
          <Link
            href={`/workspace/folder/${folder.id}`}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors text-center"
            title="Open this folder in Workspace editor view"
          >
            Open in Workspace
          </Link>
        )}
      </div>
    </div>
  )
}

// Helper component for file card with actions
function FileCard({
  file,
  currentFolder,
  readOnly,
  onOpenFile,
  onRename,
  onMove,
  onDelete,
}: {
  file: WorkspaceFile
  currentFolder: Folder | null
  readOnly: boolean
  onOpenFile: () => void
  onRename: () => void
  onMove: () => void
  onDelete: () => void
}) {
  const [showMenu, setShowMenu] = useState(false)

  return (
    <div className="group flex items-center justify-between rounded-md border bg-card px-3 py-1.5 text-xs" data-testid="file-item">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <FileIcon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="truncate">{file.name}</span>
      </div>
      <div className="flex items-center gap-1">
        {!readOnly && (
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowMenu(!showMenu)
              }}
              className="opacity-0 group-hover:opacity-100 hover:bg-accent rounded p-1 transition-opacity"
              title="File actions"
            >
              <MoreVertical className="h-3 w-3" />
            </button>
            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-6 z-20 w-40 rounded-md border bg-card shadow-lg">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowMenu(false)
                      onRename()
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-accent text-left"
                  >
                    <Edit2 className="h-3 w-3" />
                    Rename
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowMenu(false)
                      onMove()
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-accent text-left"
                  >
                    <FolderOpen className="h-3 w-3" />
                    Move
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowMenu(false)
                      onDelete()
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-destructive/20 text-destructive text-left"
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        )}
        <button
          onClick={onOpenFile}
          className="ml-2 rounded-md border px-2 py-0.5 text-[10px] hover:bg-accent transition-colors"
          title="Open this file in Workspace editor view"
        >
          Open
        </button>
      </div>
    </div>
  )
}

