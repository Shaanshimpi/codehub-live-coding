'use client'

import React, { useState, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { FileTreeItem } from './FileTreeItem'
import { CreateFolderModal } from './CreateFolderModal'
import { CreateFileModal } from './CreateFileModal'
import { FolderPlus, FilePlus } from 'lucide-react'
import { useWorkspaceData, invalidateWorkspaceData } from '@/hooks/workspace/useWorkspaceData'
import type { Folder, WorkspaceFileWithFolder } from '@/types/workspace'

type WorkspaceFile = WorkspaceFileWithFolder

// Local File type for onFileSelect callback (includes content)
interface FileWithContent {
  id: string
  name: string
  content: string
  folder?: {
    id: string | number
    name?: string | null
  } | null
}

// Extended Folder type with children for tree structure
interface FolderWithChildren extends Folder {
  children?: FolderWithChildren[]
}

interface FileExplorerProps {
  onFileSelect: (file: FileWithContent) => void
  selectedFileId?: string
  onFileSaved?: () => void
  userId?: string | number
  readOnly?: boolean
  /**
   * Optional folder slug that acts as the root of the visible tree.
   * When provided, only this folder and its descendants are shown.
   */
  rootFolderSlug?: string
  /**
   * Optional refresh trigger. When this value changes, the workspace cache is invalidated.
   * This replaces the need for the key prop to force remounting.
   */
  refreshTrigger?: number
}

export const FileExplorer = React.memo(function FileExplorer({
  onFileSelect,
  selectedFileId,
  onFileSaved,
  userId,
  readOnly = false,
  rootFolderSlug,
  refreshTrigger,
}: FileExplorerProps) {
  const queryClient = useQueryClient()
  const { folders, files, isLoading, refetch } = useWorkspaceData(userId)
  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const [showCreateFile, setShowCreateFile] = useState(false)

  // Debug: Log component mount/unmount
  React.useEffect(() => {
    console.log('[FileExplorer] 🟢 Component mounted', { userId, rootFolderSlug })
    return () => {
      console.log('[FileExplorer] 🔴 Component unmounted', { userId, rootFolderSlug })
    }
  }, [userId, rootFolderSlug])

  // Invalidate cache when refreshTrigger changes (only when explicitly changed, not on mount)
  const prevRefreshTriggerRef = React.useRef<number | undefined>(refreshTrigger)
  React.useEffect(() => {
    // Only invalidate if refreshTrigger actually changed (not just on initial mount)
    if (refreshTrigger !== undefined && refreshTrigger !== prevRefreshTriggerRef.current) {
      console.log('[FileExplorer] Refresh trigger changed, invalidating cache', { 
        prev: prevRefreshTriggerRef.current, 
        current: refreshTrigger, 
        userId 
      })
      invalidateWorkspaceData(queryClient, userId)
      prevRefreshTriggerRef.current = refreshTrigger
    }
  }, [refreshTrigger, queryClient, userId])

  const handleFileClick = (file: WorkspaceFile) => {
    // Convert WorkspaceFile to FileWithContent for callback
    // Note: content will be fetched separately via useFileContent hook
    onFileSelect({
      id: file.id,
      name: file.name,
      content: '', // Content will be fetched when file is selected
      folder: file.folder || undefined,
    })
  }

  const handleRefresh = () => {
    console.log('[FileExplorer] Manual refresh triggered', { userId })
    invalidateWorkspaceData(queryClient, userId)
    refetch()
  }

  // Helper function to invalidate cache after mutations
  const invalidateCache = () => {
    console.log('[FileExplorer] Invalidating cache after mutation', { userId })
    invalidateWorkspaceData(queryClient, userId)
    if (onFileSaved) {
      onFileSaved()
    }
  }

  const handleFileDelete = async (fileId: string) => {
    try {
      const res = await fetch(`/api/files/${fileId}/delete`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (res.ok) {
        invalidateCache()
      } else {
        const error = await res.json().catch(() => ({}))
        alert(error.error || 'Failed to delete file')
      }
    } catch (error) {
      console.error('Failed to delete file:', error)
      alert('Failed to delete file')
    }
  }

  const handleFolderDelete = async (folderId: string) => {
    try {
      const res = await fetch(`/api/folders/${folderId}/delete`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (res.ok) {
        invalidateCache()
      } else {
        const error = await res.json().catch(() => ({}))
        alert(error.error || 'Failed to delete folder')
      }
    } catch (error) {
      console.error('Failed to delete folder:', error)
      alert('Failed to delete folder')
    }
  }

  const handleFileRename = async (fileId: string, newName: string) => {
    try {
      const res = await fetch(`/api/files/${fileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: newName }),
      })
      if (res.ok) {
        invalidateCache()
      } else {
        const error = await res.json().catch(() => ({}))
        alert(error.error || 'Failed to rename file')
      }
    } catch (error) {
      console.error('Failed to rename file:', error)
      alert('Failed to rename file')
    }
  }

  const handleFolderRename = async (folderId: string, newName: string) => {
    try {
      const res = await fetch(`/api/folders/${folderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: newName }),
      })
      if (res.ok) {
        invalidateCache()
      } else {
        const error = await res.json().catch(() => ({}))
        alert(error.error || 'Failed to rename folder')
      }
    } catch (error) {
      console.error('Failed to rename folder:', error)
      alert('Failed to rename folder')
    }
  }

  const handleFileMove = async (fileId: string, newFolderId: string | number | null) => {
    try {
      const res = await fetch(`/api/files/${fileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ folder: newFolderId }),
      })
      if (res.ok) {
        invalidateCache()
      } else {
        const error = await res.json().catch(() => ({}))
        alert(error.error || 'Failed to move file')
      }
    } catch (error) {
      console.error('Failed to move file:', error)
      alert('Failed to move file')
    }
  }

  const handleFolderMove = async (folderId: string, newParentId: string | number | null) => {
    try {
      const res = await fetch(`/api/folders/${folderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ parentFolder: newParentId }),
      })
      if (res.ok) {
        invalidateCache()
      } else {
        const error = await res.json().catch(() => ({}))
        alert(error.error || 'Failed to move folder')
      }
    } catch (error) {
      console.error('Failed to move folder:', error)
      alert('Failed to move folder')
    }
  }

  // Build folder tree structure (memoized for performance)
  // Must be called before any early returns to follow React Hooks rules
  const folderTree = useMemo(() => {
    const buildFolderTree = (folders: Folder[]): FolderWithChildren[] => {
      const folderMap = new Map<string, FolderWithChildren>()
      const rootFolders: FolderWithChildren[] = []

      // First pass: create map
      folders.forEach((folder) => {
        folderMap.set(String(folder.id), { ...folder, children: [] } as FolderWithChildren)
      })

      // Second pass: build tree
      folders.forEach((folder) => {
        const folderNode = folderMap.get(String(folder.id))!
        if (folder.parentFolder && typeof folder.parentFolder === 'object') {
          const parent = folderMap.get(String(folder.parentFolder.id))
          if (parent) {
            parent.children = parent.children || []
            parent.children.push(folderNode)
          } else {
            rootFolders.push(folderNode)
          }
        } else {
          rootFolders.push(folderNode)
        }
      })

      // If a rootFolderSlug is provided and exists, use that folder as the only root
      if (rootFolderSlug) {
        // Try to find the folder by slug, with fallback to ID for backward compatibility
        const scopedRoot = Array.from(folderMap.values()).find((f) => {
          if ((f as any).slug === rootFolderSlug) return true
          // Fallback: try matching by ID
          if (String(f.id) === rootFolderSlug) return true
          return false
        })
        if (scopedRoot) {
          return [scopedRoot]
        }
        // If folder not found, return empty array (scoped view with invalid folder)
        return []
      }

      return rootFolders
    }

    return buildFolderTree(folders)
  }, [folders, rootFolderSlug])

  // Filter root files - files without a folder (folder is undefined or null)
  // When rootFolderSlug is provided, we are in a scoped view and do not show global root files.
  const rootFiles = useMemo(() => {
    return rootFolderSlug ? [] : files.filter((f) => !f.folder)
  }, [files, rootFolderSlug])

  // Get scoped folder name if rootFolderSlug is provided
  const scopedFolder = rootFolderSlug 
    ? folders.find((f) => {
        if ((f as any).slug === rootFolderSlug) return true
        // Fallback: try matching by ID
        if (String(f.id) === rootFolderSlug) return true
        return false
      })
    : null

  // Convert Folder to FileTreeItem's expected format
  const convertFolderForTreeItem = (folder: FolderWithChildren): any => ({
    id: String(folder.id),
    name: folder.name,
    parent: folder.parentFolder ? {
      id: String(folder.parentFolder.id),
      name: folder.parentFolder.name || '',
    } : undefined,
    children: folder.children?.map(convertFolderForTreeItem),
  })

  // Convert WorkspaceFile to FileTreeItem's expected format
  const convertFileForTreeItem = (file: WorkspaceFile): any => ({
    id: file.id,
    name: file.name,
    content: '', // Content will be fetched when file is selected
    folder: file.folder ? {
      id: String(file.folder.id),
      name: file.folder.name || '',
    } : undefined,
  })

  // Convert folders array for modals (CreateFolderModal expects FolderOption[], CreateFileModal expects Folder[])
  const convertedFolders = folders.map((f) => ({
    id: String(f.id),
    name: f.name || '',
    parentFolder: f.parentFolder ? {
      id: String(f.parentFolder.id),
      name: f.parentFolder.name || undefined,
    } : undefined,
  }))

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b bg-card px-3 py-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            {scopedFolder ? scopedFolder.name || 'Folder' : 'My Workspace'}
          </h2>
          <button
            onClick={handleRefresh}
            className="text-xs text-muted-foreground hover:text-foreground"
            title="Refresh"
          >
            ↻
          </button>
        </div>
      </div>

      {/* Actions */}
      {!readOnly && (
        <div className="border-b bg-muted/30 px-2 py-1.5 flex gap-1">
          <button
            onClick={() => setShowCreateFolder(true)}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs hover:bg-accent transition-colors"
            title="New Folder"
          >
            <FolderPlus className="h-3 w-3" />
            Folder
          </button>
          <button
            onClick={() => setShowCreateFile(true)}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs hover:bg-accent transition-colors"
            title="New File"
          >
            <FilePlus className="h-3 w-3" />
            File
          </button>
        </div>
      )}

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto p-2">
        {folderTree.length === 0 && rootFiles.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">No files yet</p>
            <p className="text-xs text-muted-foreground mt-1">Create a file to get started</p>
          </div>
        ) : (
          <>
            {/* Folders */}
            {folderTree.map((folder) => (
              <FileTreeItem
                key={String(folder.id)}
                folder={convertFolderForTreeItem(folder)}
                files={files.map(convertFileForTreeItem)}
                selectedFileId={selectedFileId}
                onFileClick={handleFileClick}
                onFileDelete={readOnly ? undefined : handleFileDelete}
                onFolderDelete={readOnly ? undefined : handleFolderDelete}
                onFileRename={readOnly ? undefined : handleFileRename}
                onFolderRename={readOnly ? undefined : handleFolderRename}
                onFileMove={readOnly ? undefined : handleFileMove}
                onFolderMove={readOnly ? undefined : handleFolderMove}
                allFolders={convertedFolders}
                readOnly={readOnly}
                level={0}
              />
            ))}

            {/* Root Files */}
            {rootFiles.map((file) => (
              <FileTreeItem
                key={file.id}
                file={convertFileForTreeItem(file)}
                selectedFileId={selectedFileId}
                onFileClick={handleFileClick}
                onFileDelete={readOnly ? undefined : handleFileDelete}
                onFolderDelete={readOnly ? undefined : handleFolderDelete}
                onFileRename={readOnly ? undefined : handleFileRename}
                onFolderRename={readOnly ? undefined : handleFolderRename}
                onFileMove={readOnly ? undefined : handleFileMove}
                onFolderMove={readOnly ? undefined : handleFolderMove}
                allFolders={convertedFolders}
                readOnly={readOnly}
                level={0}
              />
            ))}
          </>
        )}
      </div>

      {/* Modals */}
      {showCreateFolder && (
        <CreateFolderModal
          folders={convertedFolders}
          currentFolderId={scopedFolder ? String(scopedFolder.id) : undefined}
          onClose={() => setShowCreateFolder(false)}
          onSuccess={() => {
            setShowCreateFolder(false)
            invalidateCache()
          }}
        />
      )}

      {showCreateFile && (
        <CreateFileModal
          folders={convertedFolders}
          currentFolderId={scopedFolder ? String(scopedFolder.id) : undefined}
          onClose={() => setShowCreateFile(false)}
          onSuccess={() => {
            setShowCreateFile(false)
            invalidateCache()
          }}
        />
      )}
    </div>
  )
})

