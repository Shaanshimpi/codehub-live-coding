'use client'

import React, { useEffect, useState } from 'react'

import { WorkspaceLayout } from '@/components/Workspace/WorkspaceLayout'
import { PaymentBlocked } from '@/components/Payment/PaymentBlocked'
import { FolderExplorerView } from '@/components/Workspace/FolderExplorerView'
import type { Folder, WorkspaceFileWithFolder } from '@/types/workspace'

type WorkspaceFile = WorkspaceFileWithFolder

type PaymentStatus = {
  isBlocked: boolean
  reason?: string
  nextInstallment?: {
    dueDate: string
    amount: number
  }
  daysOverdue?: number
}

export function WorkspacePageClient() {
  // Use WorkspaceLayout which now has built-in Explorer/Workspace mode toggle
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      <WorkspaceLayout />
    </div>
  )
}

