import React from 'react'
import { redirect } from 'next/navigation'
import { getMeUser } from '@/auth/getMeUser'
import { checkDashboardAccess } from '@/utilities/dashboardAccess'
import { UserDetailClient } from './UserDetailClient'

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  // Check authentication and authorization
  try {
    const { user } = await getMeUser({ nullUserRedirect: undefined })
    
    if (!user || !checkDashboardAccess(user)) {
      redirect('/dashboard')
    }

    return <UserDetailClient userId={id} currentUser={user} />
  } catch (error) {
    redirect('/dashboard')
  }
}


