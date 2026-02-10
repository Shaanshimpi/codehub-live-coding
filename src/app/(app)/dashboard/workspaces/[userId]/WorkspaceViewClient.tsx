'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, User } from 'lucide-react'
import { WorkspaceLayout } from '@/components/Workspace/WorkspaceLayout'

interface WorkspaceViewClientProps {
  userId: number
  readOnly: boolean
}

export function WorkspaceViewClient({ userId, readOnly }: WorkspaceViewClientProps) {
  const router = useRouter()
  const [userName, setUserName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUserName = async () => {
      try {
        const res = await fetch(`/api/dashboard/workspace/${userId}/files`, {
          credentials: 'include',
        })
        if (res.ok) {
          const data = await res.json()
          if (data.user) {
            setUserName(data.user.name || data.user.email || `User ${userId}`)
          }
        }
      } catch (error) {
        console.error('Error fetching user name:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchUserName()
  }, [userId])

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background">
      {/* Header Bar */}
      <header className="flex h-14 items-center justify-between border-b bg-card px-4 shadow-sm z-50">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/workspaces"
            className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Workspaces
          </Link>
          <div className="h-6 w-px bg-border" />
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {loading ? 'Loading...' : userName || `User ${userId}`}
            </span>
            {readOnly && (
              <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                Read Only
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Dashboard
          </Link>
          <span className="text-muted-foreground">•</span>
          <Link
            href="/dashboard/workspaces"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Workspaces
          </Link>
          <span className="text-muted-foreground">•</span>
          <span className="text-sm font-medium">
            {loading ? 'Loading...' : userName || `User ${userId}`}
          </span>
        </div>
      </header>

      {/* Full-Screen Workspace */}
      <div className="flex-1 overflow-hidden">
        <WorkspaceLayout userId={userId} readOnly={readOnly} />
      </div>
    </div>
  )
}

