import React from 'react'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'

import { getMeUser } from '@/auth/getMeUser'
import { isValidJoinCode } from '@/utilities/joinCode'
import { MonitorViewClient } from './MonitorViewClient'

type PageProps = {
  params: Promise<{
    code: string
  }>
}

export default async function MonitorViewPage({ params }: PageProps) {
  // Require authentication and staff role
  try {
    const { user } = await getMeUser({ nullUserRedirect: undefined })
    
    // Check if user is staff (admin or trainer)
    if (!user || (user.role !== 'admin' && user.role !== 'trainer')) {
      redirect('/')
    }

    // Await params (Next.js 15 requirement)
    const { code } = await params

    // Validate join code format
    if (!code || !isValidJoinCode(code)) {
      redirect('/staff/monitor')
    }

    // Verify session exists
    const payload = await getPayload({ config })
    const sessions = await payload.find({
      collection: 'live-sessions',
      where: {
        joinCode: { equals: code.toUpperCase() },
      },
      limit: 1,
    })

    if (sessions.docs.length === 0) {
      redirect('/staff/monitor')
    }

    return <MonitorViewClient />
  } catch (_error) {
    // If authentication fails or session not found, redirect to selection page
    redirect('/staff/monitor')
  }
}

