'use client'

import React from 'react'

import { WorkspaceLayout } from '@/components/Workspace/WorkspaceLayout'

export function WorkspacePageClient() {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      <WorkspaceLayout />
    </div>
  )
}

