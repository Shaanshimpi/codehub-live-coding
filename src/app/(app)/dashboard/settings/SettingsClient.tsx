'use client'

import React, { useState, useEffect } from 'react'
import { Settings, Save, RotateCcw, Loader2 } from 'lucide-react'
import { SettingsForm } from '@/components/Dashboard/SettingsForm'

interface PlatformSettings {
  trialDays?: number
  autoExtendTrial?: boolean
  blockUnpaidStudents?: boolean
  warningDaysBeforeDue?: number
  gracePeriodDays?: number
  defaultCurrency?: string
  availableCurrencies?: Array<{ code: string; label: string }>
  availablePaymentMethods?: Array<{ method: string }>
  maintenanceMode?: boolean
  allowAllStudentsDuringMaintenance?: boolean
  maxInstallmentsPerFee?: number | null
}

const DEFAULT_SETTINGS: PlatformSettings = {
  trialDays: 7,
  autoExtendTrial: false,
  blockUnpaidStudents: true,
  warningDaysBeforeDue: 7,
  gracePeriodDays: 0,
  defaultCurrency: 'INR',
  availableCurrencies: [
    { code: 'INR', label: 'INR - Indian Rupee' },
    { code: 'USD', label: 'USD - US Dollar' },
    { code: 'EUR', label: 'EUR - Euro' },
  ],
  availablePaymentMethods: [
    { method: 'cash' },
    { method: 'upi' },
    { method: 'card' },
    { method: 'bank_transfer' },
  ],
  maintenanceMode: false,
  allowAllStudentsDuringMaintenance: false,
  maxInstallmentsPerFee: null,
}

export function SettingsClient() {
  const [settings, setSettings] = useState<PlatformSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [activeTab, setActiveTab] = useState<'trial' | 'payment' | 'platform' | 'limits'>('trial')

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/dashboard/settings', {
        credentials: 'include',
      })

      if (!res.ok) {
        throw new Error('Failed to fetch settings')
      }

      const data = await res.json()
      setSettings(data || DEFAULT_SETTINGS)
    } catch (err) {
      console.error('Error fetching settings:', err)
      setError(err instanceof Error ? err.message : 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!window.confirm('Are you sure you want to save these settings? This will affect all users.')) {
      return
    }

    try {
      setSaving(true)
      setError(null)
      setSuccess(false)

      const res = await fetch('/api/dashboard/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(settings),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to save settings')
      }

      const updatedSettings = await res.json()
      setSettings(updatedSettings)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error('Error saving settings:', err)
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    if (!window.confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
      return
    }

    setSettings(DEFAULT_SETTINGS)
  }

  const handleChange = (field: keyof PlatformSettings, value: any) => {
    setSettings((prev) => ({ ...prev, [field]: value }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Global Settings</h1>
          <p className="text-muted-foreground mt-1">
            Configure platform-wide settings for trials, payments, and system control
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
          >
            <RotateCcw className="h-4 w-4" />
            Reset to Defaults
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Settings
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-green-500 bg-green-500/10 p-4 text-green-600 dark:text-green-400">
          Settings saved successfully!
        </div>
      )}

      {/* Tabs */}
      <div className="border-b">
        <nav className="flex gap-4">
          {[
            { id: 'trial' as const, label: 'Trial & Enrollment', icon: Settings },
            { id: 'payment' as const, label: 'Payment & Fees', icon: Settings },
            { id: 'platform' as const, label: 'Platform Control', icon: Settings },
            { id: 'limits' as const, label: 'Limits', icon: Settings },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Form */}
      <SettingsForm
        settings={settings}
        activeTab={activeTab}
        onChange={handleChange}
      />
    </div>
  )
}




