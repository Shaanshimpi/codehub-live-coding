'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'

interface UserFormProps {
  mode: 'create' | 'edit'
  userId?: string
}

interface FormData {
  name: string
  email: string
  password: string
  role: 'admin' | 'manager' | 'trainer' | 'student'
  phone: string
  altPhone: string
  dateOfBirth: string
  college: string
  educationalBackground: string
  address: string
  city: string
  state: string
  postalCode: string
  country: string
  trialStartDate: string
  trialEndDate: string
  isAdmissionConfirmed: boolean
}

export function UserForm({ mode, userId }: UserFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(mode === 'edit')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    password: '',
    role: 'student',
    phone: '',
    altPhone: '',
    dateOfBirth: '',
    college: '',
    educationalBackground: '',
    address: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    trialStartDate: '',
    trialEndDate: '',
    isAdmissionConfirmed: false,
  })

  // Load user data for edit mode
  useEffect(() => {
    if (mode === 'edit' && userId) {
      const fetchUser = async () => {
        try {
          const res = await fetch(`/api/dashboard/users/${userId}`, {
            credentials: 'include',
          })

          if (!res.ok) {
            throw new Error('Failed to fetch user')
          }

          const data = await res.json()
          const user = data.doc

          setFormData({
            name: user.name || '',
            email: user.email || '',
            password: '', // Don't pre-fill password
            role: user.role || 'student',
            phone: user.phone || '',
            altPhone: user.altPhone || '',
            dateOfBirth: user.dateOfBirth ? user.dateOfBirth.split('T')[0] : '',
            college: user.college || '',
            educationalBackground: user.educationalBackground || '',
            address: user.address || '',
            city: user.city || '',
            state: user.state || '',
            postalCode: user.postalCode || '',
            country: user.country || '',
            trialStartDate: user.trialStartDate ? user.trialStartDate.split('T')[0] : '',
            trialEndDate: user.trialEndDate ? user.trialEndDate.split('T')[0] : '',
            isAdmissionConfirmed: user.isAdmissionConfirmed || false,
          })
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to load user')
        } finally {
          setLoading(false)
        }
      }

      fetchUser()
    }
  }, [mode, userId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!formData.name.trim()) {
      setError('Name is required')
      return
    }

    if (!formData.email.trim()) {
      setError('Email is required')
      return
    }

    if (mode === 'create' && !formData.password) {
      setError('Password is required')
      return
    }

    if (formData.password && formData.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    try {
      setSaving(true)

      const url = mode === 'create' 
        ? '/api/dashboard/users'
        : `/api/dashboard/users/${userId}`

      const method = mode === 'create' ? 'POST' : 'PATCH'

      const body: any = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        role: formData.role,
        phone: formData.phone.trim() || undefined,
        altPhone: formData.altPhone.trim() || undefined,
        dateOfBirth: formData.dateOfBirth || undefined,
        college: formData.college.trim() || undefined,
        educationalBackground: formData.educationalBackground.trim() || undefined,
        address: formData.address.trim() || undefined,
        city: formData.city.trim() || undefined,
        state: formData.state.trim() || undefined,
        postalCode: formData.postalCode.trim() || undefined,
        country: formData.country.trim() || undefined,
        trialStartDate: formData.trialStartDate || undefined,
        trialEndDate: formData.trialEndDate || undefined,
        isAdmissionConfirmed: formData.isAdmissionConfirmed,
      }

      // Only include password if provided (for edit mode) or required (for create mode)
      if (mode === 'create' || formData.password) {
        body.password = formData.password
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
        throw new Error(data.error || `Failed to ${mode} user`)
      }

      const data = await res.json()
      router.push(`/dashboard/users/${data.doc.id}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${mode} user`)
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={mode === 'edit' ? `/dashboard/users/${userId}` : '/dashboard/users'}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h2 className="text-xl font-semibold">
          {mode === 'create' ? 'Create New User' : 'Edit User'}
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
              Name <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-3 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Email <span className="text-destructive">*</span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className="w-full px-3 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Password {mode === 'create' && <span className="text-destructive">*</span>}
              {mode === 'edit' && <span className="text-muted-foreground text-xs">(leave blank to keep current)</span>}
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required={mode === 'create'}
              minLength={8}
              className="w-full px-3 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Role <span className="text-destructive">*</span>
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as FormData['role'] })}
              required
              className="w-full px-3 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="student">Student</option>
              <option value="trainer">Trainer</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Alternate Phone</label>
            <input
              type="tel"
              value={formData.altPhone}
              onChange={(e) => setFormData({ ...formData, altPhone: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Date of Birth</label>
            <input
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Education */}
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <h3 className="text-lg font-semibold">Education</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">College</label>
            <input
              type="text"
              value={formData.college}
              onChange={(e) => setFormData({ ...formData, college: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Educational Background</label>
            <textarea
              value={formData.educationalBackground}
              onChange={(e) => setFormData({ ...formData, educationalBackground: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <h3 className="text-lg font-semibold">Address</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Street Address</label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">City</label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">State</label>
            <input
              type="text"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Postal Code</label>
            <input
              type="text"
              value={formData.postalCode}
              onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Country</label>
            <input
              type="text"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Trial & Admission (for students) */}
      {formData.role === 'student' && (
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h3 className="text-lg font-semibold">Trial & Admission</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Trial Start Date</label>
              <input
                type="date"
                value={formData.trialStartDate}
                onChange={(e) => setFormData({ ...formData, trialStartDate: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Trial End Date</label>
              <input
                type="date"
                value={formData.trialEndDate}
                onChange={(e) => setFormData({ ...formData, trialEndDate: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isAdmissionConfirmed"
                checked={formData.isAdmissionConfirmed}
                onChange={(e) => setFormData({ ...formData, isAdmissionConfirmed: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="isAdmissionConfirmed" className="text-sm font-medium">
                Admission Confirmed
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <Link
          href={mode === 'edit' ? `/dashboard/users/${userId}` : '/dashboard/users'}
          className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={saving}
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
              {mode === 'create' ? 'Create User' : 'Save Changes'}
            </>
          )}
        </button>
      </div>
    </form>
  )
}




