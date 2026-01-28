import React from 'react'

const BeforeLogin: React.FC = () => {
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
      <p style={{ color: '#666', fontSize: '0.875rem' }}>
        Manage your live coding platform, courses, and content.
      </p>
    </div>
  )
}

export default BeforeLogin
