/**
 * Hook for workspace import/export functionality.
 * 
 * Handles downloading workspace as ZIP and uploading ZIP files to workspace.
 * 
 * @module useWorkspaceImportExport
 */

'use client'

import { useState, useCallback } from 'react'

interface UseWorkspaceImportExportOptions {
  /** Callback after successful upload (for refreshing workspace) */
  onUploadSuccess?: () => void
  /** Callback on upload error */
  onUploadError?: (error: Error) => void
  /** Callback on download error */
  onDownloadError?: (error: Error) => void
}

interface UseWorkspaceImportExportReturn {
  /** Whether workspace is currently being downloaded */
  downloading: boolean
  /** Whether workspace is currently being uploaded */
  uploading: boolean
  /** Upload progress (0-100) */
  uploadProgress: number
  /** Upload status message */
  uploadMessage: string
  /** Download workspace as ZIP */
  handleDownload: () => Promise<void>
  /** Upload ZIP file to workspace */
  handleUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>
}

/**
 * Hook for workspace import/export functionality.
 * 
 * @example
 * ```tsx
 * const {
 *   downloading,
 *   uploading,
 *   uploadProgress,
 *   uploadMessage,
 *   handleDownload,
 *   handleUpload,
 * } = useWorkspaceImportExport({
 *   onUploadSuccess: () => {
 *     setRefreshKey((prev) => prev + 1)
 *     window.location.reload()
 *   },
 *   onUploadError: (error) => {
 *     alert(error.message)
 *   },
 * })
 * ```
 */
export function useWorkspaceImportExport({
  onUploadSuccess,
  onUploadError,
  onDownloadError,
}: UseWorkspaceImportExportOptions = {}): UseWorkspaceImportExportReturn {
  const [downloading, setDownloading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadMessage, setUploadMessage] = useState('')

  const handleDownload = useCallback(async () => {
    try {
      setDownloading(true)
      console.log('[useWorkspaceImportExport] Starting workspace download...')

      const res = await fetch('/api/workspace/download', {
        credentials: 'include',
      })

      if (!res.ok) {
        throw new Error('Failed to download workspace')
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `workspace-${new Date().toISOString().split('T')[0]}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      console.log('[useWorkspaceImportExport] Workspace downloaded successfully')
    } catch (error) {
      console.error('[useWorkspaceImportExport] Download error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to download workspace'
      
      if (onDownloadError) {
        onDownloadError(error instanceof Error ? error : new Error(errorMessage))
      } else {
        alert(errorMessage)
      }
    } finally {
      setDownloading(false)
    }
  }, [onDownloadError])

  const handleUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) {
        console.warn('[useWorkspaceImportExport] No file selected')
        return
      }

      if (!file.name.endsWith('.zip')) {
        const errorMessage = 'Please upload a ZIP file'
        console.warn('[useWorkspaceImportExport] Invalid file type:', file.name)
        alert(errorMessage)
        event.target.value = ''
        return
      }

      try {
        setUploading(true)
        setUploadProgress(0)
        setUploadMessage('Preparing upload...')
        console.log('[useWorkspaceImportExport] Starting workspace upload...', {
          fileName: file.name,
          fileSize: file.size,
        })

        const formData = new FormData()
        formData.append('file', file)

        setUploadProgress(20)
        setUploadMessage('Uploading ZIP file...')

        const res = await fetch('/api/workspace/upload', {
          method: 'POST',
          credentials: 'include',
          body: formData,
        })

        setUploadProgress(60)
        setUploadMessage('Processing files...')

        if (!res.ok) {
          const error = await res.json().catch(() => ({}))
          throw new Error(error.error || 'Failed to upload workspace')
        }

        setUploadProgress(80)
        setUploadMessage('Finalizing...')

        const data = await res.json()
        console.log('[useWorkspaceImportExport] Upload successful', {
          filesCreated: data.filesCreated,
          foldersCreated: data.foldersCreated,
        })

        setUploadProgress(100)
        setUploadMessage(
          `Success! ${data.filesCreated} files processed, ${data.foldersCreated} folders created.`
        )

        // Wait a moment to show success message
        await new Promise((resolve) => setTimeout(resolve, 1000))

        // Call success callback
        if (onUploadSuccess) {
          onUploadSuccess()
        }
      } catch (error) {
        console.error('[useWorkspaceImportExport] Upload error:', error)
        const errorMessage = error instanceof Error ? error.message : 'Failed to upload workspace'
        setUploadMessage(errorMessage)
        await new Promise((resolve) => setTimeout(resolve, 2000))

        if (onUploadError) {
          onUploadError(error instanceof Error ? error : new Error(errorMessage))
        } else {
          alert(errorMessage)
        }
      } finally {
        setUploading(false)
        setUploadProgress(0)
        setUploadMessage('')
        // Reset input
        event.target.value = ''
      }
    },
    [onUploadSuccess, onUploadError]
  )

  return {
    downloading,
    uploading,
    uploadProgress,
    uploadMessage,
    handleDownload,
    handleUpload,
  }
}
