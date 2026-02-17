'use client'

import React, { useState } from 'react'
import { Radio, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { PaymentBlocked } from '@/components/Payment/PaymentBlocked'
import { ActiveSessionsList } from '@/components/Session/ActiveSessionsList'

interface PaymentStatus {
  isBlocked: boolean
  isDueSoon: boolean
  nextInstallment?: {
    dueDate: string
    amount: number
    paymentMethod?: string
  }
  reason?: 'MAINTENANCE_MODE' | 'ADMISSION_NOT_CONFIRMED' | 'PAYMENT_OVERDUE' | 'TRIAL_EXPIRED'
  daysUntilDue?: number
  daysOverdue?: number
}

export function JoinSessionClient() {
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!joinCode.trim()) {
      setError('Please enter a join code')
      return
    }

    setLoading(true)

    try {
      // Validate join code format (XXX-XXX-XXX), excluding confusing characters (0, O, I, 1, L)
      const codePattern = /^[A-HJ-NP-Z2-9]{3}-[A-HJ-NP-Z2-9]{3}-[A-HJ-NP-Z2-9]{3}$/i
      if (!codePattern.test(joinCode.trim())) {
        setError('Invalid code. Use only A–Z (no O/I/L) and digits 2–9, e.g. ABC-234-XYZ')
        setLoading(false)
        return
      }

      // Check if session exists
      const response = await fetch(`/api/sessions/${joinCode.trim().toUpperCase()}/live`)

      if (!response.ok) {
        if (response.status === 404) {
          setError('Session not found. Please check the code and try again.')
        } else {
          setError('Failed to join session. Please try again.')
        }
        setLoading(false)
        return
      }

      const session = await response.json()

      if (!session.isActive) {
        setError('This session has ended.')
        setLoading(false)
        return
      }

      // Join the session
      const joinResponse = await fetch(
        `/api/sessions/${joinCode.trim().toUpperCase()}/join`,
        {
          method: 'POST',
        },
      )

      if (!joinResponse.ok) {
        // Check if it's a payment-related error
        if (joinResponse.status === 403) {
          try {
            const errorData = await joinResponse.json()
            if (errorData.paymentStatus) {
              setPaymentStatus(errorData.paymentStatus)
              setLoading(false)
              return
            }
          } catch {
            // Fall through to generic error
          }
        }
        setError('Failed to join session. Please try again.')
        setLoading(false)
        return
      }

      // Redirect to new session view (with workspace integration)
      window.location.href = `/student/session/${joinCode.trim().toUpperCase()}`
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setLoading(false)
    }
  }

  const handleSessionSelect = async (joinCode: string) => {
    setError(null)
    setLoading(true)

    try {
      // Check if session exists
      const response = await fetch(`/api/sessions/${joinCode.trim().toUpperCase()}/live`)

      if (!response.ok) {
        if (response.status === 404) {
          setError('Session not found. Please check the code and try again.')
        } else {
          setError('Failed to join session. Please try again.')
        }
        setLoading(false)
        return
      }

      const session = await response.json()

      if (!session.isActive) {
        setError('This session has ended.')
        setLoading(false)
        return
      }

      // Join the session
      const joinResponse = await fetch(
        `/api/sessions/${joinCode.trim().toUpperCase()}/join`,
        {
          method: 'POST',
        },
      )

      if (!joinResponse.ok) {
        // Check if it's a payment-related error
        if (joinResponse.status === 403) {
          try {
            const errorData = await joinResponse.json()
            if (errorData.paymentStatus) {
              setPaymentStatus(errorData.paymentStatus)
              setLoading(false)
              return
            }
          } catch {
            // Fall through to generic error
          }
        }
        setError('Failed to join session. Please try again.')
        setLoading(false)
        return
      }

      // Redirect to new session view (with workspace integration)
      window.location.href = `/student/session/${joinCode.trim().toUpperCase()}`
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setLoading(false)
    }
  }

  // Show payment blocked screen if student is blocked
  if (paymentStatus?.isBlocked) {
    return (
      <PaymentBlocked
        reason={paymentStatus.reason}
        nextInstallment={paymentStatus.nextInstallment}
        daysOverdue={paymentStatus.daysOverdue}
      />
    )
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-16">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-semibold">Join Live Session</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter the code shared by your trainer to join the live coding session
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Manual Code Entry */}
        <div className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
            <div>
              <label className="text-sm font-medium">Join Code</label>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => {
                  setJoinCode(e.target.value.toUpperCase())
                  setError(null)
                }}
                placeholder="ABC-234-XYZ"
                className="mt-1 w-full rounded-md border bg-background px-4 py-3 text-center text-lg font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-ring"
                maxLength={11}
                autoFocus
                disabled={loading}
              />
              <p className="mt-1 text-xs text-muted-foreground text-center">
                Format: XXX-XXX-XXX (no 0/O/I/1/L)
              </p>
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !joinCode.trim()}
              className="w-full flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                'Joining...'
              ) : (
                <>
                  <Radio className="h-4 w-4" />
                  Join Session
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="text-center">
            <Link
              href="/workspace"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← Back to Workspace
            </Link>
          </div>
        </div>

        {/* Active Sessions List */}
        <div>
          <ActiveSessionsList
            onSessionSelect={handleSessionSelect}
            actionLabel="Join"
            actionIcon={<Radio className="h-4 w-4" />}
            emptyMessage="No active sessions available."
            emptySubMessage="Ask your trainer for a session code or wait for a session to start."
          />
        </div>
      </div>
    </div>
  )
}

