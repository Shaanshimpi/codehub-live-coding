import { Page } from '@playwright/test'
import { SEED_DATA } from './seed-data'

/**
 * Test user credentials for different roles
 */
export const TEST_USERS = {
  admin: {
    email: SEED_DATA.users.admin.email,
    password: SEED_DATA.users.admin.password,
    role: 'admin' as const,
  },
  trainer: {
    email: SEED_DATA.users.trainer.email,
    password: SEED_DATA.users.trainer.password,
    role: 'trainer' as const,
  },
  student: {
    email: SEED_DATA.users.student.email,
    password: SEED_DATA.users.student.password,
    role: 'student' as const,
  },
  manager: {
    email: SEED_DATA.users.manager.email,
    password: SEED_DATA.users.manager.password,
    role: 'manager' as const,
  },
} as const

/**
 * Re-export SEED_DATA for convenience
 */
export { SEED_DATA }

/**
 * Authenticate a user in Playwright by logging in via Payload API
 * This sets the payload-token cookie which is required for all authenticated routes
 */
export async function authenticateUser(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  // Use Payload's login API endpoint
  const response = await page.request.post('/api/users/login', {
    data: {
      email,
      password,
    },
  })

  if (!response.ok()) {
    const errorText = await response.text().catch(() => 'Unknown error')
    throw new Error(`Failed to authenticate user ${email}: ${errorText}`)
  }

  // The response should set the payload-token cookie
  // Verify we have the auth cookie
  const cookies = await page.context().cookies()
  const hasAuthCookie = cookies.some(cookie => cookie.name === 'payload-token')
  
  if (!hasAuthCookie) {
    throw new Error(`Failed to authenticate user ${email}. No payload-token cookie found.`)
  }
}

/**
 * Authenticate as a specific role using test credentials
 */
export async function authenticateAsRole(
  page: Page,
  role: 'admin' | 'trainer' | 'student' | 'manager'
): Promise<void> {
  const user = TEST_USERS[role]
  await authenticateUser(page, user.email, user.password)
}

/**
 * Check if user is authenticated by verifying cookie exists
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  const cookies = await page.context().cookies()
  return cookies.some(cookie => cookie.name === 'payload-token')
}

