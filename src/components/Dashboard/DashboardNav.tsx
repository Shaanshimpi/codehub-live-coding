'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  Users, 
  DollarSign, 
  FolderTree, 
  Settings 
} from 'lucide-react'
import type { User } from '@/payload-types'
import { canAccessFees, canAccessSettings } from '@/utilities/dashboardAccess'
import { cn } from '@/utilities/ui'

interface DashboardNavProps {
  user: User
}

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  requiresFullAccess?: boolean
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Users', href: '/dashboard/users', icon: Users },
  { label: 'Fees', href: '/dashboard/fees', icon: DollarSign, requiresFullAccess: true },
  { label: 'Workspaces', href: '/dashboard/workspaces', icon: FolderTree },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings, requiresFullAccess: true },
]

export function DashboardNav({ user }: DashboardNavProps) {
  const pathname = usePathname()

  const filteredNavItems = navItems.filter((item) => {
    if (item.requiresFullAccess) {
      return canAccessFees(user) || canAccessSettings(user)
    }
    return true
  })

  return (
    <nav className="space-y-1">
      {filteredNavItems.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
        
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

