'use client'

import React, { useState, useEffect } from 'react'
import { LogOut, Sun, Moon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/providers/Theme'
import type { Theme } from '@/providers/Theme/types'

export function FloatingLogout() {
  const [isLoading, setIsLoading] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [currentTheme, setCurrentTheme] = useState<Theme>('light')

  // Check if user is logged in
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/users/me', {
          credentials: 'include',
          cache: 'no-store',
        })
        setIsLoggedIn(res.ok)
      } catch (error) {
        setIsLoggedIn(false)
      }
    }
    checkAuth()
  }, [])

  // Get current theme from DOM or localStorage
  useEffect(() => {
    const getCurrentTheme = (): Theme => {
      if (typeof window === 'undefined') return 'light'
      // Check localStorage for theme preference
      const stored = window.localStorage.getItem('payload-theme')
      if (stored === 'dark' || stored === 'light') {
        return stored
      }
      // Check DOM attribute
      const htmlTheme = document.documentElement.getAttribute('data-theme')
      if (htmlTheme === 'dark' || htmlTheme === 'light') {
        return htmlTheme
      }
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      return prefersDark ? 'dark' : 'light'
    }
    setCurrentTheme(getCurrentTheme())
  }, [theme])

  // Update current theme when theme changes
  useEffect(() => {
    if (theme) {
      setCurrentTheme(theme)
    } else {
      // If theme is null (auto), check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      setCurrentTheme(prefersDark ? 'dark' : 'light')
    }
  }, [theme])

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

  const toggleTheme = () => {
    const newTheme: Theme = currentTheme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    setCurrentTheme(newTheme)
  }

  return (
    <div className="fixed bottom-6 left-6 z-[9999] flex items-center gap-3">
      {/* Theme Switcher */}
      <button
        onClick={toggleTheme}
        className="flex items-center justify-center rounded-full bg-card border-2 border-border px-4 py-3 shadow-2xl hover:bg-accent transition-all hover:scale-105 text-foreground"
        title={currentTheme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
        aria-label="Toggle theme"
      >
        {currentTheme === 'light' ? (
          <Moon className="h-4 w-4" />
        ) : (
          <Sun className="h-4 w-4" />
        )}
      </button>

      {/* Logout Button - Only show when logged in */}
      {isLoggedIn && (
        <button
          onClick={handleLogout}
          disabled={isLoading}
          className="flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-primary-foreground shadow-2xl hover:bg-primary/90 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-primary-foreground/20"
          title="Logout"
          aria-label="Logout"
        >
          <LogOut className="h-4 w-4" />
          <span className="text-sm font-medium">{isLoading ? 'Logging out...' : 'Logout'}</span>
        </button>
      )}
    </div>
  )
}

