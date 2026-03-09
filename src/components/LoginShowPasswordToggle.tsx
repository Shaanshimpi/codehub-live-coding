'use client'

import { useEffect } from 'react'

const eyeSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
  <path
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    d="M2.25 12s2.25-6.75 9.75-6.75S21.75 12 21.75 12 19.5 18.75 12 18.75 2.25 12 2.25 12Z"
  />
  <circle
    cx="12"
    cy="12"
    r="3"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
  />
</svg>
`

const eyeOffSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
  <path
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    d="M3 3l18 18M10.584 10.587A3 3 0 0 0 13.41 13.41M9.88 4.36A8.218 8.218 0 0 1 12 4.25C19.5 4.25 21.75 11 21.75 11S20.91 13.58 18.75 15.75M6.51 6.51C3.96 8.02 2.25 11 2.25 11S4.5 17.75 12 17.75c1.33 0 2.51-.23 3.54-.64"
  />
</svg>
`

const LoginShowPasswordToggle: React.FC = () => {
  useEffect(() => {
    if (typeof document === 'undefined') return

    const input =
      document.querySelector<HTMLInputElement>('form input[type="password"][name="password"]') ||
      document.querySelector<HTMLInputElement>('form input[type="password"]')

    if (!input) return

    // Prefer the immediate input wrapper to get proper vertical centering
    const wrapper =
      (input.parentElement as HTMLElement | null) ||
      (input.closest('.field-type') as HTMLElement | null)

    if (!wrapper) return

    const computedPosition = window.getComputedStyle(wrapper).position
    if (computedPosition === 'static') {
      wrapper.style.position = 'relative'
    }

    const button = document.createElement('button')
    button.type = 'button'
    button.setAttribute('aria-label', 'Show password')
    button.style.position = 'absolute'
    button.style.top = '50%'
    button.style.right = '0.75rem'
    button.style.transform = 'translateY(-50%)'
    button.style.border = 'none'
    button.style.background = 'transparent'
    button.style.cursor = 'pointer'
    button.style.display = 'flex'
    button.style.alignItems = 'center'
    button.style.justifyContent = 'center'
    button.style.padding = '0'
    button.style.color = 'rgba(148, 163, 184, 1)'

    let visible = false

    const updateIcon = () => {
      button.innerHTML = visible ? eyeOffSvg : eyeSvg
      button.setAttribute('aria-label', visible ? 'Hide password' : 'Show password')
    }

    const handleClick = () => {
      const nextType = input.type === 'password' ? 'text' : 'password'
      input.type = nextType
      visible = nextType === 'text'
      updateIcon()
      input.focus()
    }

    updateIcon()
    button.addEventListener('click', handleClick)
    wrapper.appendChild(button)

    return () => {
      button.removeEventListener('click', handleClick)
      if (button.parentElement) {
        button.parentElement.removeChild(button)
      }
    }
  }, [])

  return null
}

export default LoginShowPasswordToggle

