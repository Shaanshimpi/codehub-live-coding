import clsx from 'clsx'
import React from 'react'

interface Props {
  className?: string
  loading?: 'lazy' | 'eager'
  priority?: 'auto' | 'high' | 'low'
}

export const Logo = (props: Props) => {
  const { className } = props

  return (
    <div
      className={clsx('flex items-center gap-2', className)}
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '0.5rem',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* CodeHub Icon */}
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        <rect width="32" height="32" rx="8" fill="url(#codehub-gradient)" />
        <path
          d="M10 12L14 16L10 20"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M16 20H22"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <defs>
          <linearGradient id="codehub-gradient" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop stopColor="#6366f1" />
            <stop offset="1" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
      </svg>
      
      {/* CodeHub Text */}
      <span
        style={{
          fontSize: '1.25rem',
          fontWeight: 700,
          color: '#6366f1',
          letterSpacing: '-0.02em',
        }}
      >
        CodeHub
      </span>
    </div>
  )
}
