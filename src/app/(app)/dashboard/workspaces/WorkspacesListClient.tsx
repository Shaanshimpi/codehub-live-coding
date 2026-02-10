'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { StudentListSidebar } from '@/components/Dashboard/StudentListSidebar'

export function WorkspacesListClient() {
  const router = useRouter()

  const handleStudentSelect = (studentId: number) => {
    router.push(`/dashboard/workspaces/${studentId}`)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Workspaces</h1>
        <p className="text-muted-foreground mt-1">
          Select a student to view their workspace
        </p>
      </div>

      <div className="flex h-[calc(100vh-16rem)] overflow-hidden rounded-lg border bg-card">
        {/* Student List Sidebar */}
        <div className="w-80 flex-shrink-0">
          <StudentListSidebar
            selectedStudentId={null}
            onStudentSelect={handleStudentSelect}
          />
        </div>

        {/* Empty State */}
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center space-y-2">
            <p className="text-lg font-medium text-muted-foreground">Select a Student</p>
            <p className="text-sm text-muted-foreground">
              Choose a student from the sidebar to view their workspace
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

