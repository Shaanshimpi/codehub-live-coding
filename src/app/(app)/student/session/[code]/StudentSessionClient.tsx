'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { StudentSessionWorkspace } from '@/components/SessionWorkspace/StudentSessionWorkspace'
import { PaymentDueModal } from '@/components/Payment/PaymentDueModal'
import { PaymentGracePeriodModal } from '@/components/Payment/PaymentGracePeriodModal'
import { TrialEndingSoonModal } from '@/components/Payment/TrialEndingSoonModal'
import { TrialGracePeriodModal } from '@/components/Payment/TrialGracePeriodModal'
import { PaymentBlocked } from '@/components/Payment/PaymentBlocked'
import { useSessionData } from '@/hooks/session/useSessionData'
import { usePaymentStatus } from '@/hooks/payment/usePaymentStatus'

function normalizeCodeParam(codeParam: string | string[] | undefined): string {
  const code = Array.isArray(codeParam) ? codeParam[0] : codeParam
  return (code || '').toUpperCase()
}

export function StudentSessionClient() {
  const params = useParams<{ code: string }>()
  const joinCode = useMemo(() => normalizeCodeParam(params?.code), [params])

  const { data: sessionData, isLoading: sessionLoading, error: sessionError } = useSessionData(joinCode, {
    refetchInterval: false,
    enabled: !!joinCode,
  })
  const { data: paymentStatus } = usePaymentStatus({ enabled: !!joinCode })

  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showGracePeriodModal, setShowGracePeriodModal] = useState(false)
  const [showTrialEndingModal, setShowTrialEndingModal] = useState(false)
  const [showTrialGraceModal, setShowTrialGraceModal] = useState(false)

  const sessionTitle = sessionData?.title ?? 'Live Session'
  const sessionActive = Boolean(sessionData?.isActive)
  const loading = sessionLoading
  const error = sessionError
    ? (sessionError as Error & { status?: number }).status === 404
      ? 'Session not found.'
      : 'Failed to load session.'
    : null

  useEffect(() => {
    if (!paymentStatus) return
    if (paymentStatus.isDueSoon && paymentStatus.nextInstallment) setShowPaymentModal(true)
    if (paymentStatus.isInGracePeriod && paymentStatus.nextInstallment) setShowGracePeriodModal(true)
    if (paymentStatus.isTrialEndingSoon && paymentStatus.trialEndDate) setShowTrialEndingModal(true)
    if (paymentStatus.isTrialInGracePeriod && paymentStatus.trialEndDate) setShowTrialGraceModal(true)
  }, [paymentStatus])

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

