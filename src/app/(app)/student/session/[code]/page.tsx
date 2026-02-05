import React from 'react'

import { getMeUser } from '@/auth/getMeUser'
import { StudentSessionClient } from './StudentSessionClient'

type PageProps = {
  params: Promise<{
    code: string
  }>
}

export default async function StudentSessionPage({ params }: PageProps) {
  // Require authentication; redirect unauthenticated users to admin login
  await getMeUser({ nullUserRedirect: '/admin?redirect=/student/session' })

  // Await params (Next.js 15 requirement)
  const { code } = await params

  return <StudentSessionClient />
}

