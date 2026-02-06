'use client'

import { Banner } from '@payloadcms/ui/elements/Banner'
import React, { useEffect } from 'react'

import './index.scss'

const baseClass = 'before-dashboard'

const BeforeDashboard: React.FC = () => {
  useEffect(() => {
    try {
      const redirect = sessionStorage.getItem('codehub:postLoginRedirect')
      if (redirect && redirect.startsWith('/') && !redirect.startsWith('/admin')) {
        sessionStorage.removeItem('codehub:postLoginRedirect')
        // Use full navigation to leave the admin app cleanly
        window.location.assign(redirect)
      } else {
        // Clear any stale redirect value but stay on admin dashboard
        sessionStorage.removeItem('codehub:postLoginRedirect')
      }
    } catch {
      // If sessionStorage fails, just clear it and stay on dashboard
      try {
        sessionStorage.removeItem('codehub:postLoginRedirect')
      } catch {
        // Ignore if sessionStorage is not available
      }
    }
  }, [])

  return (
    <div className={baseClass}>
      <Banner className={`${baseClass}__banner`} type="success">
        <h4>Welcome to CodeHub Admin! 🚀</h4>
      </Banner>
      
      <div style={{ marginTop: '1rem' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.75rem' }}>
          Quick Links
        </h3>
        <ul className={`${baseClass}__instructions`}>
          <li>
            <a href="/Live/demo-lecture?role=trainer" target="_blank" rel="noopener noreferrer">
              🎓 Open Live Coding (Trainer View)
            </a>
          </li>
          <li>
            <a href="/Live/demo-lecture?role=student" target="_blank" rel="noopener noreferrer">
              📚 Open Live Coding (Student View)
            </a>
          </li>
          <li>
            <a href="/" target="_blank" rel="noopener noreferrer">
              🌐 Visit Frontend
            </a>
          </li>
        </ul>
      </div>

      <div style={{ marginTop: '1.5rem' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.75rem' }}>
          Platform Features
        </h3>
        <ul className={`${baseClass}__instructions`}>
          <li>
            <strong>Live Coding Sessions</strong> – Broadcast code in real-time to students
          </li>
          <li>
            <strong>34 Languages</strong> – Support for JavaScript, Python, C, C++, Java, and more
          </li>
          <li>
            <strong>AI Teaching Assistant</strong> – Help students learn with guided hints
          </li>
          <li>
            <strong>Code Execution</strong> – Run and test code directly in the browser
          </li>
        </ul>
      </div>

      <p style={{ 
        marginTop: '1.5rem', 
        padding: '0.75rem', 
        background: 'rgba(99, 102, 241, 0.1)', 
        borderRadius: '0.5rem',
        fontSize: '0.875rem'
      }}>
        💡 <strong>Tip:</strong> Use the sidebar to manage Pages, Posts, Media, and Users.
      </p>
    </div>
  )
}

export default BeforeDashboard
