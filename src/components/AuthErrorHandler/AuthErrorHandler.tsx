'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'

interface AuthErrorResponse {
  error?: string
  authExpired?: boolean
  code?: 'AUTH_EXPIRED' | 'UNAUTHORIZED' | 'FORBIDDEN'
}

export function AuthErrorHandler() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Intercept fetch responses globally
    const originalFetch = window.fetch
    const publicPaths = ['/', '/signup', '/admin/login', '/admin']

    window.fetch = async (...args) => {
      const response = await originalFetch(...args)

      // Only handle API routes (not static assets, etc.)
      let url: string | undefined
      if (typeof args[0] === 'string') {
        url = args[0]
      } else if (args[0] instanceof Request) {
        url = args[0].url
      } else if (args[0] instanceof URL) {
        url = args[0].pathname
      }
      
      // Extract pathname if it's a full URL
      if (url && typeof url === 'string') {
        try {
          const urlObj = url.startsWith('http') ? new URL(url) : null
          const apiPathname = urlObj ? urlObj.pathname : url
          
          if (apiPathname.startsWith('/api/') && !response.ok) {
            // Check if it's an auth error
            if (response.status === 401 || response.status === 403) {
              try {
                const data = await response.clone().json() as AuthErrorResponse
                
                // Check if response indicates auth expired
                if (data.authExpired || data.code === 'AUTH_EXPIRED' || response.status === 401) {
                  // Don't redirect if already on home page or public pages
                  // Use the current page pathname from usePathname hook
                  if (!publicPaths.includes(pathname)) {
                    console.log('[AuthErrorHandler] Auth expired, redirecting to home')
                    // Clear any stale auth data
                    document.cookie = 'payload-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
                    router.push('/')
                    router.refresh()
                  }
                }
              } catch (e) {
                // If response is not JSON, still check status code
                // Use the current page pathname from usePathname hook
                if (response.status === 401 && !publicPaths.includes(pathname)) {
                  console.log('[AuthErrorHandler] 401 error detected, redirecting to home')
                  document.cookie = 'payload-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
                  router.push('/')
                  router.refresh()
                }
              }
            }
          }
        } catch (e) {
          // If URL parsing fails, skip handling
        }
      }

      return response
    }

    // Cleanup: restore original fetch on unmount
    return () => {
      window.fetch = originalFetch
    }
  }, [router, pathname])

  return null // This component doesn't render anything
}

