import React from 'react'
import { redirect } from 'next/navigation'
import { getMeUser } from '@/auth/getMeUser'
import { checkDashboardAccess } from '@/utilities/dashboardAccess'
import { DashboardLayout } from '@/components/Dashboard/DashboardLayout'

export default async function DashboardLayoutWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  // Check authentication and authorization
  try {
    const { user } = await getMeUser({ nullUserRedirect: undefined })
    
    if (!user || !checkDashboardAccess(user)) {
      redirect('/')
    }

    return <DashboardLayout user={user}>{children}</DashboardLayout>
  } catch (error) {
    // User not authenticated, redirect to home
    redirect('/')
  }
}

