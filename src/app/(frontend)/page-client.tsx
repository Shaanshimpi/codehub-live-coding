'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { FolderOpen, PlayCircle, Radio, Monitor, LayoutDashboard } from 'lucide-react'

interface User {
  id: string
  email: string
  role?: 'admin' | 'trainer' | 'student' | 'manager'
}

export function HomePageClient() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const userRef = useRef<User | null>(null)

  useEffect(() => {
    let mounted = true

    // Fetch user on mount
    const fetchUser = async () => {
      console.log('[HomePageClient] fetchUser called')
      try {
        // Use absolute URL to avoid port issues
        const apiUrl = `${window.location.origin}/api/users/me`
        console.log('[HomePageClient] Fetching /api/users/me...')
        console.log('[HomePageClient] Full URL:', apiUrl)
        console.log('[HomePageClient] Current window location:', window.location.href)
        const res = await fetch(apiUrl, { 
          cache: 'no-store',
          credentials: 'include', // Important: include cookies
        })
        
        console.log('[HomePageClient] Response status:', res.status, res.statusText)
        
        if (res.ok) {
          const data = await res.json()
          console.log('[HomePageClient] Response data:', data)
          console.log('[HomePageClient] User from response:', data.user)
          
          if (mounted) {
            const userData = data.user || null
            console.log('[HomePageClient] Setting user state to:', userData)
            userRef.current = userData
            setUser(userData)
          }
        } else {
          const errorText = await res.text()
          console.log('[HomePageClient] Response not OK. Error:', errorText)
          if (mounted) {
            console.log('[HomePageClient] Setting user to null (response not OK)')
            userRef.current = null
            setUser(null)
          }
        }
      } catch (error) {
        console.error('[HomePageClient] Error fetching user:', error)
        if (mounted) {
          console.log('[HomePageClient] Setting user to null (error caught)')
          userRef.current = null
          setUser(null)
        }
      } finally {
        if (mounted) {
          console.log('[HomePageClient] Setting loading to false')
          setLoading(false)
        }
      }
    }

    // Check cookies for debugging
    const checkCookies = () => {
      const cookies = document.cookie.split('; ')
      const tokenCookie = cookies.find((row) => row.startsWith('payload-token='))
      console.log('[HomePageClient] All cookies:', document.cookie)
      console.log('[HomePageClient] Token cookie found:', !!tokenCookie)
      if (tokenCookie) {
        const tokenValue = tokenCookie.split('=')[1]
        console.log('[HomePageClient] Token value (first 20 chars):', tokenValue?.substring(0, 20))
      }
    }

    console.log('[HomePageClient] Component mounted, checking cookies...')
    checkCookies()

    // Check once on mount
    console.log('[HomePageClient] Calling fetchUser on mount...')
    fetchUser()

    // Also check after a short delay (in case we just redirected from login)
    // This handles the case where cookies are set but not immediately available
    const delayedCheck = setTimeout(() => {
      if (mounted && !userRef.current) {
        console.log('[HomePageClient] Delayed check after mount (handles post-login redirect)...')
        checkCookies()
        fetchUser()
      }
    }, 500)

    // Only check again when page becomes visible (user might have logged in in another tab)
    // This is much more efficient than polling
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[HomePageClient] Page became visible, re-checking auth...')
        checkCookies()
        // Re-check auth when page becomes visible (in case user logged in elsewhere)
        fetchUser()
      }
    }

    // Listen for storage events (login in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'codehub:postLoginRedirect' && e.newValue === null) {
        console.log('[HomePageClient] Storage event detected - login may have completed, re-checking...')
        checkCookies()
        fetchUser()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('storage', handleStorageChange)

    return () => {
      console.log('[HomePageClient] Component unmounting')
      mounted = false
      clearTimeout(delayedCheck)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, []) // Only run once on mount

  const isTrainerOrAdmin = user?.role === 'trainer' || user?.role === 'admin' || user?.role === 'manager'
  // Check if user is staff (non-student): admin, manager, or trainer
  const isStaff = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'trainer'

  // Debug logging for user state changes
  useEffect(() => {
    console.log('[HomePageClient] User state changed:', user)
    console.log('[HomePageClient] Loading state:', loading)
    console.log('[HomePageClient] Is trainer/admin:', isTrainerOrAdmin)
    console.log('[HomePageClient] Is staff:', isStaff)
  }, [user, loading, isTrainerOrAdmin, isStaff])

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

