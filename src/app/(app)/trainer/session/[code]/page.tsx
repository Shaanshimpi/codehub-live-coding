import React from 'react'

import { getMeUser } from '@/auth/getMeUser'
import { TrainerSessionClient } from './TrainerSessionClient'

type PageProps = {
  params: Promise<{
    code: string
  }>
}

export default async function TrainerSessionPage({ params }: PageProps) {
  // Require authentication; redirect unauthenticated users to admin login
  await getMeUser({ nullUserRedirect: '/admin?redirect=/trainer/session' })

  // Await params (Next.js 15 requirement)
  const { code } = await params

  return <TrainerSessionClient />
}

