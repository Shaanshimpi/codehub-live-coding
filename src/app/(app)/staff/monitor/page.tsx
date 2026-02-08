import React from 'react'
import { redirect } from 'next/navigation'

import { getMeUser } from '@/auth/getMeUser'
import { MonitorSelectionClient } from './MonitorSelectionClient'

export default async function MonitorSelectionPage() {
  // Require authentication and staff role
  try {
    const { user } = await getMeUser({ nullUserRedirect: undefined })
    
    // Check if user is staff (admin or trainer)
    if (!user || (user.role !== 'admin' && user.role !== 'trainer')) {
      redirect('/')
    }

    return <MonitorSelectionClient />
  } catch (_error) {
    // If authentication fails, redirect to homepage
    redirect('/')
  }
}

