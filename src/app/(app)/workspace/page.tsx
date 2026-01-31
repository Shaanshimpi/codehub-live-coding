import React from 'react'

import { getMeUser } from '@/auth/getMeUser'
import { WorkspacePageClient } from './WorkspacePageClient'

export default async function WorkspacePage() {
  // Require authentication; redirect unauthenticated users to admin login
  await getMeUser({ nullUserRedirect: '/admin?redirect=/workspace' })

  return <WorkspacePageClient />
}

