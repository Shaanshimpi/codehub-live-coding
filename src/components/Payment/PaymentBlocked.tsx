'use client'

import React from 'react'
import { AlertCircle, CreditCard, Mail, Phone } from 'lucide-react'
import Link from 'next/link'

interface PaymentBlockedProps {
  reason?: string
  nextInstallment?: {
    dueDate: string
    amount: number
    paymentMethod?: string
  }
  daysOverdue?: number
}

export function PaymentBlocked({ reason, nextInstallment, daysOverdue }: PaymentBlockedProps) {
  const getReasonMessage = () => {
    switch (reason) {
      case 'PAYMENT_OVERDUE':
        return daysOverdue 
          ? `Your payment is ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue`
          : 'Your payment is overdue'
      case 'ADMISSION_NOT_CONFIRMED':
        return 'Please confirm your admission to continue'
      case 'MAINTENANCE_MODE':
        return 'Platform is currently under maintenance'
      default:
        return 'Access is currently restricted'
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-lg bg-card p-8 shadow-lg border border-border">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 rounded-full bg-destructive/10 p-3">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          
          <h1 className="mb-2 text-2xl font-bold text-foreground">
            Access Restricted
          </h1>
          
          <p className="mb-6 text-muted-foreground">
            {getReasonMessage()}
          </p>

          {nextInstallment && (
            <div className="mb-6 w-full rounded-lg border border-border bg-muted/50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-semibold text-foreground">Next Installment</h3>
              </div>
              <div className="space-y-1 text-sm text-foreground">
                <p>
                  <span className="font-medium">Amount:</span> ₹{nextInstallment.amount.toLocaleString()}
                </p>
                <p>
                  <span className="font-medium">Due Date:</span>{' '}
                  {new Date(nextInstallment.dueDate).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
                {nextInstallment.paymentMethod && (
                  <p>
                    <span className="font-medium">Payment Method:</span>{' '}
                    {nextInstallment.paymentMethod}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="w-full space-y-3">
            <p className="text-sm text-muted-foreground">
              Please contact us to resolve this issue:
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-center gap-2 text-foreground">
                <Mail className="h-4 w-4" />
                <a href="mailto:info@codehubindia.in" className="hover:underline">
                  info@codehubindia.in
                </a>
              </div>
              <div className="flex items-center justify-center gap-2 text-foreground">
                <Phone className="h-4 w-4" />
                <a href="tel:+919689772825" className="hover:underline">
                  +91 9689772825
                </a>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              You can also contact your mentor or WhatsApp us on{' '}
              <a href="https://wa.me/919689772825" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">
                +91 9689772825
              </a>
            </p>
          </div>

          <div className="mt-6 w-full">
            <Link
              href="/"
              className="block w-full rounded-lg bg-secondary px-4 py-2 text-center text-sm font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

