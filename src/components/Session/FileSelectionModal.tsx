'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { X, File, FilePlus, Loader2 } from 'lucide-react'
import type { WorkspaceFileFull } from '@/types/workspace'

interface WorkspaceFile extends WorkspaceFileFull {
  language: string
  updatedAt: string
  folderPath?: string
  folderName?: string | null
}

interface FileSelectionModalProps {
  isOpen: boolean
  onSelect: (fileId: string | null, fileName: string, content: string, language: string) => void
  onClose: () => void
}

interface Folder {
  id: string
  name: string
  parentFolder?: {
    id: string
    name?: string
  }
}

export function FileSelectionModal({ isOpen, onSelect, onClose }: FileSelectionModalProps) {
  const [files, setFiles] = useState<WorkspaceFile[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOption, setSelectedOption] = useState<'workspace' | 'scratchpad' | null>(null)
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null)
  const [newFileName, setNewFileName] = useState('')
  const [selectedFolder, setSelectedFolder] = useState<string>('')
  const [showCreateFile, setShowCreateFile] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchFiles()
      fetchFolders()
    }
  }, [isOpen])

  const fetchFiles = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/workspace/files')
      if (res.ok) {
        const data = await res.json()
        setFiles(data.files || [])
      }
    } catch (error) {
      console.error('Failed to fetch files:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchFolders = async () => {
    try {
      const res = await fetch('/api/folders?limit=1000&depth=2')
      if (res.ok) {
        const data = await res.json()
        setFolders(data.docs || [])
      }
    } catch (error) {
      console.error('Failed to fetch folders:', error)
    }
  }

  // Build hierarchical folder labels
  const folderById = React.useMemo(() => {
    const map = new Map<string, Folder>()
    folders.forEach((f) => map.set(f.id, f))
    return map
  }, [folders])

  const getPathParts = React.useCallback(
    (id: string) => {
      const parts: string[] = []
      const visited = new Set<string>()

      let current: Folder | undefined = folderById.get(id)
      while (current && !visited.has(current.id)) {
        visited.add(current.id)
        parts.unshift(current.name)
        const parentId = current.parentFolder?.id
        current = parentId ? folderById.get(parentId) : undefined
      }

      return parts
    },
    [folderById],
  )

  const folderOptions = React.useMemo(() => {
    const enriched = folders.map((f) => {
      const parts = getPathParts(f.id)
      const depth = Math.max(0, parts.length - 1)
      const label = parts.join(' / ')
      return { ...f, label, depth }
    })

    enriched.sort((a, b) => a.label.localeCompare(b.label))
    return enriched
  }, [folders, getPathParts])

  const handleConfirm = async () => {
    if (selectedOption === 'workspace' && selectedFileId) {
      const file = files.find((f) => f.id === selectedFileId)
      if (file) {
        // Don't call onClose() here - let the parent component close the modal
        // after it finishes processing the selection (which is async)
        onSelect(file.id, file.name, file.content, file.language)
      }
    } else if (showCreateFile && newFileName.trim()) {
      // Create new file - create it first, then select it
      try {
        const numericFolderId = selectedFolder ? Number(selectedFolder) : null

        const res = await fetch('/api/files', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: newFileName.trim(),
            content: '',
            folder: Number.isFinite(numericFolderId as any) ? numericFolderId : null,
          }),
        })
        if (res.ok) {
          const newFile = await res.json()
          // Infer language from extension
          const parts = newFileName.trim().split('.')
          const ext = parts.length > 1 ? parts.pop()!.toLowerCase() : ''
          let language = 'javascript'
          if (ext === 'py') language = 'python'
          else if (ext === 'ts') language = 'typescript'
          else if (ext === 'java') language = 'java'
          else if (ext === 'c') language = 'c'
          else if (ext === 'cpp' || ext === 'cc') language = 'cpp'
          else if (ext === 'cs') language = 'csharp'
          else if (ext === 'php') language = 'php'
          else if (ext === 'rb') language = 'ruby'
          else if (ext === 'go') language = 'go'
          else if (ext === 'rs') language = 'rust'
          
          // Refresh file list after creating
          await fetchFiles()
          
          // File ID from Payload is a number, convert to string
          const fileId = String(newFile.doc.id)
          // Don't call onClose() here - let the parent component close the modal
          // after it finishes processing the selection (which is async)
          onSelect(fileId, newFile.doc.name, '', language)
        } else {
          const errorData = await res.json().catch(() => ({}))
          alert(errorData.message || errorData.error || 'Failed to create file')
        }
      } catch (error) {
        console.error('Failed to create file:', error)
        alert('Failed to create file')
      }
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card border rounded-lg w-full max-w-md mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-lg font-semibold">Select File for Session</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="rounded-md bg-primary/10 border border-primary/20 px-3 py-2 mb-2">
            <p className="text-xs text-primary font-medium">
              ⚠️ A file is required to start the session. Please select an existing file or create a new one.
            </p>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Option: Workspace Files */}
              <div>
                <div className="text-sm font-medium mb-2">Workspace Files</div>
                {files.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-2">
                    No workspace files found
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {files.map((file) => (
                      <div
                        key={file.id}
                        className={`border rounded-md p-2 cursor-pointer transition-colors ${
                          selectedOption === 'workspace' && selectedFileId === file.id
                            ? 'border-primary bg-primary/10'
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => {
                          setSelectedOption('workspace')
                          setSelectedFileId(file.id)
                          setShowCreateFile(false)
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <File className="h-3 w-3 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-xs truncate">{file.name}</div>
                            <div className="text-[10px] text-muted-foreground truncate" suppressHydrationWarning>
                              {file.folderPath ? `📁 ${file.folderPath}/` : ''} {file.language} • {new Date(file.updatedAt).toLocaleDateString()}
                            </div>
                          </div>
                          {selectedOption === 'workspace' && selectedFileId === file.id && (
                            <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Option: Create New File */}
              <div
                className={`border rounded-md p-3 cursor-pointer transition-colors ${
                  showCreateFile
                    ? 'border-primary bg-primary/10'
                    : 'hover:bg-muted/50'
                }`}
                onClick={() => {
                  setShowCreateFile(true)
                  setSelectedOption(null)
                  setSelectedFileId(null)
                }}
              >
                <div className="flex items-center gap-2">
                  <FilePlus className="h-4 w-4" />
                  <div className="flex-1">
                    <div className="font-medium text-sm">Create New File</div>
                    <div className="text-xs text-muted-foreground">
                      Create a new workspace file
                    </div>
                  </div>
                  {showCreateFile && (
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  )}
                </div>
              </div>

              {showCreateFile && (
                <div className="border rounded-md p-3 bg-muted/30 space-y-3">
                  <div>
                    <label className="text-xs font-medium mb-1 block">File Name</label>
                    <input
                      type="text"
                      value={newFileName}
                      onChange={(e) => setNewFileName(e.target.value)}
                      placeholder="e.g., app.js, main.py"
                      className="w-full rounded-md border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Folder (Optional)</label>
                    <select
                      value={selectedFolder}
                      onChange={(e) => setSelectedFolder(e.target.value)}
                      className="w-full rounded-md border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="">Root (No folder)</option>
                      {folderOptions.map((folder) => (
                        <option key={folder.id} value={folder.id}>
                          {`${'\u00A0'.repeat(folder.depth * 2)}${folder.label}`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-4 py-3 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={
              !selectedOption &&
              !(showCreateFile && newFileName.trim())
            }
            className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}

