import React from 'react'

import { getMeUser } from '@/auth/getMeUser'
import { StudentSessionClient } from './StudentSessionClient'
import { checkPaymentStatusServer } from '@/utilities/checkPaymentStatusServer'
import { PaymentBlocked } from '@/components/Payment/PaymentBlocked'

type PageProps = {
  params: Promise<{
    code: string
  }>
}

export default async function StudentSessionPage({ params }: PageProps) {
  // Require authentication; redirect unauthenticated users to admin login
  const { user } = await getMeUser({ nullUserRedirect: '/admin?redirect=/student/session' })

  // Await params (Next.js 15 requirement)
  const { code } = await params

  // Check payment status for students (server-side)
  if (user.role === 'student') {
    const paymentStatus = await checkPaymentStatusServer()
    
    if (paymentStatus?.isBlocked) {
      return (
        <PaymentBlocked
          reason={paymentStatus.reason}
          nextInstallment={paymentStatus.nextInstallment || undefined}
          daysOverdue={paymentStatus.daysOverdue}
        />
      )
    }
  }

  return <StudentSessionClient />
}

