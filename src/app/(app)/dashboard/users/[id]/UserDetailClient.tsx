'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  FolderTree, 
  DollarSign,
  Mail,
  Phone,
  GraduationCap,
  Calendar,
  MapPin
} from 'lucide-react'
import { hasFullAccess } from '@/utilities/dashboardAccess'
import type { User } from '@/payload-types'

interface UserDetailClientProps {
  userId: string
  currentUser: User
}

interface UserDetail extends User {
  phone?: string | null
  altPhone?: string | null
  dateOfBirth?: string | null
  college?: string | null
  educationalBackground?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  postalCode?: string | null
  country?: string | null
  trialStartDate?: string | null
  trialEndDate?: string | null
  isAdmissionConfirmed?: boolean | null
}

export function UserDetailClient({ userId, currentUser }: UserDetailClientProps) {
  const router = useRouter()
  const [user, setUser] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true)
        setError(null)

        const res = await fetch(`/api/dashboard/users/${userId}`, {
          credentials: 'include',
        })

        if (!res.ok) {
          if (res.status === 404) {
            throw new Error('User not found')
          }
          throw new Error('Failed to fetch user')
        }

        const data = await res.json()
        setUser(data.doc)
      } catch (err) {
        console.error('Error fetching user:', err)
        setError(err instanceof Error ? err.message : 'Failed to load user')
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [userId])

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return
    }

    try {
      setDeleting(true)
      const res = await fetch(`/api/dashboard/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete user')
      }

      router.push('/dashboard/users')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete user')
      setDeleting(false)
    }
  }

  const canEdit = hasFullAccess(currentUser)

  const roleColors = {
    admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    manager: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    trainer: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    student: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-64 mb-6"></div>
          <div className="h-64 bg-muted rounded-lg"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Link
          href="/dashboard/users"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Users
        </Link>
        <div className="rounded-lg border border-destructive bg-destructive/10 p-6">
          <p className="text-destructive">{error}</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/users"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{user.name || 'Unnamed User'}</h1>
            <p className="text-muted-foreground mt-1">User Details</p>
          </div>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2">
            <Link
              href={`/dashboard/users/${userId}/edit`}
              className="flex items-center gap-2 rounded-lg border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
            >
              <Edit className="h-4 w-4" />
              Edit
            </Link>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-2 rounded-lg border border-destructive bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        )}
      </div>

      {/* User Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Info */}
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <GraduationCap className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Role</p>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium capitalize mt-1 ${roleColors[user.role]}`}
                >
                  {user.role}
                </span>
              </div>
            </div>
            {user.phone && (
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Phone</p>
                  <p className="text-sm text-muted-foreground">{user.phone}</p>
                </div>
              </div>
            )}
            {user.altPhone && (
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Alternate Phone</p>
                  <p className="text-sm text-muted-foreground">{user.altPhone}</p>
                </div>
              </div>
            )}
            {user.dateOfBirth && (
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Date of Birth</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(user.dateOfBirth).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Education & Address */}
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Education & Address</h2>
          <div className="space-y-4">
            {user.college && (
              <div className="flex items-start gap-3">
                <GraduationCap className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">College</p>
                  <p className="text-sm text-muted-foreground">{user.college}</p>
                </div>
              </div>
            )}
            {user.educationalBackground && (
              <div>
                <p className="text-sm font-medium mb-1">Educational Background</p>
                <p className="text-sm text-muted-foreground">{user.educationalBackground}</p>
              </div>
            )}
            {(user.address || user.city || user.state) && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Address</p>
                  <p className="text-sm text-muted-foreground">
                    {[user.address, user.city, user.state, user.postalCode, user.country]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Trial & Admission Info (for students) */}
      {user.role === 'student' && (
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Trial & Admission</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {user.trialStartDate && (
              <div>
                <p className="text-sm font-medium">Trial Start Date</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(user.trialStartDate).toLocaleDateString()}
                </p>
              </div>
            )}
            {user.trialEndDate && (
              <div>
                <p className="text-sm font-medium">Trial End Date</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(user.trialEndDate).toLocaleDateString()}
                </p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium">Admission Confirmed</p>
              <p className="text-sm text-muted-foreground">
                {user.isAdmissionConfirmed ? 'Yes' : 'No'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Link
          href={`/dashboard/workspaces/${userId}`}
          className="flex items-center gap-2 rounded-lg border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
        >
          <FolderTree className="h-4 w-4" />
          View Workspace
        </Link>
        {canEdit && user.role === 'student' && (
          <Link
            href={`/dashboard/fees?studentId=${userId}`}
            className="flex items-center gap-2 rounded-lg border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
          >
            <DollarSign className="h-4 w-4" />
            View Fees
          </Link>
        )}
      </div>

      {/* Metadata */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">Metadata</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-medium">Created At</p>
            <p className="text-muted-foreground">
              {new Date(user.createdAt).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="font-medium">Last Updated</p>
            <p className="text-muted-foreground">
              {new Date(user.updatedAt).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}


