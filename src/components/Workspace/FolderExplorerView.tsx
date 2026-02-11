'use client'

import React from 'react'
import Link from 'next/link'
import { Folder as FolderIcon, File as FileIcon, ArrowLeft, LayoutTemplate } from 'lucide-react'

import type { BasicFolderRef } from '@/utilities/workspaceScope'
import { buildFolderPathChain } from '@/utilities/workspaceScope'

type Folder = BasicFolderRef & {
  parentFolder?: BasicFolderRef | null
  slug?: string | null
}

type WorkspaceFile = {
  id: string
  name: string
  folder?: {
    id: string | number
    name?: string | null
  } | null
}

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
}: FolderExplorerViewProps) {
  const breadcrumb = currentFolder ? buildFolderPathChain(currentFolder) : []

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      {/* Header with breadcrumb */}
      <header className="flex items-center justify-between border-b bg-card px-4 py-2">
        <div className="flex flex-1 items-center gap-3 overflow-hidden">
          {!isRoot && backLink && (
            <Link
              href={backLink}
              className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-[10px] font-medium hover:bg-accent transition-colors"
            >
              <ArrowLeft className="h-3 w-3" />
              {isRoot ? 'Workspace' : 'Back'}
            </Link>
          )}
          <div className="flex min-w-0 flex-col">
            <span className="text-xs font-semibold text-muted-foreground">
              {isRoot ? 'Workspace Explorer' : 'Folder Explorer'}
            </span>
            <div className="flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
              <Link
                href="/workspace"
                className="hover:text-foreground hover:underline transition-colors"
              >
                My Workspace
              </Link>
              {breadcrumb.map((folder, index) => {
                const isLast = index === breadcrumb.length - 1
                return (
                  <React.Fragment key={folder.id}>
                    <span>/</span>
                    {isLast ? (
                      <span className="font-medium text-foreground">
                        {folder.name || 'Untitled'}
                      </span>
                    ) : (
                      <Link
                        href={`/workspace/explorer/${folder.slug || folder.id}`}
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
          {isRoot && onOpenFullWorkspace ? (
            <button
              type="button"
              onClick={onOpenFullWorkspace}
              className="inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
            >
              <LayoutTemplate className="h-3.5 w-3.5" />
              Open full workspace editor
            </button>
          ) : currentFolder ? (
            <Link
              href={`/workspace/folder/${currentFolder.slug || currentFolder.id}`}
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
                      <Link
                        key={folder.id}
                        href={`/workspace/explorer/${folder.slug || folder.id}`}
                        className="flex flex-col justify-between rounded-lg border bg-card px-3 py-2 shadow-sm hover:bg-accent/40 transition-colors cursor-pointer"
                        title="Open this folder in Explorer view"
                      >
                        <div className="flex items-center gap-2">
                          <FolderIcon className="h-4 w-4 text-primary" />
                          <span className="truncate text-sm font-medium">{folder.name || 'Untitled'}</span>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <span className="flex-1 rounded-md border px-2 py-1 text-xs text-foreground bg-background/60 text-center">
                            Open in Explorer
                          </span>
                          <Link
                            href={`/workspace/folder/${folder.slug || folder.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex-1 rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors text-center"
                            title="Open this folder in Workspace editor view"
                          >
                            Open in Workspace
                          </Link>
                        </div>
                      </Link>
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
                      <div
                        key={file.id}
                        className="flex items-center justify-between rounded-md border bg-card px-3 py-1.5 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="truncate">{file.name}</span>
                        </div>
                        {currentFolder ? (
                          <Link
                            href={`/workspace/folder/${currentFolder.slug || currentFolder.id}`}
                            className="ml-2 rounded-md border px-2 py-0.5 text-[10px] hover:bg-accent transition-colors"
                            title="Open this folder in Workspace editor view"
                          >
                            Open in Workspace
                          </Link>
                        ) : onOpenFullWorkspace ? (
                          <button
                            type="button"
                            onClick={onOpenFullWorkspace}
                            className="ml-2 rounded-md border px-2 py-0.5 text-[10px] hover:bg-accent transition-colors"
                          >
                            Open in Workspace
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

