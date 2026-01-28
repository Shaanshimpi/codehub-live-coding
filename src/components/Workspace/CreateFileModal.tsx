'use client'

import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'

interface Folder {
  id: string
  name: string
}

interface Language {
  id: string
  name: string
  slug: string
  defaultCode?: string
}

interface CreateFileModalProps {
  folders: Folder[]
  onClose: () => void
  onSuccess: () => void
}

export function CreateFileModal({ folders, onClose, onSuccess }: CreateFileModalProps) {
  const [name, setName] = useState('')
  const [selectedLanguage, setSelectedLanguage] = useState<string>('')
  const [selectedFolder, setSelectedFolder] = useState<string>('')
  const [languages, setLanguages] = useState<Language[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Fetch available languages
    fetch('/api/languages?limit=100')
      .then((res) => res.json())
      .then((data) => {
        setLanguages(data.docs || [])
        if (data.docs && data.docs.length > 0) {
          setSelectedLanguage(data.docs[0].id)
        }
      })
      .catch(console.error)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('File name is required')
      return
    }
    // Language is optional for storage; it only affects initial default code

    setLoading(true)
    setError(null)

    try {
      const selectedLang = languages.find((l) => l.id === selectedLanguage)
      const defaultCode = selectedLang?.defaultCode || ''

      const response = await fetch('/api/files', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          content: defaultCode,
          folder: selectedFolder || undefined,
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

          <div>
            <label className="text-sm font-medium">Language</label>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              disabled={loading}
            >
              {languages.map((lang) => (
                <option key={lang.id} value={lang.id}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Folder (Optional)</label>
            <select
              value={selectedFolder}
              onChange={(e) => setSelectedFolder(e.target.value)}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              disabled={loading}
            >
              <option value="">Root (No folder)</option>
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

