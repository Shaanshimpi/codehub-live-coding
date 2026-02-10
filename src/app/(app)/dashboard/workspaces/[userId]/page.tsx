import { redirect } from 'next/navigation'
import { getMeUser } from '@/auth/getMeUser'
import { checkDashboardAccess, canEditFiles } from '@/utilities/dashboardAccess'
import { WorkspaceViewClient } from './WorkspaceViewClient'

export default async function WorkspaceViewPage({
  params,
}: {
  params: Promise<{ userId: string }>
}) {
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

  const { userId } = await params
  const userIdNum = parseInt(userId, 10)

  if (isNaN(userIdNum)) {
    redirect('/dashboard/workspaces')
  }

  // Determine readOnly based on user role (trainer = true, admin/manager = false)
  const readOnly = !canEditFiles(user)

  return <WorkspaceViewClient userId={userIdNum} readOnly={readOnly} />
}

