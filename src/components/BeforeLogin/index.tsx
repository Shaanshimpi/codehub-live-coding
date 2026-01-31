 'use client'

import React, { useEffect } from 'react'

const BeforeLogin: React.FC = () => {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const redirect = params.get('redirect')
      // Store the intended redirect so we can navigate after a successful login
      if (redirect && redirect.startsWith('/') && !redirect.startsWith('/admin')) {
        sessionStorage.setItem('codehub:postLoginRedirect', redirect)
      } else if (redirect) {
        // clear any stale value if redirect is invalid
        sessionStorage.removeItem('codehub:postLoginRedirect')
      }
    } catch {
      // ignore
    }
  }, [])

  const redirect = typeof window !== 'undefined' 
    ? new URLSearchParams(window.location.search).get('redirect') || '/'
    : '/'

  return (
    <div style={{ textAlign: 'center', padding: '1rem' }}>
      <h2 style={{ 
        fontSize: '1.5rem', 
        fontWeight: 'bold', 
        marginBottom: '0.5rem',
        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }}>
        CodeHub Admin
      </h2>
      <p style={{ color: '#666', fontSize: '0.875rem', marginBottom: '1rem' }}>
        Manage your live coding platform, courses, and content.
      </p>
      <a
        href={`/signup?redirect=${encodeURIComponent(redirect)}`}
        style={{
          display: 'inline-block',
          padding: '0.5rem 1rem',
          backgroundColor: '#6366f1',
          color: 'white',
          borderRadius: '0.375rem',
          textDecoration: 'none',
          fontSize: '0.875rem',
          fontWeight: '500',
          transition: 'background-color 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#4f46e5'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#6366f1'
        }}
      >
        Create Account
      </a>
    </div>
  )
}

export default BeforeLogin
