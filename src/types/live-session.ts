// Live Session Types for Codehub Live Coding Platform

/**
 * Represents a saved code snapshot with execution results
 */
export interface CodeSnapshot {
  id: string
  code: string
  language: string
  timestamp: Date
  executionResult?: ExecutionResult
}

/**
 * Execution result from code runner
 */
export interface ExecutionResult {
  stdout: string
  stderr: string
  status: 'success' | 'runtime_error' | 'compilation_error' | 'timeout' | 'error'
  executionTime?: number
  memory?: number
  exitCode?: number
}

/**
 * Live lecture session metadata
 */
export interface LiveLecture {
  id: string
  title: string
  trainerId: string
  startedAt: Date
  endedAt?: Date
  status: 'active' | 'paused' | 'ended'
  currentSnapshot?: CodeSnapshot
}

/**
 * Participant in a live lecture
 */
export interface LiveParticipant {
  id: string
  name: string
  role: 'trainer' | 'student'
  joinedAt: Date
  isOnline: boolean
}

/**
 * Live event for broadcasting actions
 */
export interface LiveEvent {
  type: 'code_saved' | 'execution_completed' | 'language_changed' | 'lecture_paused' | 'lecture_resumed'
  timestamp: Date
  data: any
}

/**
 * User role in a live session
 */
export type UserRole = 'trainer' | 'student'

/**
 * Props for components that need role-based rendering
 */
export interface RoleBasedProps {
  role: UserRole
  lectureId: string
}


