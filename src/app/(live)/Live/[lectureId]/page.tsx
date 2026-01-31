import React from 'react'

import { getMeUser } from '@/auth/getMeUser'
import { LiveLectureClient } from '../LiveLectureClient'

type PageProps = {
  params: Promise<{
    lectureId: string
  }>
  searchParams: Promise<{
    role?: 'trainer' | 'student'
  }>
}

export default async function LiveLecturePage({ params, searchParams }: PageProps) {
  // Require authentication; redirect unauthenticated users to admin login
  await getMeUser({ nullUserRedirect: '/admin?redirect=/Live' })

  const [{ lectureId }, { role }] = await Promise.all([params, searchParams])

  return <LiveLectureClient lectureId={lectureId} role={role} />
}

