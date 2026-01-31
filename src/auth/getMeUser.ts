import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'

import type { User } from '@/payload-types'
import config from '@payload-config'

export const getMeUser = async (args?: {
  nullUserRedirect?: string
  validUserRedirect?: string
}): Promise<{
  token: string
  user: User
}> => {
  const { nullUserRedirect, validUserRedirect } = args || {}
  const cookieStore = await cookies()
  const token = cookieStore.get('payload-token')?.value

  // Use Payload's server-side API instead of HTTP fetch
  const payload = await getPayload({ config })
  const requestHeaders = await headers()

  // Authenticate using Payload's auth method
  const { user } = await payload.auth({ headers: requestHeaders })

  if (validUserRedirect && user) {
    redirect(validUserRedirect)
  }

  if (nullUserRedirect && !user) {
    redirect(nullUserRedirect)
  }

  if (!user) {
    throw new Error('User not authenticated')
  }

  if (!token) {
    throw new Error('Token not found')
  }

  return {
    token,
    user: user as User,
  }
}


