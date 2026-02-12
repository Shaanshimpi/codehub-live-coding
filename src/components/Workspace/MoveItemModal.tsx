'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { X } from 'lucide-react'

interface FolderOption {
  id: string | number
  name: string
  parentFolder?: {
    id: string | number
    name?: string
  } | null
}

interface MoveItemModalProps {
  isOpen: boolean
  itemType: 'file' | 'folder'
  itemId: string
  currentParentId: string | number | null
  folders: FolderOption[]
  onClose: () => void
  onSuccess: () => void
}

export function MoveItemModal({
  isOpen,
  itemType,
  itemId,
  currentParentId,
  folders,
  onClose,
  onSuccess,
}: MoveItemModalProps) {
  const [parentId, setParentId] = useState<string>(currentParentId ? String(currentParentId) : '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Update parentId when currentParentId changes
  React.useEffect(() => {
    if (isOpen) {
      setParentId(currentParentId ? String(currentParentId) : '')
      setError(null)
    }
  }, [currentParentId, isOpen])

  // Build hierarchical labels like: "C / intro / loops" with indentation in the dropdown
  const folderById = useMemo(() => {
    const map = new Map<string, FolderOption>()
    folders.forEach((f) => map.set(String(f.id), f))
    return map
  }, [folders])

  const getPathParts = useCallback(
    (id: string) => {
      const parts: string[] = []
      const visited = new Set<string>()

      let current: FolderOption | undefined = folderById.get(id)
      while (current && !visited.has(String(current.id))) {
        visited.add(String(current.id))
        parts.unshift(current.name)
        const parentId = current.parentFolder?.id
        current = parentId ? folderById.get(String(parentId)) : undefined
      }

      return parts
    },
    [folderById],
  )

  // Filter out the item being moved and its descendants (for folders)
  const availableFolders = useMemo(() => {
    if (itemType === 'folder') {
      // For folders, exclude the folder itself and all its descendants
      const excludeIds = new Set<string>([String(itemId)])
      
      // Find all descendants
      const findDescendants = (folderId: string) => {
        folders.forEach((f) => {
          if (f.parentFolder && String(f.parentFolder.id) === folderId) {
            excludeIds.add(String(f.id))
            findDescendants(String(f.id))
          }
        })
      }
      findDescendants(String(itemId))
      
      return folders.filter((f) => !excludeIds.has(String(f.id)))
    }
    // For files, all folders are available
    return folders
  }, [folders, itemId, itemType])

  const folderOptions = useMemo(() => {
    const enriched = availableFolders.map((f) => {
      const parts = getPathParts(String(f.id))
      const depth = Math.max(0, parts.length - 1)
      const label = parts.join(' / ')
      return { ...f, label, depth }
    })

    // Sort by full path for a stable, readable list
    enriched.sort((a, b) => a.label.localeCompare(b.label))
    return enriched
  }, [availableFolders, getPathParts])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const newParentId = parentId ? Number(parentId) : null
    if (newParentId === currentParentId || (newParentId === null && currentParentId === null)) {
      onClose()
      return
    }

    setLoading(true)
    setError(null)

    try {
      const endpoint = itemType === 'file' 
        ? `/api/files/${itemId}`
        : `/api/folders/${itemId}`
      
      const body = itemType === 'file'
        ? { folder: newParentId }
        : { parentFolder: newParentId }

      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const data: any = await response.json().catch(() => ({}))
        if (response.status === 401 || response.status === 403) {
          throw new Error('You do not have permission to move this item')
        }
        throw new Error(data.error || data.message || `Failed to move ${itemType}`)
      }

      onSuccess()
      onClose()
    } catch (err) {
      console.error('MoveItemModal error', err)
      setError(err instanceof Error ? err.message : `Failed to move ${itemType}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            Move {itemType === 'file' ? 'File' : 'Folder'}
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
            <label className="text-sm font-medium">Destination Folder</label>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              disabled={loading}
            >
              <option value="">Root (no parent)</option>
              {folderOptions.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {`${'\u00A0'.repeat(folder.depth * 2)}${folder.label}`}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted-foreground">
              Select the folder where this {itemType} should be moved
            </p>
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
              {loading ? 'Moving...' : 'Move'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

