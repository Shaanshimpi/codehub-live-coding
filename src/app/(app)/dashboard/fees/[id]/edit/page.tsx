import React from 'react'
import { redirect } from 'next/navigation'
import { getMeUser } from '@/auth/getMeUser'
import { canAccessFees } from '@/utilities/dashboardAccess'
import { FeeForm } from '@/components/Dashboard/FeeForm'

export default async function EditFeePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  // Check authentication and authorization
  try {
    const { user } = await getMeUser({ nullUserRedirect: undefined })
    
    if (!user || !canAccessFees(user)) {
      redirect('/dashboard/fees')
    }

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Edit Fee Record</h1>
          <p className="text-muted-foreground mt-1">Update fee record information</p>
        </div>
        <FeeForm mode="edit" feeId={id} />
      </div>
    )
  } catch (error) {
    redirect('/dashboard/fees')
  }
}


