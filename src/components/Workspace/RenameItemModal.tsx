'use client'

import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'

interface RenameItemModalProps {
  isOpen: boolean
  itemType: 'file' | 'folder'
  currentName: string
  itemId: string
  onClose: () => void
  onSuccess: () => void
}

export function RenameItemModal({
  isOpen,
  itemType,
  currentName,
  itemId,
  onClose,
  onSuccess,
}: RenameItemModalProps) {
  const [name, setName] = useState(currentName)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Update name when currentName changes
  useEffect(() => {
    if (isOpen) {
      setName(currentName)
      setError(null)
    }
  }, [currentName, isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError(`${itemType === 'file' ? 'File' : 'Folder'} name is required`)
      return
    }

    if (name.trim() === currentName) {
      onClose()
      return
    }

    setLoading(true)
    setError(null)

    try {
      const endpoint = itemType === 'file' 
        ? `/api/files/${itemId}`
        : `/api/folders/${itemId}`
      
      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ name: name.trim() }),
      })

      if (!response.ok) {
        const data: any = await response.json().catch(() => ({}))
        if (response.status === 401 || response.status === 403) {
          throw new Error('You do not have permission to rename this item')
        }
        throw new Error(data.error || data.message || `Failed to rename ${itemType}`)
      }

      onSuccess()
      onClose()
    } catch (err) {
      console.error('RenameItemModal error', err)
      setError(err instanceof Error ? err.message : `Failed to rename ${itemType}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            Rename {itemType === 'file' ? 'File' : 'Folder'}
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            disabled={loading}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">
              {itemType === 'file' ? 'File' : 'Folder'} Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`Enter ${itemType} name`}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              autoFocus
              disabled={loading}
            />
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
              {loading ? 'Renaming...' : 'Rename'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}


