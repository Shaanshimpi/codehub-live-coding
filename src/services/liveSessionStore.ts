/**
 * Simple in-memory store for live session state
 * TODO: Replace with real backend API (Payload CMS, WebSockets, etc.)
 */

import { CodeSnapshot, LiveLecture, LiveEvent } from '@/types/live-session'

// In-memory storage (will be replaced with backend)
const sessions = new Map<string, LiveLecture>()
const snapshots = new Map<string, CodeSnapshot>()
const eventListeners = new Map<string, Set<(event: LiveEvent) => void>>()

/**
 * Get or create a live lecture session
 */
export function getOrCreateSession(lectureId: string, trainerId: string = 'trainer-1'): LiveLecture {
  if (!sessions.has(lectureId)) {
    sessions.set(lectureId, {
      id: lectureId,
      title: `Live Lecture: ${lectureId}`,
      trainerId,
      startedAt: new Date(),
      status: 'active',
    })
  }
  return sessions.get(lectureId)!
}

/**
 * Save a code snapshot (called when trainer clicks Run)
 */
export function saveCodeSnapshot(
  lectureId: string,
  code: string,
  language: string,
  executionResult?: any,
): CodeSnapshot {
  const session = getOrCreateSession(lectureId)
  const snapshotId = `${lectureId}-${Date.now()}`

  const snapshot: CodeSnapshot = {
    id: snapshotId,
    code,
    language,
    timestamp: new Date(),
    executionResult,
  }

  // Save snapshot
  snapshots.set(snapshotId, snapshot)

  // Update current snapshot on session
  session.currentSnapshot = snapshot

  // Broadcast event
  broadcastEvent(lectureId, {
    type: 'code_saved',
    timestamp: new Date(),
    data: snapshot,
  })

  console.log(`[LiveSession] Saved snapshot for ${lectureId}:`, snapshot.id)

  return snapshot
}

/**
 * Update execution result for current snapshot
 */
export function updateExecutionResult(lectureId: string, executionResult: any): void {
  const session = sessions.get(lectureId)
  if (session?.currentSnapshot) {
    session.currentSnapshot.executionResult = executionResult

    // Broadcast execution completed event
    broadcastEvent(lectureId, {
      type: 'execution_completed',
      timestamp: new Date(),
      data: executionResult,
    })

    console.log(`[LiveSession] Updated execution result for ${lectureId}`)
  }
}

/**
 * Get current code snapshot for a lecture
 */
export function getCurrentSnapshot(lectureId: string): CodeSnapshot | null {
  const session = sessions.get(lectureId)
  return session?.currentSnapshot || null
}

/**
 * Subscribe to live events for a lecture
 */
export function subscribeToEvents(
  lectureId: string,
  callback: (event: LiveEvent) => void,
): () => void {
  if (!eventListeners.has(lectureId)) {
    eventListeners.set(lectureId, new Set())
  }

  const listeners = eventListeners.get(lectureId)!
  listeners.add(callback)

  console.log(`[LiveSession] Subscribed to events for ${lectureId}`)

  // Return unsubscribe function
  return () => {
    listeners.delete(callback)
    console.log(`[LiveSession] Unsubscribed from events for ${lectureId}`)
  }
}

/**
 * Broadcast an event to all subscribers
 */
function broadcastEvent(lectureId: string, event: LiveEvent): void {
  const listeners = eventListeners.get(lectureId)
  if (listeners) {
    listeners.forEach((callback) => {
      try {
        callback(event)
      } catch (error) {
        console.error('[LiveSession] Error in event listener:', error)
      }
    })
  }
}

/**
 * Change language for a lecture
 */
export function changeLanguage(lectureId: string, language: string): void {
  const session = sessions.get(lectureId)
  if (session) {
    broadcastEvent(lectureId, {
      type: 'language_changed',
      timestamp: new Date(),
      data: { language },
    })
  }
}

/**
 * Get all saved snapshots for a lecture (for history)
 */
export function getLectureSnapshots(lectureId: string): CodeSnapshot[] {
  return Array.from(snapshots.values()).filter((s) => s.id.startsWith(lectureId))
}

/**
 * Clear session data (for testing/cleanup)
 */
export function clearSession(lectureId: string): void {
  sessions.delete(lectureId)
  // Remove all snapshots for this lecture
  Array.from(snapshots.keys())
    .filter((key) => key.startsWith(lectureId))
    .forEach((key) => snapshots.delete(key))
  eventListeners.delete(lectureId)

  console.log(`[LiveSession] Cleared session: ${lectureId}`)
}





