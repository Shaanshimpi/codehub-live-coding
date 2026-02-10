import React from 'react'
import { redirect } from 'next/navigation'
import { getMeUser } from '@/auth/getMeUser'
import { hasFullAccess } from '@/utilities/dashboardAccess'
import { UserForm } from '@/components/Dashboard/UserForm'

export default async function NewUserPage() {
  // Check authentication and authorization
  try {
    const { user } = await getMeUser({ nullUserRedirect: undefined })
    
    if (!user || !hasFullAccess(user)) {
      redirect('/dashboard/users')
    }

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Create New User</h1>
          <p className="text-muted-foreground mt-1">Add a new user to the platform</p>
        </div>
        <UserForm mode="create" />
      </div>
    )
  } catch (error) {
    redirect('/dashboard/users')
  }
}


