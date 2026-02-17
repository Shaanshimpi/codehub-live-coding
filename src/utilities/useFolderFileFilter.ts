import { useMemo } from 'react'

interface BasicFolderRef {
  id: string | number
  name?: string | null
  parentFolder?: BasicFolderRef | null
  slug?: string | null
}

interface BasicFileRef {
  id: string
  name: string
  folder?: { id: string | number; name?: string | null; slug?: string | null } | null
}

interface UseFolderFileFilterOptions<TFolder extends BasicFolderRef, TFile extends BasicFileRef> {
  /** All folders */
  folders: TFolder[]
  /** All files */
  files: TFile[]
  /** Current folder (null for root) */
  currentFolder: TFolder | null
}

interface UseFolderFileFilterReturn<TFolder extends BasicFolderRef, TFile extends BasicFileRef> {
  /** Child folders of current folder */
  childFolders: TFolder[]
  /** Child files of current folder */
  childFiles: TFile[]
}

/**
 * Shared utility hook for filtering folders and files by current folder.
 * Used consistently across WorkspaceLayout, TrainerSessionWorkspace, and StudentSessionWorkspace.
 */
export function useFolderFileFilter<TFolder extends BasicFolderRef, TFile extends BasicFileRef>({
  folders,
  files,
  currentFolder,
}: UseFolderFileFilterOptions<TFolder, TFile>): UseFolderFileFilterReturn<TFolder, TFile> {
  const childFolders = useMemo(() => {
    if (currentFolder) {
      return folders.filter(
        (f) => f.parentFolder && String(f.parentFolder.id) === String(currentFolder.id)
      )
    }
    return folders.filter((f) => !f.parentFolder)
  }, [folders, currentFolder])

  const childFiles = useMemo(() => {
    if (currentFolder) {
      return files.filter((f) => f.folder && String(f.folder.id) === String(currentFolder.id))
    }
    return files.filter((f) => !f.folder)
  }, [files, currentFolder])

  return {
    childFolders,
    childFiles,
  }
}


