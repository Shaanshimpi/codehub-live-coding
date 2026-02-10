'use client'

import React, { useState, useEffect } from 'react'
import { Search, User } from 'lucide-react'

interface Student {
  id: number
  name: string
  email: string
  role: string
}

interface StudentListSidebarProps {
  selectedStudentId?: number | null
  onStudentSelect: (studentId: number) => void
}

export function StudentListSidebar({ selectedStudentId, onStudentSelect }: StudentListSidebarProps) {
  const [students, setStudents] = useState<Student[]>([])
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true)
        setError(null)

        const res = await fetch('/api/dashboard/users?role=student&limit=1000', {
          credentials: 'include',
        })

        if (!res.ok) {
          throw new Error('Failed to fetch students')
        }

        const data = await res.json()
        setStudents(data.docs || [])
        setFilteredStudents(data.docs || [])
      } catch (err) {
        console.error('Error fetching students:', err)
        setError(err instanceof Error ? err.message : 'Failed to load students')
      } finally {
        setLoading(false)
      }
    }

    fetchStudents()
  }, [])

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredStudents(students)
      return
    }

    const query = searchQuery.toLowerCase().trim()
    const filtered = students.filter(
      (student) =>
        student.name?.toLowerCase().includes(query) ||
        student.email?.toLowerCase().includes(query)
    )
    setFilteredStudents(filtered)
  }, [searchQuery, students])

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'student':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'trainer':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'admin':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case 'manager':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading students...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col border-r bg-muted/30">
      {/* Header */}
      <div className="border-b bg-card px-4 py-3">
        <h2 className="text-sm font-semibold">Students</h2>
        <p className="text-xs text-muted-foreground mt-1">
          {filteredStudents.length} {filteredStudents.length === 1 ? 'student' : 'students'}
        </p>
      </div>

      {/* Search */}
      <div className="border-b bg-card px-3 py-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search students..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border bg-background pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      {/* Student List */}
      <div className="flex-1 overflow-y-auto">
        {filteredStudents.length === 0 ? (
          <div className="flex h-full items-center justify-center p-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                {searchQuery ? 'No students found' : 'No students'}
              </p>
            </div>
          </div>
        ) : (
          <div className="p-2">
            {filteredStudents.map((student) => {
              const isSelected = selectedStudentId === student.id
              return (
                <button
                  key={student.id}
                  onClick={() => onStudentSelect(student.id)}
                  className={`w-full rounded-lg border p-3 text-left transition-colors mb-2 ${
                    isSelected
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-card hover:bg-accent'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <User className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-medium truncate ${isSelected ? 'text-primary' : ''}`}>
                          {student.name || 'Unnamed'}
                        </p>
                        <span
                          className={`flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${getRoleBadgeColor(
                            student.role
                          )}`}
                        >
                          {student.role}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {student.email}
                      </p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}


