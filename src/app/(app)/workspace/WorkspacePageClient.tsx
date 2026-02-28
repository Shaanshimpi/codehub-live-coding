'use client'

import React from 'react'

import { WorkspaceLayout } from '@/components/Workspace/WorkspaceLayout'
import type { User } from '@/payload-types'

export function WorkspacePageClient({ user }: { user: User }) {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      <WorkspaceLayout user={user} />
    </div>
  )
}

