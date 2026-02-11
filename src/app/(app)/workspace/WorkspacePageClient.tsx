'use client'

import React, { useEffect, useState } from 'react'

import { WorkspaceLayout } from '@/components/Workspace/WorkspaceLayout'
import { PaymentBlocked } from '@/components/Payment/PaymentBlocked'
import { FolderExplorerView } from '@/components/Workspace/FolderExplorerView'

type Folder = {
  id: string
  name: string
  parentFolder?: {
    id: string
    name?: string | null
  } | null
}

type WorkspaceFile = {
  id: string
  name: string
  folder?: {
    id: string
    name?: string | null
  } | null
}

type PaymentStatus = {
  isBlocked: boolean
  reason?: string
  nextInstallment?: {
    dueDate: string
    amount: number
  }
  daysOverdue?: number
}

type WorkspaceMode = 'root-explorer' | 'editor'

export function WorkspacePageClient() {
  const [mode, setMode] = useState<WorkspaceMode>('root-explorer')
  const [folders, setFolders] = useState<Folder[]>([])
  const [files, setFiles] = useState<WorkspaceFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch folders and workspace files in parallel
        const [foldersRes, filesRes] = await Promise.all([
          fetch('/api/folders?limit=1000&depth=1', { credentials: 'include', cache: 'no-store' }),
          fetch('/api/workspace/files', { credentials: 'include', cache: 'no-store' }),
        ])

        // Handle payment blocking from workspace files API (students)
        if (filesRes.status === 403) {
          try {
            const data = await filesRes.json()
            if (data?.paymentStatus?.isBlocked) {
              setPaymentStatus(data.paymentStatus)
              setFolders([])
              setFiles([])
              return
            }
          } catch {
            // fall through to generic error
          }
        }

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

        setFolders(foldersData.docs || [])
        setFiles(filesData.files || [])

        if (filesData.paymentStatus && !filesData.paymentStatus.isBlocked) {
          setPaymentStatus(filesData.paymentStatus)
        }
      } catch (e) {
        console.error('Error loading workspace explorer data', e)
        setError('Failed to load workspace. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    if (mode === 'root-explorer') {
      fetchData()
    }
  }, [mode])

  // If payment is blocked, show the same blocking UI as the workspace editor
  if (paymentStatus?.isBlocked) {
    return (
      <div className="flex h-screen w-screen flex-col overflow-hidden">
        <PaymentBlocked
          reason={paymentStatus.reason}
          nextInstallment={paymentStatus.nextInstallment}
          daysOverdue={paymentStatus.daysOverdue}
        />
      </div>
    )
  }

  // Legacy full editor view (fallback / advanced)
  if (mode === 'editor') {
    return (
      <div className="flex h-screen w-screen flex-col overflow-hidden">
        <WorkspaceLayout />
      </div>
    )
  }

  // Compute root folders and root files for explorer
  const rootFolders = folders.filter((folder) => !folder.parentFolder)
  const rootFiles = files.filter((file) => !file.folder)

  return (
    <FolderExplorerView
      currentFolder={null}
      childFolders={rootFolders}
      childFiles={rootFiles}
      loading={loading}
      error={error}
      isRoot={true}
      onOpenFullWorkspace={() => setMode('editor')}
    />
  )
}

