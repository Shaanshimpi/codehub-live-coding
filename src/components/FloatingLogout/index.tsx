'use client'

import React, { useState, useEffect } from 'react'
import { LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function FloatingLogout() {
  const [isVisible, setIsVisible] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  // Check if user is logged in using cookie (lightweight check)
  useEffect(() => {
    const checkAuth = () => {
      // Check cookie (no API call needed)
      const cookies = document.cookie.split('; ')
      const tokenCookie = cookies.find((row) => row.startsWith('payload-token='))
      const hasCookie = Boolean(tokenCookie && tokenCookie.split('=')[1]?.trim())
      setIsVisible(hasCookie)
    }

    // Initial check
    checkAuth()
    
    // Check periodically (less frequent, only cookie check)
    const interval = setInterval(checkAuth, 5000) // Reduced to 5 seconds
    return () => clearInterval(interval)
  }, [])

  const handleLogout = async () => {
    setIsLoading(true)
    try {
      // Call Payload logout endpoint
      await fetch('/api/users/logout', {
        method: 'POST',
        credentials: 'include',
      })

      // Clear any client-side state and redirect to home
      router.push('/')
      router.refresh()
    } catch (error) {
      console.error('Logout error:', error)
      // Even if API fails, try to clear cookie and redirect
      document.cookie = 'payload-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      router.push('/')
      router.refresh()
    } finally {
      setIsLoading(false)
    }
  }

  // Always show on mount, then hide if not authenticated (better UX)
  useEffect(() => {
    // Show immediately, then check auth
    setIsVisible(true)
  }, [])

  if (!isVisible) return null

  return (
    <button
      onClick={handleLogout}
      disabled={isLoading}
      className="fixed bottom-6 right-6 z-[9999] flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-primary-foreground shadow-2xl hover:bg-primary/90 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-primary-foreground/20"
      style={{ 
        position: 'fixed',
        bottom: '24px',
        right: '24px',
      }}
      title="Logout"
      aria-label="Logout"
    >
      <LogOut className="h-4 w-4" />
      <span className="text-sm font-medium">{isLoading ? 'Logging out...' : 'Logout'}</span>
    </button>
  )
}

