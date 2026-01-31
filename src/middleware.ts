import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only intercept /admin routes (not /admin/login, /admin/api, or /admin/logout)
  if (
    pathname === '/admin' ||
    (pathname.startsWith('/admin/') &&
      !pathname.startsWith('/admin/login') &&
      !pathname.startsWith('/admin/api') &&
      !pathname.startsWith('/admin/logout') &&
      pathname !== '/admin/unauthorized')
  ) {
    try {
      // Get the auth token from cookies
      const token = request.cookies.get('payload-token')?.value

      if (token) {
        // Check user role by calling the /api/users/me endpoint
        const protocol = request.nextUrl.protocol
        const host = request.nextUrl.host
        const baseUrl = `${protocol}//${host}`

        const userResponse = await fetch(`${baseUrl}/api/users/me`, {
          headers: {
            Cookie: request.headers.get('cookie') || '',
          },
          cache: 'no-store',
        })

        if (userResponse.ok) {
          const userData = await userResponse.json()
          const user = userData.user

          // If user is a student or trainer (not admin), redirect to home
          if (user && user.role !== 'admin') {
            return NextResponse.redirect(new URL('/', request.url))
          }
        }
      }
      // If no token or error, allow through (will show login page or Payload will handle)
    } catch (error) {
      // On error, allow through (Payload will handle auth)
      // Note: console is not available in Edge Runtime, so we can't log here
    }
  }

  // Also intercept /admin/unauthorized and redirect students/trainers to home
  if (pathname === '/admin/unauthorized') {
    try {
      const token = request.cookies.get('payload-token')?.value

      if (token) {
        const protocol = request.nextUrl.protocol
        const host = request.nextUrl.host
        const baseUrl = `${protocol}//${host}`

        const userResponse = await fetch(`${baseUrl}/api/users/me`, {
          headers: {
            Cookie: request.headers.get('cookie') || '',
          },
          cache: 'no-store',
        })

        if (userResponse.ok) {
          const userData = await userResponse.json()
          const user = userData.user

          // If user exists but is not admin, redirect to home
          if (user && user.role !== 'admin') {
            return NextResponse.redirect(new URL('/', request.url))
          }
        }
      }

      // If no token, redirect to login
      if (!token) {
        return NextResponse.redirect(new URL('/admin/login?redirect=/', request.url))
      }
    } catch (error) {
      // On error, redirect to home
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin',
    '/admin/:path*',
  ],
}

