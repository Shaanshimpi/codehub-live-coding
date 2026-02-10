'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Users, 
  GraduationCap, 
  UserCog, 
  Radio, 
  DollarSign, 
  AlertCircle,
  FolderTree,
  FileText,
  Plus,
  Settings
} from 'lucide-react'
import { StatsCard } from '@/components/Dashboard/StatsCard'
import { RecentActivity } from '@/components/Dashboard/RecentActivity'
import { useRouter } from 'next/navigation'
import { hasFullAccess } from '@/utilities/dashboardAccess'
import type { User } from '@/payload-types'

interface DashboardStats {
  totalStudents: number
  totalTrainers: number
  totalAdmins: number
  totalManagers: number
  activeSessions: number
  totalFiles: number
  totalFolders: number
  pendingPayments?: number
  overduePayments?: number
}

interface ActivityItem {
  type: 'user_registration' | 'fee_payment' | 'file_creation' | 'session_start'
  title: string
  description: string
  timestamp: string
  link?: string
  userId?: number
  userName?: string
}

export function DashboardHomeClient() {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch user info
        const userRes = await fetch('/api/users/me', { credentials: 'include' })
        if (userRes.ok) {
          const userData = await userRes.json()
          setUser(userData.user)
        }

        // Fetch statistics
        const statsRes = await fetch('/api/dashboard/stats', { credentials: 'include' })
        if (!statsRes.ok) {
          throw new Error('Failed to fetch statistics')
        }
        const statsData = await statsRes.json()
        setStats(statsData.stats)

        // Fetch activity feed
        const activityRes = await fetch('/api/dashboard/activity', { credentials: 'include' })
        if (!activityRes.ok) {
          throw new Error('Failed to fetch activity feed')
        }
        const activityData = await activityRes.json()
        setActivities(activityData.activities || [])
      } catch (err) {
        console.error('Error fetching dashboard data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const isFullAccess = user ? hasFullAccess(user) : false

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-64 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive bg-destructive/10 p-6">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Error Loading Dashboard</h2>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back! Here&apos;s what&apos;s happening.</p>
        </div>
      </div>

      {/* Quick Actions */}
      {isFullAccess && (
        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard/users"
            className="flex items-center gap-2 rounded-lg border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
          >
            <Plus className="h-4 w-4" />
            Create New User
          </Link>
          <Link
            href="/dashboard/fees"
            className="flex items-center gap-2 rounded-lg border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
          >
            <Plus className="h-4 w-4" />
            Create Fee Record
          </Link>
          <Link
            href="/dashboard/settings"
            className="flex items-center gap-2 rounded-lg border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
          >
            <Settings className="h-4 w-4" />
            Platform Settings
          </Link>
        </div>
      )}

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Students"
            value={stats.totalStudents}
            icon={Users}
          />
          <StatsCard
            title="Total Trainers"
            value={stats.totalTrainers}
            icon={GraduationCap}
          />
          {isFullAccess && (
            <>
              <StatsCard
                title="Total Admins"
                value={stats.totalAdmins}
                icon={UserCog}
              />
              <StatsCard
                title="Total Managers"
                value={stats.totalManagers}
                icon={UserCog}
              />
            </>
          )}
          <StatsCard
            title="Active Sessions"
            value={stats.activeSessions}
            icon={Radio}
          />
          {isFullAccess && stats.pendingPayments !== undefined && (
            <StatsCard
              title="Pending Payments"
              value={stats.pendingPayments}
              icon={DollarSign}
            />
          )}
          {isFullAccess && stats.overduePayments !== undefined && (
            <StatsCard
              title="Overdue Payments"
              value={stats.overduePayments}
              icon={AlertCircle}
              className="border-destructive/50"
            />
          )}
          <StatsCard
            title="Total Files"
            value={stats.totalFiles}
            icon={FileText}
          />
          <StatsCard
            title="Total Folders"
            value={stats.totalFolders}
            icon={FolderTree}
          />
        </div>
      )}

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentActivity activities={activities} loading={loading} />
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Quick Links</h2>
          <div className="space-y-2">
            <Link
              href="/dashboard/users"
              className="block rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
            >
              Manage Users
            </Link>
            <Link
              href="/dashboard/workspaces"
              className="block rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
            >
              View Workspaces
            </Link>
            {isFullAccess && (
              <>
                <Link
                  href="/dashboard/fees"
                  className="block rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
                >
                  Manage Fees
                </Link>
                <Link
                  href="/dashboard/settings"
                  className="block rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
                >
                  Platform Settings
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

