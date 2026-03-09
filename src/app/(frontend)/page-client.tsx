'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { FolderOpen, PlayCircle, Radio, Monitor, LayoutDashboard } from 'lucide-react'
import { useCurrentUser } from '@/hooks/useCurrentUser'

export function HomePageTitleClient() {
  const { user, isLoading } = useCurrentUser()

  if (isLoading) {
    return <>CodeHub</>
  }

  if (user?.name?.trim()) {
    const firstName = user.name.trim().split(/\s+/)[0]
    return (
      <>
        Hi, {firstName} <br /> Welcome to CodeHub
      </>
    )
  }

  return <>CodeHub</>
}

export function HomePageClient() {
  const { user, isLoading: loading, refetch } = useCurrentUser()

  // Re-check auth when page becomes visible or after login in another tab (shared cache refetch)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') refetch()
    }
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'codehub:postLoginRedirect' && e.newValue === null) refetch()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('storage', handleStorageChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [refetch])

  const isTrainerOrAdmin =
    user?.role === 'trainer' || user?.role === 'admin' || user?.role === 'manager'
  const isStaff = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'trainer'

  const buttonBase =
    'inline-flex h-12 items-center justify-center gap-2 rounded-lg px-6 text-sm font-medium shadow-lg whitespace-nowrap transition-colors'

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-6">
      {/* Workspace Button - Available for all logged-in users */}
      {loading ? (
        <div className={`${buttonBase} bg-muted text-foreground`}>
          <FolderOpen className="h-5 w-5" />
          Loading...
        </div>
      ) : user ? (
        <Link
          href="/workspace"
          className={`${buttonBase} bg-primary text-primary-foreground hover:bg-primary/90`}
        >
          <FolderOpen className="h-5 w-5" />
          Workspace
        </Link>
      ) : (
        <Link
          href="/admin/login?redirect=/"
          className={`${buttonBase} bg-primary text-primary-foreground hover:bg-primary/90`}
        >
          <FolderOpen className="h-5 w-5" />
          Login to Access Workspace
        </Link>
      )}

      {/* Start Session Button - Only for trainers, managers, and admins */}
      {isTrainerOrAdmin && (
        <Link
          href="/trainer/start"
          className={`${buttonBase} bg-secondary text-secondary-foreground border hover:bg-secondary/90`}
        >
          <PlayCircle className="h-5 w-5" />
          Start Session
        </Link>
      )}

      {/* Monitor Session Button - Only for trainers, managers, and admins */}
      {isTrainerOrAdmin && (
        <Link
          href="/staff/monitor"
          className={`${buttonBase} bg-secondary text-secondary-foreground border hover:bg-secondary/90`}
        >
          <Monitor className="h-5 w-5" />
          Monitor Session
        </Link>
      )}

      {/* Dashboard Button - Only for staff (admin, manager, trainer) */}
      {isStaff && (
        <Link
          href="/dashboard"
          className={`${buttonBase} bg-accent text-accent-foreground border hover:bg-accent/90`}
        >
          <LayoutDashboard className="h-5 w-5" />
          Dashboard
        </Link>
      )}

      {/* Join Session Button - Available to everyone */}
      <Link
        href="/join"
        className={`${buttonBase} bg-secondary text-secondary-foreground border hover:bg-secondary/90`}
      >
        <Radio className="h-5 w-5" />
        Join Session
      </Link>
    </div>
  )
}
