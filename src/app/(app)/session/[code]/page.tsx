import React from 'react'

import { getMeUser } from '@/auth/getMeUser'
import { StudentSessionClient } from './StudentSessionClient'

export default async function StudentSessionPage() {
  // Require authentication; redirect unauthenticated users to admin login
  await getMeUser({ nullUserRedirect: '/admin?redirect=/session' })

  return <StudentSessionClient />
}

