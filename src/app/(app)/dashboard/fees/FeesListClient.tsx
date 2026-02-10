'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, Plus, Eye, Edit, Trash2, ChevronLeft, ChevronRight, DollarSign } from 'lucide-react'
import type { User } from '@/payload-types'

interface FeeListItem {
  id: number
  student: number | User
  courseName: string | null
  totalFee: number
  currency: string
  installments: Array<{
    dueDate: string
    amount: number
    isPaid: boolean | null
    paymentMethod: string | null
    paidAt: string | null
    notes: string | null
  }>
  isActive: boolean | null
  createdAt: string
  updatedAt: string
  // Calculated fields
  status: 'paid' | 'pending' | 'overdue'
  paidAmount: number
  pendingAmount: number
  nextDueDate: string | null
  nextDueAmount: number
}

interface FeesResponse {
  docs: FeeListItem[]
  totalDocs: number
  limit: number
  page: number
  totalPages: number
}

export function FeesListClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const studentIdParam = searchParams.get('studentId')

  const [fees, setFees] = useState<FeeListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [currencyFilter, setCurrencyFilter] = useState('')
  const [studentIdFilter, setStudentIdFilter] = useState(studentIdParam || '')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalDocs, setTotalDocs] = useState(0)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const limit = 20

  // Fetch fees
  const fetchFees = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      })

      if (search) {
        params.append('search', search)
      }

      if (statusFilter) {
        params.append('status', statusFilter)
      }

      if (currencyFilter) {
        params.append('currency', currencyFilter)
      }

      if (studentIdFilter) {
        params.append('studentId', studentIdFilter)
      }

      const res = await fetch(`/api/dashboard/fees?${params.toString()}`, {
        credentials: 'include',
      })

      if (!res.ok) {
        throw new Error('Failed to fetch fees')
      }

      const data: FeesResponse = await res.json()
      setFees(data.docs)
      setTotalPages(data.totalPages)
      setTotalDocs(data.totalDocs)
    } catch (err) {
      console.error('Error fetching fees:', err)
      setError(err instanceof Error ? err.message : 'Failed to load fees')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFees()
  }, [page, statusFilter, currencyFilter, studentIdFilter])

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (page !== 1) {
        setPage(1)
      } else {
        fetchFees()
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [search])

  const handleDelete = async (feeId: number) => {
    if (!confirm('Are you sure you want to delete this fee record? This action cannot be undone.')) {
      return
    }

    try {
      setDeletingId(feeId)
      const res = await fetch(`/api/dashboard/fees/${feeId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete fee')
      }

      // Refresh list
      fetchFees()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete fee')
    } finally {
      setDeletingId(null)
    }
  }

  const statusColors = {
    paid: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    overdue: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const getStudentName = (student: number | User) => {
    if (typeof student === 'object') {
      return student.name || student.email || 'Unknown'
    }
    return 'Loading...'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Fees Management</h1>
          <p className="text-muted-foreground mt-1">Manage student fee records and payments</p>
        </div>
        <Link
          href="/dashboard/fees/new"
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create New Fee
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by student name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value)
            setPage(1)
          }}
          className="px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">All Status</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="overdue">Overdue</option>
        </select>
        <select
          value={currencyFilter}
          onChange={(e) => {
            setCurrencyFilter(e.target.value)
            setPage(1)
          }}
          className="px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">All Currencies</option>
          {/* Currency filter will show unique currencies from fetched fees */}
          {Array.from(new Set(fees.map(f => f.currency))).map((currency) => (
            <option key={currency} value={currency}>
              {currency}
            </option>
          ))}
        </select>
        {studentIdFilter && (
          <button
            onClick={() => {
              setStudentIdFilter('')
              router.push('/dashboard/fees')
            }}
            className="px-4 py-2 rounded-lg border bg-background hover:bg-accent transition-colors text-sm"
          >
            Clear Student Filter
          </button>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse h-20 bg-muted rounded-lg"></div>
          ))}
        </div>
      )}

      {/* Fees Table */}
      {!loading && !error && (
        <>
          {fees.length === 0 ? (
            <div className="rounded-lg border bg-card p-12 text-center">
              <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No fees found</p>
            </div>
          ) : (
            <>
              <div className="rounded-lg border bg-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium">Student</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Course</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Total Fee</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Paid</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Pending</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Next Due</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                        <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {fees.map((fee) => (
                        <tr key={fee.id} className="hover:bg-muted/50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-medium">
                              {getStudentName(fee.student)}
                            </div>
                            {typeof fee.student === 'object' && fee.student.email && (
                              <div className="text-xs text-muted-foreground">
                                {fee.student.email}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {fee.courseName || 'N/A'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium">
                              {formatCurrency(fee.totalFee, fee.currency)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {fee.installments.length} installment{fee.installments.length !== 1 ? 's' : ''}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-green-600 dark:text-green-400">
                            {formatCurrency(fee.paidAmount, fee.currency)}
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {formatCurrency(fee.pendingAmount, fee.currency)}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {fee.nextDueDate ? (
                              <div>
                                <div className="font-medium">
                                  {formatCurrency(fee.nextDueAmount, fee.currency)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {new Date(fee.nextDueDate).toLocaleDateString()}
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">N/A</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium capitalize ${statusColors[fee.status]}`}
                            >
                              {fee.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                href={`/dashboard/fees/${fee.id}`}
                                className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                                title="View"
                              >
                                <Eye className="h-4 w-4" />
                              </Link>
                              <Link
                                href={`/dashboard/fees/${fee.id}/edit`}
                                className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                                title="Edit"
                              >
                                <Edit className="h-4 w-4" />
                              </Link>
                              <button
                                onClick={() => handleDelete(fee.id)}
                                disabled={deletingId === fee.id}
                                className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, totalDocs)} of {totalDocs} fees
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </button>
                    <span className="text-sm text-muted-foreground">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

