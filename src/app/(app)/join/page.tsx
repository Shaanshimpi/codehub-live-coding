import React from 'react'

import { getMeUser } from '@/auth/getMeUser'
import { JoinSessionClient } from './JoinSessionClient'

export default async function JoinSessionPage() {
  // Require authentication; redirect unauthenticated users to admin login
  await getMeUser({ nullUserRedirect: '/admin?redirect=/join' })

  return <JoinSessionClient />
}

