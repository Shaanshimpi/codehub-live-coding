import React from 'react'
import { redirect } from 'next/navigation'
import { getMeUser } from '@/auth/getMeUser'
import { canAccessFees } from '@/utilities/dashboardAccess'
import { FeeForm } from '@/components/Dashboard/FeeForm'

export default async function NewFeePage() {
  // Check authentication and authorization
  try {
    const { user } = await getMeUser({ nullUserRedirect: undefined })
    
    if (!user || !canAccessFees(user)) {
      redirect('/dashboard/fees')
    }

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Create New Fee Record</h1>
          <p className="text-muted-foreground mt-1">Add a new fee record for a student</p>
        </div>
        <FeeForm mode="create" />
      </div>
    )
  } catch (error) {
    redirect('/dashboard/fees')
  }
}




