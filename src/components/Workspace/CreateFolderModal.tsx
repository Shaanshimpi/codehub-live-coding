'use client'

import React, { useState } from 'react'
import { X } from 'lucide-react'

interface FolderOption {
  id: string
  name: string
}

interface CreateFolderModalProps {
  folders: FolderOption[]
  onClose: () => void
  onSuccess: () => void
}

export function CreateFolderModal({ folders, onClose, onSuccess }: CreateFolderModalProps) {
  const [name, setName] = useState('')
  const [parentId, setParentId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Folder name is required')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Get current user (you'll need to implement auth later)
      // For now, we'll need to get user ID from session/cookie
      const response = await fetch('/api/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          parent: parentId || undefined,
          // user will be set by Payload based on auth
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        if (response.status === 401 || response.status === 403) {
          throw new Error('Please log in to create folders')
        }
        throw new Error(data.message || data.error || 'Failed to create folder')
      }

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create folder')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Create New Folder</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Folder Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Python Practice"
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              autoFocus
              disabled={loading}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Parent Folder (optional)</label>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              disabled={loading}
            >
              <option value="">Root (no parent)</option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
          </div>

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

