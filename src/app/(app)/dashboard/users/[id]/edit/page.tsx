import React from 'react'
import { redirect } from 'next/navigation'
import { getMeUser } from '@/auth/getMeUser'
import { hasFullAccess } from '@/utilities/dashboardAccess'
import { UserForm } from '@/components/Dashboard/UserForm'

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  // Check authentication and authorization
  try {
    const { user } = await getMeUser({ nullUserRedirect: undefined })
    
    if (!user || !hasFullAccess(user)) {
      redirect('/dashboard/users')
    }

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Edit User</h1>
          <p className="text-muted-foreground mt-1">Update user information</p>
        </div>
        <UserForm mode="edit" userId={id} />
      </div>
    )
  } catch (error) {
    redirect('/dashboard/users')
  }
}




