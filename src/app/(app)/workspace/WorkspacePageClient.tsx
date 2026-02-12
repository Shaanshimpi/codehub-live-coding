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

export function WorkspacePageClient() {
  // Use WorkspaceLayout which now has built-in Explorer/Workspace mode toggle
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      <WorkspaceLayout />
    </div>
  )
}

