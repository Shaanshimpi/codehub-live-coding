'use client'

import React, { useState } from 'react'
import { Plus, X } from 'lucide-react'

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

interface SettingsFormProps {
  settings: PlatformSettings
  activeTab: 'trial' | 'payment' | 'platform' | 'limits'
  onChange: (field: keyof PlatformSettings, value: any) => void
}

export function SettingsForm({ settings, activeTab, onChange }: SettingsFormProps) {
  // Trial & Enrollment Tab
  if (activeTab === 'trial') {
    return (
      <div className="space-y-6 rounded-lg border bg-card p-6">
        <div>
          <h2 className="text-lg font-semibold mb-4">Trial & Enrollment Settings</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Trial Days
              </label>
              <input
                type="number"
                min="0"
                value={settings.trialDays || 7}
                onChange={(e) => onChange('trialDays', parseInt(e.target.value, 10) || 0)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Number of days for student trial period
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="autoExtendTrial"
                checked={settings.autoExtendTrial || false}
                onChange={(e) => onChange('autoExtendTrial', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="autoExtendTrial" className="text-sm font-medium">
                Allow Automatic Trial Extension
              </label>
            </div>
            <p className="text-xs text-muted-foreground ml-6">
              Automatically extend trial period if enabled
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Payment & Fees Tab
  if (activeTab === 'payment') {
    return (
      <div className="space-y-6 rounded-lg border bg-card p-6">
        <div>
          <h2 className="text-lg font-semibold mb-4">Payment & Fees Settings</h2>
          
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="blockUnpaidStudents"
                checked={settings.blockUnpaidStudents !== false}
                onChange={(e) => onChange('blockUnpaidStudents', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="blockUnpaidStudents" className="text-sm font-medium">
                Block Unpaid Students
              </label>
            </div>
            <p className="text-xs text-muted-foreground ml-6">
              Toggle to block students with overdue installments
            </p>

            <div>
              <label className="block text-sm font-medium mb-2">
                Warning Days Before Due
              </label>
              <input
                type="number"
                min="0"
                value={settings.warningDaysBeforeDue || 7}
                onChange={(e) => onChange('warningDaysBeforeDue', parseInt(e.target.value, 10) || 0)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Days before due date to show warning modal
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Grace Period Days
              </label>
              <input
                type="number"
                min="0"
                value={settings.gracePeriodDays || 0}
                onChange={(e) => onChange('gracePeriodDays', parseInt(e.target.value, 10) || 0)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Days after due date before blocking (0 = block immediately)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Default Currency
              </label>
              <input
                type="text"
                value={settings.defaultCurrency || 'INR'}
                onChange={(e) => onChange('defaultCurrency', e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="INR"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Default currency for fees
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Available Currencies
              </label>
              <div className="space-y-2">
                {(settings.availableCurrencies || []).map((currency, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Code (e.g., INR)"
                      value={currency.code}
                      onChange={(e) => {
                        const newCurrencies = [...(settings.availableCurrencies || [])]
                        newCurrencies[index] = { ...currency, code: e.target.value }
                        onChange('availableCurrencies', newCurrencies)
                      }}
                      className="flex-1 rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <input
                      type="text"
                      placeholder="Label (e.g., INR - Indian Rupee)"
                      value={currency.label}
                      onChange={(e) => {
                        const newCurrencies = [...(settings.availableCurrencies || [])]
                        newCurrencies[index] = { ...currency, label: e.target.value }
                        onChange('availableCurrencies', newCurrencies)
                      }}
                      className="flex-1 rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button
                      onClick={() => {
                        const newCurrencies = [...(settings.availableCurrencies || [])]
                        newCurrencies.splice(index, 1)
                        onChange('availableCurrencies', newCurrencies)
                      }}
                      className="rounded-md border p-2 text-destructive hover:bg-destructive/10"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    const newCurrencies = [...(settings.availableCurrencies || []), { code: '', label: '' }]
                    onChange('availableCurrencies', newCurrencies)
                  }}
                  className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent"
                >
                  <Plus className="h-4 w-4" />
                  Add Currency
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Available Payment Methods
              </label>
              <div className="space-y-2">
                {(settings.availablePaymentMethods || []).map((method, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Method (e.g., cash, upi, card)"
                      value={method.method}
                      onChange={(e) => {
                        const newMethods = [...(settings.availablePaymentMethods || [])]
                        newMethods[index] = { method: e.target.value }
                        onChange('availablePaymentMethods', newMethods)
                      }}
                      className="flex-1 rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button
                      onClick={() => {
                        const newMethods = [...(settings.availablePaymentMethods || [])]
                        newMethods.splice(index, 1)
                        onChange('availablePaymentMethods', newMethods)
                      }}
                      className="rounded-md border p-2 text-destructive hover:bg-destructive/10"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    const newMethods = [...(settings.availablePaymentMethods || []), { method: '' }]
                    onChange('availablePaymentMethods', newMethods)
                  }}
                  className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent"
                >
                  <Plus className="h-4 w-4" />
                  Add Payment Method
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Platform Control Tab
  if (activeTab === 'platform') {
    return (
      <div className="space-y-6 rounded-lg border bg-card p-6">
        <div>
          <h2 className="text-lg font-semibold mb-4">Platform Control Settings</h2>
          
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="maintenanceMode"
                checked={settings.maintenanceMode || false}
                onChange={(e) => onChange('maintenanceMode', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="maintenanceMode" className="text-sm font-medium">
                Maintenance Mode
              </label>
            </div>
            <p className="text-xs text-muted-foreground ml-6">
              Temporarily block all students (except admins/trainers)
            </p>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="allowAllStudentsDuringMaintenance"
                checked={settings.allowAllStudentsDuringMaintenance || false}
                onChange={(e) => onChange('allowAllStudentsDuringMaintenance', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="allowAllStudentsDuringMaintenance" className="text-sm font-medium">
                Allow All Students During Maintenance
              </label>
            </div>
            <p className="text-xs text-muted-foreground ml-6">
              If maintenance mode is on, allow all students regardless of fees
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Limits Tab
  if (activeTab === 'limits') {
    return (
      <div className="space-y-6 rounded-lg border bg-card p-6">
        <div>
          <h2 className="text-lg font-semibold mb-4">Limits Settings</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Max Installments Per Fee (Optional)
              </label>
              <input
                type="number"
                min="1"
                value={settings.maxInstallmentsPerFee || ''}
                onChange={(e) => {
                  const value = e.target.value === '' ? null : parseInt(e.target.value, 10)
                  onChange('maxInstallmentsPerFee', value)
                }}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Leave empty for no limit"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Maximum installments allowed per fee record (optional, leave empty for no limit)
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}


