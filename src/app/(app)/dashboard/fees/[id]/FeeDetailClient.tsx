'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  DollarSign,
  Calendar,
  CheckCircle2,
  XCircle,
  Loader2
} from 'lucide-react'
import type { Fee, User } from '@/payload-types'

interface FeeDetailClientProps {
  feeId: string
}

interface FeeDetail extends Fee {
  student: User
}

export function FeeDetailClient({ feeId }: FeeDetailClientProps) {
  const router = useRouter()
  const [fee, setFee] = useState<FeeDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [markingPayment, setMarkingPayment] = useState<number | null>(null)

  useEffect(() => {
    const fetchFee = async () => {
      try {
        setLoading(true)
        setError(null)

        const res = await fetch(`/api/dashboard/fees/${feeId}`, {
          credentials: 'include',
        })

        if (!res.ok) {
          if (res.status === 404) {
            throw new Error('Fee not found')
          }
          throw new Error('Failed to fetch fee')
        }

        const data = await res.json()
        setFee(data.doc)
      } catch (err) {
        console.error('Error fetching fee:', err)
        setError(err instanceof Error ? err.message : 'Failed to load fee')
      } finally {
        setLoading(false)
      }
    }

    fetchFee()
  }, [feeId])

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this fee record? This action cannot be undone.')) {
      return
    }

    try {
      setDeleting(true)
      const res = await fetch(`/api/dashboard/fees/${feeId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete fee')
      }

      router.push('/dashboard/fees')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete fee')
      setDeleting(false)
    }
  }

  const handleMarkPayment = async (index: number, isPaid: boolean, paymentMethod?: string) => {
    try {
      setMarkingPayment(index)
      const res = await fetch(`/api/dashboard/fees/${feeId}/installments/${index}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          isPaid,
          paymentMethod: paymentMethod || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update payment')
      }

      const data = await res.json()
      setFee(data.doc)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update payment')
    } finally {
      setMarkingPayment(null)
    }
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const calculateTotals = () => {
    if (!fee || !fee.installments) return { paid: 0, pending: 0 }
    
    const paid = fee.installments.reduce(
      (sum, inst) => sum + (inst.isPaid ? inst.amount : 0),
      0
    )
    const pending = fee.totalFee - paid
    return { paid, pending }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-64 mb-6"></div>
          <div className="h-64 bg-muted rounded-lg"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Link
          href="/dashboard/fees"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Fees
        </Link>
        <div className="rounded-lg border border-destructive bg-destructive/10 p-6">
          <p className="text-destructive">{error}</p>
        </div>
      </div>
    )
  }

  if (!fee) {
    return null
  }

  const totals = calculateTotals()
  const student = typeof fee.student === 'object' ? fee.student : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/fees"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Fee Record</h1>
            <p className="text-muted-foreground mt-1">
              {student?.name || student?.email || 'Student'} - {fee.courseName || 'No Course'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/fees/${feeId}/edit`}
            className="flex items-center gap-2 rounded-lg border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
          >
            <Edit className="h-4 w-4" />
            Edit
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-2 rounded-lg border border-destructive bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm text-muted-foreground">Total Fee</div>
          <div className="text-2xl font-bold mt-1">
            {formatCurrency(fee.totalFee, fee.currency)}
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm text-muted-foreground">Paid</div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
            {formatCurrency(totals.paid, fee.currency)}
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm text-muted-foreground">Pending</div>
          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">
            {formatCurrency(totals.pending, fee.currency)}
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm text-muted-foreground">Installments</div>
          <div className="text-2xl font-bold mt-1">
            {fee.installments.length}
          </div>
        </div>
      </div>

      {/* Basic Info */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium">Student</p>
            <p className="text-sm text-muted-foreground">
              {student?.name || student?.email || 'Unknown'}
            </p>
            {student && (
              <Link
                href={`/dashboard/users/${student.id}`}
                className="text-xs text-primary hover:underline mt-1 inline-block"
              >
                View Student Profile →
              </Link>
            )}
          </div>
          <div>
            <p className="text-sm font-medium">Course Name</p>
            <p className="text-sm text-muted-foreground">
              {fee.courseName || 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium">Currency</p>
            <p className="text-sm text-muted-foreground">{fee.currency}</p>
          </div>
          <div>
            <p className="text-sm font-medium">Status</p>
            <p className="text-sm text-muted-foreground">
              {fee.isActive ? 'Active' : 'Inactive'}
            </p>
          </div>
        </div>
      </div>

      {/* Installments Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Installments</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">#</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Due Date</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Amount</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Payment Method</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Paid At</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Notes</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {fee.installments.map((installment, index) => {
                const isOverdue = !installment.isPaid && new Date(installment.dueDate) < new Date()
                return (
                  <tr
                    key={index}
                    className={`hover:bg-muted/50 transition-colors ${
                      isOverdue ? 'bg-red-50 dark:bg-red-900/10' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium">{index + 1}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {new Date(installment.dueDate).toLocaleDateString()}
                        </span>
                        {isOverdue && (
                          <span className="text-xs text-red-600 dark:text-red-400">
                            (Overdue)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">
                        {formatCurrency(installment.amount, fee.currency)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {installment.isPaid ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-2 py-1 text-xs font-medium">
                          <CheckCircle2 className="h-3 w-3" />
                          Paid
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 px-2 py-1 text-xs font-medium">
                          <XCircle className="h-3 w-3" />
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {installment.paymentMethod || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {installment.paidAt
                        ? new Date(installment.paidAt).toLocaleString()
                        : 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {installment.notes || 'N/A'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {!installment.isPaid ? (
                          <button
                            onClick={() => {
                              const method = prompt('Enter payment method (optional):')
                              handleMarkPayment(index, true, method || undefined)
                            }}
                            disabled={markingPayment === index}
                            className="flex items-center gap-1 rounded-md border bg-green-50 dark:bg-green-900/20 px-2 py-1 text-xs font-medium text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors disabled:opacity-50"
                          >
                            {markingPayment === index ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-3 w-3" />
                            )}
                            Mark Paid
                          </button>
                        ) : (
                          <button
                            onClick={() => handleMarkPayment(index, false)}
                            disabled={markingPayment === index}
                            className="flex items-center gap-1 rounded-md border bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 text-xs font-medium text-yellow-700 dark:text-yellow-300 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors disabled:opacity-50"
                          >
                            {markingPayment === index ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <XCircle className="h-3 w-3" />
                            )}
                            Mark Unpaid
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Metadata */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">Metadata</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-medium">Created At</p>
            <p className="text-muted-foreground">
              {new Date(fee.createdAt).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="font-medium">Last Updated</p>
            <p className="text-muted-foreground">
              {new Date(fee.updatedAt).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}



