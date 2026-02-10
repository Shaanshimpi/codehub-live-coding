import React from 'react'
import { redirect } from 'next/navigation'
import { getMeUser } from '@/auth/getMeUser'
import { canAccessFees } from '@/utilities/dashboardAccess'
import { FeesListClient } from './FeesListClient'

export default async function FeesPage() {
  // Check authentication and authorization
  try {
    const { user } = await getMeUser({ nullUserRedirect: undefined })
    
    if (!user || !canAccessFees(user)) {
      redirect('/dashboard')
    }

    return <FeesListClient />
  } catch (error) {
    redirect('/dashboard')
  }
}

