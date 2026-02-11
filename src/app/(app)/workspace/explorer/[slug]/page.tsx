import React from 'react'

import { getMeUser } from '@/auth/getMeUser'
import { FolderExplorerPageClient } from './FolderExplorerPageClient'

type PageProps = {
  params: Promise<{
    slug: string
  }>
}

export default async function FolderExplorerPage({ params }: PageProps) {
  // Require authentication; redirect unauthenticated users to admin login
  await getMeUser({ nullUserRedirect: '/admin?redirect=/workspace' })

  const { slug } = await params

  return <FolderExplorerPageClient slug={slug} />
}

