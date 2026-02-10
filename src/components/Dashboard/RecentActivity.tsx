'use client'

import React from 'react'
import Link from 'next/link'
import { UserPlus, DollarSign, FileText, Radio, Clock } from 'lucide-react'

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)
  
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)} weeks ago`
  if (seconds < 31536000) return `${Math.floor(seconds / 2592000)} months ago`
  return `${Math.floor(seconds / 31536000)} years ago`
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

interface RecentActivityProps {
  activities: ActivityItem[]
  loading?: boolean
}

const activityIcons = {
  user_registration: UserPlus,
  fee_payment: DollarSign,
  file_creation: FileText,
  session_start: Radio,
}

const activityColors = {
  user_registration: 'text-blue-600 dark:text-blue-400',
  fee_payment: 'text-green-600 dark:text-green-400',
  file_creation: 'text-purple-600 dark:text-purple-400',
  session_start: 'text-orange-600 dark:text-orange-400',
}

export function RecentActivity({ activities, loading }: RecentActivityProps) {
  if (loading) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
        <p className="text-sm text-muted-foreground">No recent activity</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card p-6">
      <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
      <div className="space-y-4">
        {activities.map((activity, index) => {
          const Icon = activityIcons[activity.type]
          const colorClass = activityColors[activity.type]
          const timeAgo = formatTimeAgo(new Date(activity.timestamp))

          const content = (
            <div className="flex items-start gap-3">
              <div className={`rounded-full bg-muted p-2 ${colorClass}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{activity.title}</p>
                <p className="text-sm text-muted-foreground mt-1">{activity.description}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{timeAgo}</span>
                </div>
              </div>
            </div>
          )

          if (activity.link) {
            return (
              <Link
                key={index}
                href={activity.link}
                className="block rounded-lg border border-transparent p-3 transition-colors hover:border-border hover:bg-muted/50"
              >
                {content}
              </Link>
            )
          }

          return (
            <div key={index} className="rounded-lg border border-transparent p-3">
              {content}
            </div>
          )
        })}
      </div>
    </div>
  )
}

