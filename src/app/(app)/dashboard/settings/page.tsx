import { redirect } from 'next/navigation'
import { getMeUser } from '@/auth/getMeUser'
import { canAccessSettings } from '@/utilities/dashboardAccess'
import { SettingsClient } from './SettingsClient'

export default async function SettingsPage() {
  let user
  try {
    const result = await getMeUser({ nullUserRedirect: undefined })
    user = result.user
  } catch (error) {
    redirect('/')
  }

  if (!user || !canAccessSettings(user)) {
    redirect('/dashboard')
  }

  return <SettingsClient />
}

