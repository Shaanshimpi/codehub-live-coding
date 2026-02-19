import React from 'react'

import { getMeUser } from '@/auth/getMeUser'
import { WorkspaceLayout } from '@/components/Workspace/WorkspaceLayout'

type PageProps = {
  params: Promise<{
    slug: string
  }>
}

export default async function FolderWorkspacePage({ params }: PageProps) {
  // Require authentication; redirect unauthenticated users to admin login
  await getMeUser({ nullUserRedirect: '/admin?redirect=/workspace' })

  const { slug } = await params

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      <WorkspaceLayout scopeFolderId={slug} />
    </div>
  )
}


