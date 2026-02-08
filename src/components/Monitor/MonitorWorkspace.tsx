'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowLeft, RefreshCw, Loader2, Users } from 'lucide-react'
import { cn } from '@/utilities/ui'
import { UserSidebar } from './UserSidebar'
import { CodeViewer } from './CodeViewer'
import type { ExecutionResult } from '@/services/codeExecution'

interface MonitorWorkspaceProps {
  sessionCode: string
  sessionTitle: string
  trainerId: string | null
  trainerName: string
  participantCount: number
  trainerCode: string
  trainerLanguage: string
  trainerOutput: ExecutionResult | null
  students: Array<{
    userId: string
    name: string
    code: string
    language: string
    updatedAt: string | null
    output: any | null
    workspaceFileId: string | null
    workspaceFileName: string | null
  }>
  selectedUserId: string | null
  onSelectUser: (userId: string | null) => void
  onRefresh: () => void
  refreshing: boolean
  refreshSuccess: boolean
}

export function MonitorWorkspace({
  sessionCode,
  sessionTitle,
  trainerId,
  trainerName,
  participantCount,
  trainerCode,
  trainerLanguage,
  trainerOutput,
  students,
  selectedUserId,
  onSelectUser,
  onRefresh,
  refreshing,
  refreshSuccess,
}: MonitorWorkspaceProps) {
  // Prepare trainer data
  const trainerData: {
    id: string
    name: string
    code: string
    language: string
    updatedAt: string
    output: ExecutionResult | null
    isTrainer: true
  } | null = trainerId ? {
    id: `trainer-${trainerId}`,
    name: trainerName,
    code: trainerCode,
    language: trainerLanguage,
    updatedAt: new Date().toISOString(),
    output: trainerOutput,
    isTrainer: true as const,
  } : null

  // Get selected user data - convert student to User format
  const selectedUser = selectedUserId === trainerData?.id
    ? trainerData
    : (() => {
        const student = students.find(s => s.userId === selectedUserId)
        if (!student) return null
        return {
          id: student.userId,
          name: student.name,
          code: student.code,
          language: student.language,
          updatedAt: student.updatedAt || new Date().toISOString(),
          output: student.output,
          isTrainer: false as const,
        }
      })()

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <header className="border-b bg-muted/30 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/staff/monitor"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
            <div className="h-6 w-px bg-border" />
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-semibold">{sessionTitle}</h1>
              <span className="text-xs text-muted-foreground font-mono">{sessionCode}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{participantCount} participant{participantCount !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className={cn(
              "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors",
              refreshSuccess 
                ? "bg-green-500/20 border-green-500 text-green-700 dark:text-green-400" 
                : "bg-background hover:bg-accent",
              refreshing && "opacity-50 cursor-not-allowed"
            )}
            title="Refresh session data"
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span>{refreshSuccess ? 'Refreshed!' : 'Refresh'}</span>
          </button>
        </div>
      </header>

      {/* Main Content - VS Code style layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - User List */}
        <div className="w-64 border-r bg-muted/30 overflow-hidden flex flex-col">
          <UserSidebar
            trainer={trainerData}
            students={students}
            selectedUserId={selectedUserId}
            onSelectUser={onSelectUser}
          />
        </div>

        {/* Right Workspace - Code Viewer */}
        <div className="flex-1 overflow-hidden">
          <CodeViewer user={selectedUser} />
        </div>
      </div>
    </div>
  )
}

