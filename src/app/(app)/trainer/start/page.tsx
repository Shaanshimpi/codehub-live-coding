import React from 'react'

import { getMeUser } from '@/auth/getMeUser'
import { TrainerStartClient } from './TrainerStartClient'

export default async function TrainerStartPage() {
  // Require authentication; redirect unauthenticated users to admin login
  await getMeUser({ nullUserRedirect: '/admin?redirect=/trainer/start' })

  return <TrainerStartClient />
}

