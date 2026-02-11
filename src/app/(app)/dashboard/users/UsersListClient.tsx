'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, Plus, Eye, Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { hasFullAccess } from '@/utilities/dashboardAccess'
import type { User } from '@/payload-types'

interface UserListItem {
  id: number
  name: string | null
  email: string
  role: 'admin' | 'manager' | 'trainer' | 'student'
  phone: string | null
  college: string | null
  createdAt: string
  updatedAt: string
}

interface UsersResponse {
  docs: UserListItem[]
  totalDocs: number
  limit: number
  page: number
  totalPages: number
}

export function UsersListClient() {
  const router = useRouter()
  const [users, setUsers] = useState<UserListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalDocs, setTotalDocs] = useState(0)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const limit = 20

  // Fetch current user to check permissions
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const res = await fetch('/api/users/me', { credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          setCurrentUser(data.user)
        }
      } catch (err) {
        console.error('Error fetching current user:', err)
      }
    }
    fetchCurrentUser()
  }, [])

  // Fetch users
  const fetchUsers = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      })

      if (search) {
        params.append('search', search)
      }

      if (roleFilter) {
        params.append('role', roleFilter)
      }

      const res = await fetch(`/api/dashboard/users?${params.toString()}`, {
        credentials: 'include',
      })

      if (!res.ok) {
        throw new Error('Failed to fetch users')
      }

      const data: UsersResponse = await res.json()
      setUsers(data.docs)
      setTotalPages(data.totalPages)
      setTotalDocs(data.totalDocs)
    } catch (err) {
      console.error('Error fetching users:', err)
      setError(err instanceof Error ? err.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [page, search, roleFilter])

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (page !== 1) {
        setPage(1)
      } else {
        fetchUsers()
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [search])

  const handleDelete = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return
    }

    try {
      setDeletingId(userId)
      const res = await fetch(`/api/dashboard/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete user')
      }

      // Refresh list
      fetchUsers()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete user')
    } finally {
      setDeletingId(null)
    }
  }

  const canEdit = currentUser ? hasFullAccess(currentUser) : false

  const roleColors = {
    admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    manager: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    trainer: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    student: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Users Management</h1>
          <p className="text-muted-foreground mt-1">Manage all platform users</p>
        </div>
        {canEdit && (
          <Link
            href="/dashboard/users/new"
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create New User
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value)
            setPage(1)
          }}
          className="px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="trainer">Trainer</option>
          <option value="student">Student</option>
        </select>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse h-16 bg-muted rounded-lg"></div>
          ))}
        </div>
      )}

      {/* Users Table */}
      {!loading && !error && (
        <>
          {users.length === 0 ? (
            <div className="rounded-lg border bg-card p-12 text-center">
              <p className="text-muted-foreground">No users found</p>
            </div>
          ) : (
            <>
              <div className="rounded-lg border bg-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Email</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Role</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Phone</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">College</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Created</th>
                        <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {users.map((user) => (
                        <tr key={user.id} className="hover:bg-muted/50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-medium">{user.name || 'N/A'}</div>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {user.email}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium capitalize ${roleColors[user.role]}`}
                            >
                              {user.role}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {user.phone || 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {user.college || 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                href={`/dashboard/users/${user.id}`}
                                className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                                title="View"
                              >
                                <Eye className="h-4 w-4" />
                              </Link>
                              {canEdit && (
                                <>
                                  <Link
                                    href={`/dashboard/users/${user.id}/edit`}
                                    className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                                    title="Edit"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Link>
                                  <button
                                    onClick={() => handleDelete(user.id)}
                                    disabled={deletingId === user.id}
                                    className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50"
                                    title="Delete"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, totalDocs)} of {totalDocs} users
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </button>
                    <span className="text-sm text-muted-foreground">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}



