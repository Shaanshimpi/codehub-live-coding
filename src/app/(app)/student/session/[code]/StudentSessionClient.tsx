'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { StudentSessionWorkspace } from '@/components/SessionWorkspace/StudentSessionWorkspace'
import { PaymentDueModal } from '@/components/Payment/PaymentDueModal'
import { PaymentGracePeriodModal } from '@/components/Payment/PaymentGracePeriodModal'
import { TrialEndingSoonModal } from '@/components/Payment/TrialEndingSoonModal'
import { TrialGracePeriodModal } from '@/components/Payment/TrialGracePeriodModal'
import { PaymentBlocked } from '@/components/Payment/PaymentBlocked'

type PaymentStatus = {
  isBlocked: boolean
  isDueSoon: boolean
  isInGracePeriod?: boolean
  nextInstallment?: {
    dueDate: string
    amount: number
    paymentMethod?: string
  }
  trialEndDate?: string | null
  isTrialEndingSoon?: boolean
  isTrialInGracePeriod?: boolean
  daysUntilTrialEnd?: number
  daysTrialOverdue?: number
  daysRemainingInTrialGracePeriod?: number
  reason?: 'MAINTENANCE_MODE' | 'ADMISSION_NOT_CONFIRMED' | 'PAYMENT_OVERDUE' | 'TRIAL_EXPIRED'
  daysUntilDue?: number
  daysOverdue?: number
  daysRemainingInGracePeriod?: number
}

type LiveSessionLiveResponse = {
  code: string
  output: any
  isActive: boolean
  title: string
  language: string | null
  participantCount: number
  paymentStatus?: PaymentStatus | null
}

function normalizeCodeParam(codeParam: string | string[] | undefined): string {
  const code = Array.isArray(codeParam) ? codeParam[0] : codeParam
  return (code || '').toUpperCase()
}

export function StudentSessionClient() {
  const params = useParams<{ code: string }>()
  const joinCode = useMemo(() => normalizeCodeParam(params?.code), [params])

  const [sessionTitle, setSessionTitle] = useState<string>('Live Session')
  const [sessionActive, setSessionActive] = useState<boolean>(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Payment status
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showGracePeriodModal, setShowGracePeriodModal] = useState(false)
  const [showTrialEndingModal, setShowTrialEndingModal] = useState(false)
  const [showTrialGraceModal, setShowTrialGraceModal] = useState(false)

  const loadInitial = useCallback(async () => {
    if (!joinCode) return
    try {
      const res = await fetch(`/api/sessions/${joinCode}/live`, { cache: 'no-store' })
      if (!res.ok) {
        setError(res.status === 404 ? 'Session not found.' : 'Failed to load session.')
        setLoading(false)
        return
      }
      const data = (await res.json()) as LiveSessionLiveResponse
      setSessionTitle(data.title || 'Live Session')
      setSessionActive(Boolean(data.isActive))
      
      // Handle payment status from live API
      if (data.paymentStatus) {
        setPaymentStatus(data.paymentStatus)
        if (data.paymentStatus.isDueSoon && data.paymentStatus.nextInstallment) {
          setShowPaymentModal(true)
        }
        if (data.paymentStatus.isInGracePeriod && data.paymentStatus.nextInstallment) {
          setShowGracePeriodModal(true)
        }
        if (data.paymentStatus.isTrialEndingSoon && data.paymentStatus.trialEndDate) {
          setShowTrialEndingModal(true)
        }
        if (data.paymentStatus.isTrialInGracePeriod && data.paymentStatus.trialEndDate) {
          setShowTrialGraceModal(true)
        }
      }
      
      setLoading(false)
    } catch (e) {
      console.error(e)
      setError('Failed to load session.')
      setLoading(false)
    }
  }, [joinCode])

  useEffect(() => {
    loadInitial()
  }, [loadInitial])

  // Check payment status on mount (dedicated check)
  useEffect(() => {
    const checkPaymentStatus = async () => {
      try {
        const res = await fetch('/api/user/payment-status', {
          credentials: 'include',
        })
        if (res.ok) {
          const data = await res.json()
          if (data.paymentStatus) {
            setPaymentStatus(data.paymentStatus)
            // Show modal if payment is due soon
            if (data.paymentStatus.isDueSoon && data.paymentStatus.nextInstallment) {
              setShowPaymentModal(true)
            }
            // Show grace period modal if in grace period
            if (data.paymentStatus.isInGracePeriod && data.paymentStatus.nextInstallment) {
              setShowGracePeriodModal(true)
            }
            // Show trial ending soon modal
            if (data.paymentStatus.isTrialEndingSoon && data.paymentStatus.trialEndDate) {
              setShowTrialEndingModal(true)
            }
            // Show trial grace period modal
            if (data.paymentStatus.isTrialInGracePeriod && data.paymentStatus.trialEndDate) {
              setShowTrialGraceModal(true)
            }
          }
        }
      } catch (error) {
        console.error('Error checking payment status:', error)
      }
    }
    
    if (joinCode) {
      checkPaymentStatus()
    }
  }, [joinCode])

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading session...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-lg font-medium text-destructive">{error}</p>
          <p className="text-sm text-muted-foreground">
            The session may have ended or the join code is invalid.
          </p>
        </div>
      </div>
    )
  }

  if (!joinCode) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-lg font-medium">Invalid session code</p>
        </div>
      </div>
    )
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
    <>
      <StudentSessionWorkspace
        sessionCode={joinCode}
        sessionTitle={sessionTitle}
        sessionActive={sessionActive}
      />

      {/* Payment Due Modal */}
      {paymentStatus?.isDueSoon && paymentStatus.nextInstallment && (
        <PaymentDueModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false)
          }}
          nextInstallment={paymentStatus.nextInstallment}
          daysUntilDue={paymentStatus.daysUntilDue || 0}
        />
      )}

      {/* Grace Period Modal */}
      {paymentStatus?.isInGracePeriod && paymentStatus.nextInstallment && (
        <PaymentGracePeriodModal
          isOpen={showGracePeriodModal}
          onClose={() => {
            setShowGracePeriodModal(false)
          }}
          nextInstallment={paymentStatus.nextInstallment}
          daysRemaining={paymentStatus.daysRemainingInGracePeriod || 0}
        />
      )}

      {/* Trial Ending Soon Modal */}
      {paymentStatus?.isTrialEndingSoon && paymentStatus.trialEndDate && (
        <TrialEndingSoonModal
          isOpen={showTrialEndingModal}
          onClose={() => {
            setShowTrialEndingModal(false)
          }}
          trialEndDate={paymentStatus.trialEndDate}
          daysUntilEnd={paymentStatus.daysUntilTrialEnd || 0}
        />
      )}

      {/* Trial Grace Period Modal */}
      {paymentStatus?.isTrialInGracePeriod && paymentStatus.trialEndDate && (
        <TrialGracePeriodModal
          isOpen={showTrialGraceModal}
          onClose={() => {
            setShowTrialGraceModal(false)
          }}
          trialEndDate={paymentStatus.trialEndDate}
        />
      )}
    </>
  )
}

