'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { LogOut, User as UserIcon } from 'lucide-react'
import type { User } from '@/payload-types'
import { DashboardNav } from './DashboardNav'
import { cn } from '@/utilities/ui'

interface DashboardLayoutProps {
  children: React.ReactNode
  user: User
}

export function DashboardLayout({ children, user }: DashboardLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = React.useState(true)
  
  // Check if we're on a workspace view route - if so, render children without dashboard wrapper
  const isWorkspaceViewRoute = pathname?.match(/^\/dashboard\/workspaces\/\d+$/) !== null

  const handleLogout = async () => {
    try {
      // Call Payload logout endpoint
      await fetch('/api/users/logout', {
        method: 'POST',
        credentials: 'include',
      })
      // Clear any client-side state and redirect to home
      router.push('/')
      router.refresh()
    } catch (error) {
      console.error('Logout error:', error)
      // Even if API fails, try to clear cookie and redirect
      document.cookie = 'payload-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      router.push('/')
      router.refresh()
    }
  }

  // If on workspace view route, render children directly without dashboard wrapper
  if (isWorkspaceViewRoute) {
    return <>{children}</>
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          'flex flex-col border-r bg-card transition-all duration-300',
          sidebarOpen ? 'w-64' : 'w-16'
        )}
      >
        {/* Logo/Header */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          {sidebarOpen && (
            <Link href="/dashboard" className="text-lg font-semibold">
              CodeHub Dashboard
            </Link>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-md p-1.5 hover:bg-accent"
            aria-label="Toggle sidebar"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {sidebarOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto p-4">
          {sidebarOpen && <DashboardNav user={user} />}
        </div>

        {/* User Info & Logout */}
        <div className="border-t p-4">
          {sidebarOpen ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <UserIcon className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 truncate">
                  <div className="font-medium">{user.name || user.email}</div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {user.role}
                  </div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={handleLogout}
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                aria-label="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="flex h-16 items-center justify-between border-b bg-card px-6">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
              ← Back to Home
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-6 pr-24 pb-24">{children}</div>
      </main>
    </div>
  )
}

