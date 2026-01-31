'use client'

import React, { useState, useEffect } from 'react'
import { X, File, FilePlus, Loader2 } from 'lucide-react'

interface WorkspaceFile {
  id: string
  name: string
  content: string
  language: string
  updatedAt: string
}

interface FileSelectionModalProps {
  isOpen: boolean
  onSelect: (fileId: string | null, fileName: string, content: string, language: string) => void
  onClose: () => void
}

export function FileSelectionModal({ isOpen, onSelect, onClose }: FileSelectionModalProps) {
  const [files, setFiles] = useState<WorkspaceFile[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOption, setSelectedOption] = useState<'workspace' | 'scratchpad' | null>(null)
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null)
  const [newFileName, setNewFileName] = useState('')
  const [showCreateFile, setShowCreateFile] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchFiles()
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

  const handleConfirm = async () => {
    if (selectedOption === 'scratchpad') {
      onSelect(null, 'Session Scratchpad', '', 'javascript')
      onClose()
    } else if (selectedOption === 'workspace' && selectedFileId) {
      const file = files.find((f) => f.id === selectedFileId)
      if (file) {
        onSelect(file.id, file.name, file.content, file.language)
        onClose()
      }
    } else if (showCreateFile && newFileName.trim()) {
      // Create new file - create it first, then select it
      try {
        const res = await fetch('/api/files', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newFileName.trim(),
            content: '',
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
          
          onSelect(newFile.doc.id, newFile.doc.name, '', language)
          onClose()
        } else {
          alert('Failed to create file')
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
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Option: Session Scratchpad */}
              <div
                className={`border rounded-md p-3 cursor-pointer transition-colors ${
                  selectedOption === 'scratchpad'
                    ? 'border-primary bg-primary/10'
                    : 'hover:bg-muted/50'
                }`}
                onClick={() => {
                  setSelectedOption('scratchpad')
                  setSelectedFileId(null)
                  setShowCreateFile(false)
                }}
              >
                <div className="flex items-center gap-2">
                  <File className="h-4 w-4" />
                  <div className="flex-1">
                    <div className="font-medium text-sm">Session Scratchpad</div>
                    <div className="text-xs text-muted-foreground">
                      Start with a new temporary scratchpad
                    </div>
                  </div>
                  {selectedOption === 'scratchpad' && (
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  )}
                </div>
              </div>

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
                          <div className="flex-1">
                            <div className="font-medium text-xs">{file.name}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {file.language} • {new Date(file.updatedAt).toLocaleDateString()}
                            </div>
                          </div>
                          {selectedOption === 'workspace' && selectedFileId === file.id && (
                            <div className="h-2 w-2 rounded-full bg-primary" />
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
                <div className="border rounded-md p-3 bg-muted/30">
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

