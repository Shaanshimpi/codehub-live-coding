'use client'

import React, { useMemo } from 'react'

import { FolderExplorerView } from '@/components/Workspace/FolderExplorerView'
import type { Folder, WorkspaceFileWithFolder } from '@/types/workspace'
import { useWorkspaceData } from '@/hooks/workspace/useWorkspaceData'

type WorkspaceFile = WorkspaceFileWithFolder

interface FolderExplorerPageClientProps {
  slug: string
}

export function FolderExplorerPageClient({ slug }: FolderExplorerPageClientProps) {
  const { folders, files, isLoading: loading, error: workspaceError, refetch } = useWorkspaceData()

  const error = workspaceError ? 'Failed to load folder. Please try again.' : null

  // Find folder by slug, with fallback to ID for backward compatibility
  const currentFolder = useMemo(
    () =>
      folders.find((f) => {
        if (f.slug === slug) return true
        if (String(f.id) === slug) return true
        return false
      }) ?? null,
    [folders, slug],
  )

  const childFolders = useMemo(
    () =>
      folders.filter(
        (f) =>
          f.parentFolder && currentFolder && String(f.parentFolder.id) === String(currentFolder.id),
      ),
    [folders, currentFolder],
  )
  const childFiles = useMemo(
    () =>
      files.filter(
        (f) => f.folder && currentFolder && String(f.folder.id) === String(currentFolder.id),
      ),
    [files, currentFolder],
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
      onItemChanged={refetch}
      readOnly={false}
    />
  )
}
