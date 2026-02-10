'use client'

import React from 'react'
import { Users, GraduationCap, FileText } from 'lucide-react'
import { cn } from '@/utilities/ui'

interface TrainerData {
  id: string
  name: string
  code: string
  language: string
  updatedAt: string
  output: any | null
  isTrainer: true
}

interface Student {
  userId: string
  name: string
  code: string
  language: string
  updatedAt: string | null
  output: any | null
  workspaceFileId: string | null
  workspaceFileName: string | null
}

interface UserSidebarProps {
  trainer: TrainerData | null
  students: Student[]
  selectedUserId: string | null
  onSelectUser: (userId: string | null) => void
}

export function UserSidebar({
  trainer,
  students,
  selectedUserId,
  onSelectUser,
}: UserSidebarProps) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Sidebar Header */}
      <div className="border-b bg-muted/50 px-3 py-2">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Users
        </h2>
      </div>

      {/* Scrollable User List */}
      <div className="flex-1 overflow-y-auto">
        {/* Trainer Section */}
        {trainer && (
          <div className="border-b">
            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase">
              Trainer
            </div>
            <button
              onClick={() => onSelectUser(trainer.id)}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors text-left",
                selectedUserId === trainer.id
                  ? "bg-primary/10 text-primary border-l-2 border-primary"
                  : "hover:bg-accent"
              )}
            >
              <GraduationCap className="h-4 w-4 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{trainer.name}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <span className="uppercase">{trainer.language}</span>
                  {trainer.updatedAt && (
                    <span suppressHydrationWarning>
                      {new Date(trainer.updatedAt).toLocaleTimeString()}
                    </span>
                  )}
                </div>
              </div>
            </button>
          </div>
        )}

        {/* Students Section */}
        <div>
          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase">
            Students ({students.length})
          </div>
          {students.length === 0 ? (
            <div className="px-3 py-4 text-xs text-muted-foreground text-center">
              No students have started coding yet.
            </div>
          ) : (
            <div className="space-y-0.5 pb-2">
              {students.map((student) => (
                <button
                  key={student.userId}
                  onClick={() => onSelectUser(student.userId)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors text-left",
                    selectedUserId === student.userId
                      ? "bg-primary/10 text-primary border-l-2 border-primary"
                      : "hover:bg-accent"
                  )}
                >
                  <Users className="h-4 w-4 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{student.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                      <span className="uppercase">{student.language}</span>
                      {student.workspaceFileName && (
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {student.workspaceFileName}
                        </span>
                      )}
                      {student.updatedAt && (
                        <span suppressHydrationWarning>
                          {new Date(student.updatedAt).toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


