'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { X, File, FilePlus, Loader2 } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useWorkspaceData, invalidateWorkspaceData } from '@/hooks/workspace/useWorkspaceData'
import type { Folder, WorkspaceFileWithFolder } from '@/types/workspace'

interface FileSelectionModalProps {
  isOpen: boolean
  onSelect: (fileId: string | null, fileName: string, content: string, language: string) => void
  onClose: () => void
}

export const FileSelectionModal = React.memo(function FileSelectionModal({ isOpen, onSelect, onClose }: FileSelectionModalProps) {
  const queryClient = useQueryClient()
  const { folders, files, isLoading: loading, refetch } = useWorkspaceData()
  const [selectedOption, setSelectedOption] = useState<'workspace' | 'scratchpad' | null>(null)
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null)
  const [newFileName, setNewFileName] = useState('')
  const [selectedFolder, setSelectedFolder] = useState<string>('')
  const [showCreateFile, setShowCreateFile] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [confirmLabel, setConfirmLabel] = useState<'selecting' | 'creating' | null>(null)

  const folderById = React.useMemo(() => {
    const map = new Map<string, Folder>()
    folders.forEach((f) => map.set(String(f.id), f))
    return map
  }, [folders])

  const getPathParts = React.useCallback(
    (id: string | null | undefined) => {
      if (id == null || typeof id !== 'string') return []
      const parts: string[] = []
      const visited = new Set<string>()
      let currentId: string = id
      let current = folderById.get(currentId)
      while (current && !visited.has(currentId)) {
        visited.add(currentId)
        parts.unshift(current.name ?? '')
        const parentRef = current.parentFolder as { id?: string | number } | undefined
        const parentId = parentRef?.id != null ? String(parentRef.id) : ''
        currentId = parentId
        current = parentId ? folderById.get(parentId) : undefined
      }
      return parts
    },
    [folderById],
  )

  const folderOptions = React.useMemo(() => {
    const enriched = folders.map((f) => {
      const parts = getPathParts(String(f.id))
      const depth = Math.max(0, parts.length - 1)
      const label = parts.join(' / ')
      return { ...f, id: String(f.id), label, depth }
    })
    enriched.sort((a, b) => a.label.localeCompare(b.label))
    return enriched
  }, [folders, getPathParts])

  const handleConfirm = async () => {
    if (selectedOption === 'workspace' && selectedFileId) {
      const file = files.find((f) => String(f.id) === selectedFileId)
      if (file) {
        setConfirming(true)
        setConfirmLabel('selecting')
        // Minimum time so the user always sees "Selecting..." before the modal closes
        await new Promise((r) => setTimeout(r, 200))
        const language = (file as WorkspaceFileWithFolder & { language?: string }).language ?? 'text'
        const content = (file as WorkspaceFileWithFolder & { content?: string }).content ?? ''
        onSelect(String(file.id), file.name, content, language)
        setConfirming(false)
        setConfirmLabel(null)
      }
    } else if (showCreateFile && newFileName.trim()) {
      setConfirming(true)
      setConfirmLabel('creating')
      try {
        const numericFolderId = selectedFolder ? Number(selectedFolder) : null

        const res = await fetch('/api/files', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: newFileName.trim(),
            content: '',
            folder: Number.isFinite(numericFolderId as number) ? numericFolderId : null,
          }),
        })
        if (res.ok) {
          const newFile = await res.json()
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

          invalidateWorkspaceData(queryClient)
          await refetch()

          const fileId = String(newFile.doc.id)
          onSelect(fileId, newFile.doc.name, '', language)
        } else {
          const errorData = await res.json().catch(() => ({}))
          alert(errorData.message || errorData.error || 'Failed to create file')
        }
      } catch (error) {
        console.error('Failed to create file:', error)
        alert('Failed to create file')
      } finally {
        setConfirming(false)
        setConfirmLabel(null)
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
                    {files.map((file) => {
                      const fileId = String(file.id)
                      const updatedAt = (file as WorkspaceFileWithFolder & { updatedAt?: string }).updatedAt
                      const folderPath = (file as WorkspaceFileWithFolder & { folderPath?: string }).folderPath
                      const lang = (file as WorkspaceFileWithFolder & { language?: string }).language ?? 'text'
                      return (
                        <div
                          key={fileId}
                          className={`border rounded-md p-2 cursor-pointer transition-colors ${
                            selectedOption === 'workspace' && selectedFileId === fileId
                              ? 'border-primary bg-primary/10'
                              : 'hover:bg-muted/50'
                          }`}
                          onClick={() => {
                            setSelectedOption('workspace')
                            setSelectedFileId(fileId)
                            setShowCreateFile(false)
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <File className="h-3 w-3 text-muted-foreground" />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-xs truncate">{file.name}</div>
                              <div className="text-[10px] text-muted-foreground truncate" suppressHydrationWarning>
                                {folderPath ? `📁 ${folderPath}/` : ''} {lang} • {updatedAt ? new Date(updatedAt).toLocaleDateString() : ''}
                              </div>
                            </div>
                            {selectedOption === 'workspace' && selectedFileId === fileId && (
                              <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      )
                    })}
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
              confirming ||
              (!selectedOption &&
              !(showCreateFile && newFileName.trim()))
            }
            className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {confirming ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{confirmLabel === 'selecting' ? 'Selecting...' : 'Creating...'}</span>
              </>
            ) : (
              'Confirm'
            )}
          </button>
        </div>
      </div>
    </div>
  )
})

