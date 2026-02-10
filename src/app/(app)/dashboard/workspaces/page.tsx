import { redirect } from 'next/navigation'
import { getMeUser } from '@/auth/getMeUser'
import { checkDashboardAccess } from '@/utilities/dashboardAccess'
import { WorkspacesListClient } from './WorkspacesListClient'

export default async function WorkspacesPage() {
  let user
  try {
    const result = await getMeUser({ nullUserRedirect: undefined })
    user = result.user
  } catch (error) {
    redirect('/')
  }

  if (!user || !checkDashboardAccess(user)) {
    redirect('/dashboard')
  }

  return <WorkspacesListClient />
}
