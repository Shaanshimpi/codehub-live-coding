'use client'

import React, { useState, useEffect } from 'react'
import { FileTreeItem } from './FileTreeItem'
import { CreateFolderModal } from './CreateFolderModal'
import { CreateFileModal } from './CreateFileModal'
import { FolderPlus, FilePlus } from 'lucide-react'

interface File {
  id: string
  name: string
  content: string
  folder?: {
    id: string
    name: string
  }
}

interface Folder {
  id: string
  name: string
  parentFolder?: {
    id: string
    name: string
  }
  children?: Folder[]
}

interface FileExplorerProps {
  onFileSelect: (file: File) => void
  selectedFileId?: string
  onFileSaved?: () => void
  userId?: string | number
  readOnly?: boolean
  /**
   * Optional folder slug that acts as the root of the visible tree.
   * When provided, only this folder and its descendants are shown.
   */
  rootFolderSlug?: string
}

export function FileExplorer({
  onFileSelect,
  selectedFileId,
  onFileSaved,
  userId,
  readOnly = false,
  rootFolderSlug,
}: FileExplorerProps) {
  const [folders, setFolders] = useState<Folder[]>([])
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const [showCreateFile, setShowCreateFile] = useState(false)

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Determine API endpoints based on userId prop
      const foldersEndpoint = userId 
        ? `/api/dashboard/workspace/${userId}/folders`
        : '/api/folders?limit=1000&depth=2'
      const filesEndpoint = userId
        ? `/api/dashboard/workspace/${userId}/files`
        : '/api/workspace/files'
      
      // Fetch folders and files using workspace API
      const [foldersRes, filesRes] = await Promise.all([
        fetch(foldersEndpoint, { credentials: 'include' }),
        fetch(filesEndpoint, { credentials: 'include' }),
      ])

      if (foldersRes.ok) {
        const foldersData = await foldersRes.json()
        // Dashboard endpoint returns { docs: [...] }, regular endpoint returns { docs: [...] }
        setFolders(foldersData.docs || [])
      } else if (foldersRes.status === 401 || foldersRes.status === 403) {
        console.warn('Not authenticated - please log in to view workspace')
      }

      if (filesRes.ok) {
        const filesData = await filesRes.json()
        // /api/workspace/files returns { files: [...] } format
        // /api/dashboard/workspace/[userId]/files also returns { files: [...] } format
        setFiles(filesData.files || filesData.docs || [])
      } else if (filesRes.status === 401 || filesRes.status === 403) {
        console.warn('Not authenticated - please log in to view workspace')
      }
    } catch (error) {
      console.error('Error fetching workspace data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [userId]) // Refetch when userId changes

  const handleFileClick = (file: File) => {
    onFileSelect(file)
  }

  const handleRefresh = () => {
    fetchData()
  }

  const handleFileDelete = async (fileId: string) => {
    try {
      const res = await fetch(`/api/files/${fileId}/delete`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (res.ok) {
        fetchData()
        if (onFileSaved) {
          onFileSaved()
        }
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
        fetchData()
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
        fetchData()
        if (onFileSaved) {
          onFileSaved()
        }
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
        fetchData()
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
        fetchData()
        if (onFileSaved) {
          onFileSaved()
        }
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
        fetchData()
      } else {
        const error = await res.json().catch(() => ({}))
        alert(error.error || 'Failed to move folder')
      }
    } catch (error) {
      console.error('Failed to move folder:', error)
      alert('Failed to move folder')
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    )
  }

  // Build folder tree structure
  const buildFolderTree = (folders: Folder[]): Folder[] => {
    const folderMap = new Map<string, Folder>()
    const rootFolders: Folder[] = []

    // First pass: create map
    folders.forEach((folder) => {
      folderMap.set(folder.id, { ...folder, children: [] })
    })

    // Second pass: build tree
    folders.forEach((folder) => {
      const folderNode = folderMap.get(folder.id)!
      if (folder.parentFolder && typeof folder.parentFolder === 'object') {
        const parent = folderMap.get(folder.parentFolder.id)
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

  const folderTree = buildFolderTree(folders)
  // Filter root files - files without a folder (folder is undefined or null)
  // When rootFolderSlug is provided, we are in a scoped view and do not show global root files.
  const rootFiles = rootFolderSlug ? [] : files.filter((f) => !f.folder)

  // Get scoped folder name if rootFolderSlug is provided
  const scopedFolder = rootFolderSlug 
    ? folders.find((f) => {
        if ((f as any).slug === rootFolderSlug) return true
        // Fallback: try matching by ID
        if (String(f.id) === rootFolderSlug) return true
        return false
      })
    : null

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
                key={folder.id}
                folder={folder}
                files={files}
                selectedFileId={selectedFileId}
                onFileClick={handleFileClick}
                onFileDelete={readOnly ? undefined : handleFileDelete}
                onFolderDelete={readOnly ? undefined : handleFolderDelete}
                onFileRename={readOnly ? undefined : handleFileRename}
                onFolderRename={readOnly ? undefined : handleFolderRename}
                onFileMove={readOnly ? undefined : handleFileMove}
                onFolderMove={readOnly ? undefined : handleFolderMove}
                allFolders={folders}
                readOnly={readOnly}
                level={0}
              />
            ))}

            {/* Root Files */}
            {rootFiles.map((file) => (
              <FileTreeItem
                key={file.id}
                file={file}
                selectedFileId={selectedFileId}
                onFileClick={handleFileClick}
                onFileDelete={readOnly ? undefined : handleFileDelete}
                onFolderDelete={readOnly ? undefined : handleFolderDelete}
                onFileRename={readOnly ? undefined : handleFileRename}
                onFolderRename={readOnly ? undefined : handleFolderRename}
                onFileMove={readOnly ? undefined : handleFileMove}
                onFolderMove={readOnly ? undefined : handleFolderMove}
                allFolders={folders}
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
          folders={folders}
          currentFolderId={scopedFolder?.id}
          onClose={() => setShowCreateFolder(false)}
          onSuccess={() => {
            setShowCreateFolder(false)
            fetchData()
          }}
        />
      )}

      {showCreateFile && (
        <CreateFileModal
          folders={folders}
          currentFolderId={scopedFolder?.id}
          onClose={() => setShowCreateFile(false)}
          onSuccess={() => {
            setShowCreateFile(false)
            fetchData()
          }}
        />
      )}
    </div>
  )
}

