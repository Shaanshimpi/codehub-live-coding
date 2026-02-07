'use client'

import React, { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Code, Mail, Lock, User, Phone, Calendar, GraduationCap, MapPin, ChevronRight, ChevronLeft } from 'lucide-react'

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/'

  const [currentStep, setCurrentStep] = useState(1)
  const totalSteps = 3

  const [formData, setFormData] = useState({
    // Basic Info
    name: '',
    email: '',
    password: '',
    phone: '',
    altPhone: '',
    // Personal Details
    dateOfBirth: '',
    college: '',
    educationalBackground: '',
    // Address
    address: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stepErrors, setStepErrors] = useState<Record<number, string>>({})

  // Validation functions for each step
  const validateStep1 = (): boolean => {
    const errors: string[] = []
    if (!formData.name.trim()) errors.push('Full name is required')
    if (!formData.email.trim()) errors.push('Email is required')
    if (!formData.password || formData.password.length < 8) {
      errors.push('Password must be at least 8 characters')
    }
    
    if (errors.length > 0) {
      setStepErrors({ ...stepErrors, 1: errors.join(', ') })
      return false
    }
    return true
  }

  const validateStep2 = (): boolean => {
    // Step 2 has no required fields, so always valid
    return true
  }

  const validateStep3 = (): boolean => {
    // Step 3 has no required fields, so always valid
    return true
  }

  const handleNext = (e?: React.MouseEvent) => {
    if (e) e.preventDefault()
    
    if (currentStep === 1 && !validateStep1()) {
      return
    }
    if (currentStep === 2 && !validateStep2()) {
      return
    }
    
    // Clear step errors when moving forward
    setStepErrors({})
    setError(null)
    
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    setStepErrors({})
    setError(null)
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Final validation before submit
    if (!validateStep1()) {
      setCurrentStep(1)
      return
    }
    
    setLoading(true)
    setError(null)
    setStepErrors({})

    try {
      // Create user via Payload API
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password,
          role: 'student', // Always set to student for public signup
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
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.message || data.errors?.[0]?.message || 'Failed to create account')
      }

      // Auto-login after signup
      const loginResponse = await fetch('/api/users/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: formData.email.trim(),
          password: formData.password,
        }),
      })

      if (loginResponse.ok) {
        // Redirect to intended page or home
        router.push(redirect)
        router.refresh()
      } else {
        // Account created but login failed - redirect to login
        router.push(`/admin?redirect=${encodeURIComponent(redirect)}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-card border rounded-lg p-6 shadow-lg">
      {/* Progress Steps */}
      <div className="mb-6">
        <div className="flex items-center w-full mb-2">
          {[1, 2, 3].map((step) => (
            <React.Fragment key={step}>
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                    currentStep >= step
                      ? 'bg-primary border-primary text-primary-foreground'
                      : 'border-muted-foreground text-muted-foreground bg-background'
                  }`}
                >
                  {step}
                </div>
              </div>
              {step < totalSteps && (
                <div
                  className={`flex-1 h-0.5 mx-2 ${
                    currentStep > step ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
        <div className="flex justify-between text-xs text-muted-foreground px-1">
          <span className="flex-1 text-center">Basic Info</span>
          <span className="flex-1 text-center">Personal Details</span>
          <span className="flex-1 text-center">Address</span>
        </div>
      </div>

      <form 
        onSubmit={(e) => {
          e.preventDefault()
          if (currentStep === totalSteps) {
            handleSubmit(e)
          } else {
            // On steps 1-2, validate and move to next step
            handleNext()
          }
        }} 
        className="space-y-4"
      >
        {/* Step 1: Basic Info */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
            
            {stepErrors[1] && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
                {stepErrors[1]}
              </div>
            )}
            
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1">
                Full Name <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Doe"
                  className="w-full pl-10 pr-4 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">
                Email <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1">
                Password <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="At least 8 characters"
                  className="w-full pl-10 pr-4 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium mb-1">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 9876543210"
                  className="w-full pl-10 pr-4 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Alternate Phone */}
            <div>
              <label htmlFor="altPhone" className="block text-sm font-medium mb-1">
                Alternate Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="altPhone"
                  type="tel"
                  value={formData.altPhone}
                  onChange={(e) => setFormData({ ...formData, altPhone: e.target.value })}
                  placeholder="+91 9876543210"
                  className="w-full pl-10 pr-4 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Personal Details */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold mb-4">Personal Details</h2>
            
            {stepErrors[2] && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
                {stepErrors[2]}
              </div>
            )}
            
            {/* Date of Birth */}
            <div>
              <label htmlFor="dateOfBirth" className="block text-sm font-medium mb-1">
                Date of Birth
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* College */}
            <div>
              <label htmlFor="college" className="block text-sm font-medium mb-1">
                College/University
              </label>
              <div className="relative">
                <GraduationCap className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="college"
                  type="text"
                  value={formData.college}
                  onChange={(e) => setFormData({ ...formData, college: e.target.value })}
                  placeholder="Your College/University name"
                  className="w-full pl-10 pr-4 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Educational Background */}
            <div>
              <label htmlFor="educationalBackground" className="block text-sm font-medium mb-1">
                Educational Background
              </label>
              <textarea
                id="educationalBackground"
                value={formData.educationalBackground}
                onChange={(e) => setFormData({ ...formData, educationalBackground: e.target.value })}
                placeholder="e.g., B.Tech in Computer Science, MCA, etc."
                rows={4}
                className="w-full px-4 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>
          </div>
        )}

        {/* Step 3: Address */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold mb-4">Address Information</h2>
            
            {stepErrors[3] && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
                {stepErrors[3]}
              </div>
            )}
            
            {/* Address */}
            <div>
              <label htmlFor="address" className="block text-sm font-medium mb-1">
                Street Address
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Street address, apartment, suite, etc."
                  rows={3}
                  className="w-full pl-10 pr-4 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>
            </div>

            {/* City */}
            <div>
              <label htmlFor="city" className="block text-sm font-medium mb-1">
                City
              </label>
              <input
                id="city"
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="City"
                className="w-full px-4 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* State */}
            <div>
              <label htmlFor="state" className="block text-sm font-medium mb-1">
                State
              </label>
              <input
                id="state"
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="State/Province"
                className="w-full px-4 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Postal Code */}
            <div>
              <label htmlFor="postalCode" className="block text-sm font-medium mb-1">
                Postal Code
              </label>
              <input
                id="postalCode"
                type="text"
                value={formData.postalCode}
                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                placeholder="ZIP/Postal code"
                className="w-full px-4 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Country */}
            <div>
              <label htmlFor="country" className="block text-sm font-medium mb-1">
                Country
              </label>
              <input
                id="country"
                type="text"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                placeholder="Country"
                className="w-full px-4 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
            {error}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex gap-3 pt-4">
          {currentStep > 1 && (
            <button
              type="button"
              onClick={handlePrevious}
              className="flex items-center gap-2 px-6 py-2 border rounded-md bg-background hover:bg-muted transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
          )}
          
          {currentStep < totalSteps ? (
            <button
              type="button"
              onClick={handleNext}
              className={`flex items-center justify-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition-colors ${
                currentStep > 1 ? 'flex-1' : 'w-full'
              }`}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading}
              className={`flex items-center justify-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                currentStep > 1 ? 'flex-1' : 'w-full'
              }`}
            >
              {loading ? 'Creating account...' : 'Sign Up'}
            </button>
          )}
        </div>
      </form>

      {/* Login Link */}
      <div className="mt-4 text-center text-sm">
        <span className="text-muted-foreground">Already have an account? </span>
        <Link
          href={`/admin?redirect=${encodeURIComponent(redirect)}`}
          className="text-primary hover:underline"
        >
          Log in
        </Link>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16 bg-background">
      <div className="w-full max-w-2xl space-y-8">
        {/* Logo/Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3">
            <Code className="h-10 w-10 text-primary" />
            <h1 className="text-3xl font-bold">CodeHub</h1>
          </div>
          <p className="text-muted-foreground">Create your account</p>
        </div>

        {/* Signup Form */}
        <Suspense fallback={<div className="bg-card border rounded-lg p-6 shadow-lg animate-pulse h-64" />}>
          <SignupForm />
        </Suspense>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          By signing up, you agree to create a student account on CodeHub
        </p>
      </div>
    </div>
  )
}




