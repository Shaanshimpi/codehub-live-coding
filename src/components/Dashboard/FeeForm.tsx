'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Loader2, Plus, Trash2 } from 'lucide-react'
import type { User, Fee } from '@/payload-types'

interface FeeFormProps {
  mode: 'create' | 'edit'
  feeId?: string
}

interface Installment {
  dueDate: string
  amount: string
  isPaid: boolean
  paymentMethod: string
  notes: string
}

interface FormData {
  student: string
  courseName: string
  totalFee: string
  currency: string
  installments: Installment[]
  isActive: boolean
}

export function FeeForm({ mode, feeId }: FeeFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(mode === 'edit')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [students, setStudents] = useState<User[]>([])
  const [availableCurrencies, setAvailableCurrencies] = useState<Array<{ code: string; label: string }>>([
    { code: 'INR', label: 'INR - Indian Rupee' },
    { code: 'USD', label: 'USD - US Dollar' },
    { code: 'EUR', label: 'EUR - Euro' },
  ])
  const [defaultCurrency, setDefaultCurrency] = useState<string>('INR')
  const [formData, setFormData] = useState<FormData>({
    student: '',
    courseName: '',
    totalFee: '',
    currency: 'INR',
    installments: [
      {
        dueDate: '',
        amount: '',
        isPaid: false,
        paymentMethod: '',
        notes: '',
      },
    ],
    isActive: true,
  })

  // Fetch platform settings for currencies
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/dashboard/settings', {
          credentials: 'include',
        })
        if (res.ok) {
          const data = await res.json()
          const settings = data.settings
          
          if (settings.defaultCurrency) {
            setDefaultCurrency(settings.defaultCurrency)
            // Update form currency if in create mode
            if (mode === 'create') {
              setFormData(prev => ({ ...prev, currency: settings.defaultCurrency }))
            }
          }
          
          if (settings.availableCurrencies && Array.isArray(settings.availableCurrencies) && settings.availableCurrencies.length > 0) {
            setAvailableCurrencies(settings.availableCurrencies.map((c: any) => ({
              code: c.code || c,
              label: c.label || c.code || c,
            })))
          }
        }
      } catch (err) {
        console.error('Error fetching platform settings:', err)
        // Use defaults if fetch fails
      }
    }
    fetchSettings()
  }, [mode])

  // Fetch students for dropdown
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const res = await fetch('/api/dashboard/users?limit=1000&role=student', {
          credentials: 'include',
        })
        if (res.ok) {
          const data = await res.json()
          setStudents(data.docs)
        }
      } catch (err) {
        console.error('Error fetching students:', err)
      }
    }
    fetchStudents()
  }, [])

  // Load fee data for edit mode
  useEffect(() => {
    if (mode === 'edit' && feeId) {
      const fetchFee = async () => {
        try {
          setLoading(true)
          const res = await fetch(`/api/dashboard/fees/${feeId}`, {
            credentials: 'include',
          })

          if (!res.ok) {
            throw new Error('Failed to fetch fee')
          }

          const data = await res.json()
          const fee: Fee = data.doc

          setFormData({
            student: typeof fee.student === 'object' ? fee.student.id.toString() : fee.student.toString(),
            courseName: fee.courseName || '',
            totalFee: fee.totalFee.toString(),
            currency: fee.currency,
            installments: fee.installments.map((inst) => ({
              dueDate: inst.dueDate ? inst.dueDate.split('T')[0] : '',
              amount: inst.amount.toString(),
              isPaid: inst.isPaid || false,
              paymentMethod: inst.paymentMethod || '',
              notes: inst.notes || '',
            })),
            isActive: fee.isActive !== undefined && fee.isActive !== null ? fee.isActive : true,
          })
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to load fee')
        } finally {
          setLoading(false)
        }
      }

      fetchFee()
    }
  }, [mode, feeId])

  const addInstallment = () => {
    setFormData({
      ...formData,
      installments: [
        ...formData.installments,
        {
          dueDate: '',
          amount: '',
          isPaid: false,
          paymentMethod: '',
          notes: '',
        },
      ],
    })
  }

  const removeInstallment = (index: number) => {
    if (formData.installments.length <= 1) {
      alert('At least one installment is required')
      return
    }
    setFormData({
      ...formData,
      installments: formData.installments.filter((_, i) => i !== index),
    })
  }

  const updateInstallment = (index: number, field: keyof Installment, value: string | boolean) => {
    const updated = [...formData.installments]
    updated[index] = { ...updated[index], [field]: value }
    setFormData({ ...formData, installments: updated })
  }

  const calculateTotal = () => {
    return formData.installments.reduce((sum, inst) => {
      const amount = parseFloat(inst.amount) || 0
      return sum + amount
    }, 0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!formData.student) {
      setError('Student is required')
      return
    }

    if (!formData.totalFee || parseFloat(formData.totalFee) <= 0) {
      setError('Total fee must be greater than 0')
      return
    }

    if (formData.installments.length === 0) {
      setError('At least one installment is required')
      return
    }

    // Validate installments
    for (let i = 0; i < formData.installments.length; i++) {
      const inst = formData.installments[i]
      if (!inst.dueDate) {
        setError(`Installment ${i + 1}: Due date is required`)
        return
      }
      if (!inst.amount || parseFloat(inst.amount) <= 0) {
        setError(`Installment ${i + 1}: Amount must be greater than 0`)
        return
      }
    }

    // Validate total
    const totalInstallments = calculateTotal()
    const totalFee = parseFloat(formData.totalFee)

    if (Math.abs(totalInstallments - totalFee) > 0.01) {
      setError(`Total installments (${totalInstallments}) must equal total fee (${totalFee})`)
      return
    }

    try {
      setSaving(true)

      const url = mode === 'create' 
        ? '/api/dashboard/fees'
        : `/api/dashboard/fees/${feeId}`

      const method = mode === 'create' ? 'POST' : 'PATCH'

      const body: any = {
        student: parseInt(formData.student, 10),
        courseName: formData.courseName.trim() || undefined,
        totalFee: parseFloat(formData.totalFee),
        currency: formData.currency,
        installments: formData.installments.map((inst) => ({
          dueDate: inst.dueDate,
          amount: parseFloat(inst.amount),
          isPaid: inst.isPaid,
          paymentMethod: inst.paymentMethod.trim() || undefined,
          notes: inst.notes.trim() || undefined,
        })),
        isActive: formData.isActive,
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || `Failed to ${mode} fee`)
      }

      const data = await res.json()
      router.push(`/dashboard/fees/${data.doc.id}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${mode} fee`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const totalInstallments = calculateTotal()
  const totalFee = parseFloat(formData.totalFee) || 0
  const difference = Math.abs(totalInstallments - totalFee)

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={mode === 'edit' ? `/dashboard/fees/${feeId}` : '/dashboard/fees'}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h2 className="text-xl font-semibold">
          {mode === 'create' ? 'Create New Fee Record' : 'Edit Fee Record'}
        </h2>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Basic Information */}
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <h3 className="text-lg font-semibold">Basic Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Student <span className="text-destructive">*</span>
            </label>
            <select
              value={formData.student}
              onChange={(e) => setFormData({ ...formData, student: e.target.value })}
              required
              className="w-full px-3 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select a student</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name || student.email} {student.name && `(${student.email})`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Course Name</label>
            <input
              type="text"
              value={formData.courseName}
              onChange={(e) => setFormData({ ...formData, courseName: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Total Fee <span className="text-destructive">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.totalFee}
              onChange={(e) => setFormData({ ...formData, totalFee: e.target.value })}
              required
              className="w-full px-3 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Currency <span className="text-destructive">*</span>
            </label>
            <select
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              required
              className="w-full px-3 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {availableCurrencies.map((currency) => (
                <option key={currency.code} value={currency.code}>
                  {currency.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300"
            />
            <label htmlFor="isActive" className="text-sm font-medium">
              Active (Current fee record for student)
            </label>
          </div>
        </div>
      </div>

      {/* Installments */}
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Installments</h3>
          <button
            type="button"
            onClick={addInstallment}
            className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent"
          >
            <Plus className="h-4 w-4" />
            Add Installment
          </button>
        </div>

        {/* Total Validation */}
        {totalFee > 0 && (
          <div className={`rounded-lg p-3 ${difference > 0.01 ? 'bg-yellow-100 dark:bg-yellow-900' : 'bg-green-100 dark:bg-green-900'}`}>
            <div className="flex items-center justify-between text-sm">
              <span>Total Fee:</span>
              <span className="font-medium">{totalFee.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Total Installments:</span>
              <span className="font-medium">{totalInstallments.toFixed(2)}</span>
            </div>
            {difference > 0.01 && (
              <div className="flex items-center justify-between text-sm text-destructive mt-1">
                <span>Difference:</span>
                <span className="font-medium">{difference.toFixed(2)}</span>
              </div>
            )}
          </div>
        )}

        <div className="space-y-4">
          {formData.installments.map((installment, index) => (
            <div key={index} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">Installment {index + 1}</h4>
                {formData.installments.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeInstallment(index)}
                    className="rounded-md p-1 text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Due Date <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="date"
                    value={installment.dueDate}
                    onChange={(e) => updateInstallment(index, 'dueDate', e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Amount <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={installment.amount}
                    onChange={(e) => updateInstallment(index, 'amount', e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Payment Method</label>
                  <input
                    type="text"
                    value={installment.paymentMethod}
                    onChange={(e) => updateInstallment(index, 'paymentMethod', e.target.value)}
                    placeholder="e.g., cash, upi, card"
                    className="w-full px-3 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`isPaid-${index}`}
                    checked={installment.isPaid}
                    onChange={(e) => updateInstallment(index, 'isPaid', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <label htmlFor={`isPaid-${index}`} className="text-sm font-medium">
                    Mark as Paid
                  </label>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <textarea
                    value={installment.notes}
                    onChange={(e) => updateInstallment(index, 'notes', e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <Link
          href={mode === 'edit' ? `/dashboard/fees/${feeId}` : '/dashboard/fees'}
          className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={saving || difference > 0.01}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              {mode === 'create' ? 'Create Fee' : 'Save Changes'}
            </>
          )}
        </button>
      </div>
    </form>
  )
}

