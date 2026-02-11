'use client'

import React, { useState } from 'react'
import { X } from 'lucide-react'

interface Folder {
  id: string
  name: string
  parentFolder?: {
    id: string
    name?: string
  }
}

interface CreateFileModalProps {
  folders: Folder[]
  onClose: () => void
  onSuccess: () => void
  /**
   * Optional current folder ID. When provided, the new file will be created
   * inside this folder and the folder selector will be hidden.
   */
  currentFolderId?: string | number | null
}

export function CreateFileModal({ folders, onClose, onSuccess, currentFolderId }: CreateFileModalProps) {
  const [name, setName] = useState('')
  // Auto-set selectedFolder if currentFolderId is provided
  const [selectedFolder, setSelectedFolder] = useState<string>(currentFolderId ? String(currentFolderId) : '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Build hierarchical folder labels like: "C / intro / loops" with indentation in the dropdown
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('File name is required')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const numericFolderId = selectedFolder ? Number(selectedFolder) : null

      const response = await fetch('/api/files', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          content: '',
          // Single-collection relationship expects the folder ID (or null)
          folder: Number.isFinite(numericFolderId as any) ? numericFolderId : null,
          // user will be set by Payload based on auth
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        if (response.status === 401 || response.status === 403) {
          throw new Error('Please log in to create files')
        }
        throw new Error(data.message || data.error || 'Failed to create file')
      }

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create file')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Create New File</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">File Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., main.py"
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              autoFocus
              disabled={loading}
            />
          </div>

          {!currentFolderId && (
            <div>
              <label className="text-sm font-medium">Folder (Optional)</label>
              <select
                value={selectedFolder}
                onChange={(e) => setSelectedFolder(e.target.value)}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                disabled={loading}
              >
                <option value="">Root (No folder)</option>
                {folderOptions.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {`${'\u00A0'.repeat(folder.depth * 2)}${folder.label}`}
                  </option>
                ))}
              </select>
            </div>
          )}
          {currentFolderId && (
            <div className="rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
              File will be created in the current folder
            </div>
          )}

          {error && (
            <div className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

