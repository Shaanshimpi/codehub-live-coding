'use client'

import React from 'react'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/utilities/ui'

interface StatsCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  change?: {
    value: number
    label: string
    positive?: boolean
  }
  className?: string
}

export function StatsCard({ title, value, icon: Icon, change, className }: StatsCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border bg-card p-6 shadow-sm transition-shadow hover:shadow-md',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-bold">{value}</p>
          {change && (
            <p
              className={cn(
                'mt-2 text-sm',
                change.positive !== false
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              )}
            >
              {change.positive !== false ? '+' : ''}
              {change.value} {change.label}
            </p>
          )}
        </div>
        <div className="rounded-full bg-primary/10 p-3">
          <Icon className="h-6 w-6 text-primary" />
        </div>
      </div>
    </div>
  )
}


