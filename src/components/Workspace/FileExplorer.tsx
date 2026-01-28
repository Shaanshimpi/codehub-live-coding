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
  parent?: {
    id: string
    name: string
  }
  children?: Folder[]
}

interface FileExplorerProps {
  onFileSelect: (file: File) => void
  selectedFileId?: string
  onFileSaved?: () => void
}

export function FileExplorer({ onFileSelect, selectedFileId, onFileSaved }: FileExplorerProps) {
  const [folders, setFolders] = useState<Folder[]>([])
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const [showCreateFile, setShowCreateFile] = useState(false)

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch folders and files using Payload API
      const [foldersRes, filesRes] = await Promise.all([
        fetch('/api/folders?limit=1000&depth=2'),
        fetch('/api/files?limit=1000&depth=2'),
      ])

      if (foldersRes.ok) {
        const foldersData = await foldersRes.json()
        setFolders(foldersData.docs || [])
      } else if (foldersRes.status === 401 || foldersRes.status === 403) {
        console.warn('Not authenticated - please log in to view workspace')
      }

      if (filesRes.ok) {
        const filesData = await filesRes.json()
        setFiles(filesData.docs || [])
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
  }, [])

  const handleFileClick = (file: File) => {
    onFileSelect(file)
  }

  const handleRefresh = () => {
    fetchData()
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
      if (folder.parent && typeof folder.parent === 'object') {
        const parent = folderMap.get(folder.parent.id)
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

    return rootFolders
  }

  const folderTree = buildFolderTree(folders)
  const rootFiles = files.filter((f) => !f.folder || typeof f.folder !== 'object')

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b bg-card px-3 py-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">My Workspace</h2>
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

