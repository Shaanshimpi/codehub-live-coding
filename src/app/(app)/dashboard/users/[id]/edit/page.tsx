import React from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getMeUser } from '@/auth/getMeUser'
import { hasFullAccess, canAccessFees } from '@/utilities/dashboardAccess'
import { UserForm } from '@/components/Dashboard/UserForm'
import { FolderTree, DollarSign } from 'lucide-react'
import { getPayload } from 'payload'
import config from '@payload-config'

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

    // Fetch the user being edited to check their role
    const payload = await getPayload({ config })
    let userBeingEdited = null
    try {
      userBeingEdited = await payload.findByID({
        collection: 'users',
        id: parseInt(id, 10),
        overrideAccess: true,
      })
    } catch (error) {
      // User not found, redirect
      redirect('/dashboard/users')
    }

    const isStudent = userBeingEdited?.role === 'student'
    const showFeesLink = canAccessFees(user) && isStudent

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Edit User</h1>
            <p className="text-muted-foreground mt-1">Update user information</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/dashboard/workspaces/${id}`}
              className="inline-flex items-center gap-2 rounded-lg border bg-background px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
            >
              <FolderTree className="h-4 w-4" />
              View Workspace
            </Link>
            {showFeesLink && (
              <Link
                href={`/dashboard/fees?studentId=${id}`}
                className="inline-flex items-center gap-2 rounded-lg border bg-background px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
              >
                <DollarSign className="h-4 w-4" />
                View Fees
              </Link>
            )}
          </div>
        </div>
        <UserForm mode="edit" userId={id} />
      </div>
    )
  } catch (error) {
    redirect('/dashboard/users')
  }
}




