'use client'

import React, { useEffect, useState, useCallback } from 'react'

import { FolderExplorerView } from '@/components/Workspace/FolderExplorerView'
import type { BasicFolderRef } from '@/utilities/workspaceScope'
import type { Folder, WorkspaceFileWithFolder } from '@/types/workspace'

type WorkspaceFile = WorkspaceFileWithFolder

interface FolderExplorerPageClientProps {
  slug: string
}

export function FolderExplorerPageClient({ slug }: FolderExplorerPageClientProps) {
  const [folders, setFolders] = useState<Folder[]>([])
  const [files, setFiles] = useState<WorkspaceFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const [foldersRes, filesRes] = await Promise.all([
        fetch('/api/folders?limit=1000&depth=2', { credentials: 'include', cache: 'no-store' }),
        fetch('/api/workspace/files', { credentials: 'include', cache: 'no-store' }),
      ])

      if (!foldersRes.ok) {
        const text = await foldersRes.text().catch(() => 'Failed to load folders')
        throw new Error(text || 'Failed to load folders')
      }

      if (!filesRes.ok) {
        const text = await filesRes.text().catch(() => 'Failed to load files')
        throw new Error(text || 'Failed to load files')
      }

      const foldersData = await foldersRes.json()
      const filesData = await filesRes.json()

      setFolders((foldersData.docs || []) as Folder[])
      setFiles((filesData.files || []) as WorkspaceFile[])
    } catch (e) {
      console.error('Error loading folder explorer data', e)
      setError('Failed to load folder. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [slug, fetchData])

  // Find folder by slug, with fallback to ID for backward compatibility
  // This handles both cases: folders with slugs and folders without slugs (using ID in URL)
  const currentFolder = folders.find((f) => {
    // First try exact slug match
    if (f.slug === slug) return true
    // Fallback: try matching by ID (for backward compatibility or if slug is missing)
    if (String(f.id) === slug) return true
    return false
  }) || null
  const childFolders = folders.filter(
    (f) => f.parentFolder && currentFolder && String(f.parentFolder.id) === String(currentFolder.id),
  )
  const childFiles = files.filter(
    (f) => f.folder && currentFolder && String(f.folder.id) === String(currentFolder.id),
  )

  return (
    <FolderExplorerView
      currentFolder={currentFolder}
      childFolders={childFolders}
      childFiles={childFiles}
      loading={loading}
      error={error}
      isRoot={false}
      backLink="/workspace"
      allFolders={folders}
      onItemChanged={fetchData}
      readOnly={false}
    />
  )
}
