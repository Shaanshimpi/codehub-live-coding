import React from 'react'
import { redirect } from 'next/navigation'
import { getMeUser } from '@/auth/getMeUser'
import { canAccessFees } from '@/utilities/dashboardAccess'
import { FeeDetailClient } from './FeeDetailClient'

export default async function FeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  // Check authentication and authorization
  try {
    const { user } = await getMeUser({ nullUserRedirect: undefined })
    
    if (!user || !canAccessFees(user)) {
      redirect('/dashboard')
    }

    return <FeeDetailClient feeId={id} />
  } catch (error) {
    redirect('/dashboard')
  }
}


