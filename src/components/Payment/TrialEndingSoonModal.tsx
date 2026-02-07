'use client'

import React, { useState, useEffect } from 'react'
import { X, AlertTriangle, Calendar, Mail, Phone } from 'lucide-react'

interface TrialEndingSoonModalProps {
  isOpen: boolean
  onClose: () => void
  trialEndDate: string
  daysUntilEnd: number
}

export function TrialEndingSoonModal({ 
  isOpen, 
  onClose, 
  trialEndDate,
  daysUntilEnd 
}: TrialEndingSoonModalProps) {
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (isOpen) {
      // Check if user has dismissed this modal before
      const dismissedKey = `trial-ending-dismissed-${trialEndDate}`
      const wasDismissed = localStorage.getItem(dismissedKey)
      if (wasDismissed) {
        setDismissed(true)
      }
    }
  }, [isOpen, trialEndDate])

  const handleDismiss = () => {
    const dismissedKey = `trial-ending-dismissed-${trialEndDate}`
    localStorage.setItem(dismissedKey, 'true')
    setDismissed(true)
    onClose()
  }

  if (!isOpen || dismissed) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-md rounded-lg bg-card p-6 shadow-xl border border-border">
        <button
          onClick={handleDismiss}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-full bg-warning/20 p-2">
            <AlertTriangle className="h-6 w-6 text-warning" />
          </div>
          <h2 className="text-xl font-bold text-foreground">
            Trial Ending Soon
          </h2>
        </div>

        <p className="mb-4 text-foreground">
          Your trial period ends in{' '}
          <span className="font-semibold text-warning">
            {daysUntilEnd} day{daysUntilEnd > 1 ? 's' : ''}
          </span>
          . Please confirm your admission to continue using the platform.
        </p>

        <div className="mb-4 rounded-lg border border-border bg-muted/50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold text-foreground">Trial Details</h3>
          </div>
          <div className="space-y-1 text-sm text-foreground">
            <p>
              <span className="font-medium">Trial End Date:</span>{' '}
              {new Date(trialEndDate).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>

        <div className="mb-4 rounded-lg border border-border bg-muted/30 p-4">
          <p className="text-sm font-medium text-foreground mb-2">Need Help?</p>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-foreground">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <a href="mailto:info@codehubindia.in" className="hover:underline">
                info@codehubindia.in
              </a>
            </div>
            <div className="flex items-center gap-2 text-foreground">
              <Phone className="h-4 w-4 text-muted-foreground" />
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

        <div className="flex gap-3">
          <button
            onClick={handleDismiss}
            className="flex-1 rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            Remind Me Later
          </button>
          <button
            onClick={() => {
              window.open('https://wa.me/919689772825', '_blank')
            }}
            className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Contact Support
          </button>
        </div>
      </div>
    </div>
  )
}

