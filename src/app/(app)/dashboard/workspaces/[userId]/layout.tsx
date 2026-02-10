import React from 'react'
import { redirect } from 'next/navigation'
import { getMeUser } from '@/auth/getMeUser'
import { checkDashboardAccess } from '@/utilities/dashboardAccess'

export default async function WorkspaceViewLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Check authentication and authorization
  try {
    const { user } = await getMeUser({ nullUserRedirect: undefined })
    
    if (!user || !checkDashboardAccess(user)) {
      redirect('/dashboard')
    }

    // Return children - we'll handle hiding dashboard layout in WorkspaceViewClient
    return <>{children}</>
  } catch (error) {
    redirect('/dashboard')
  }
}

