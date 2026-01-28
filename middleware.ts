import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

// Public routes that do NOT require auth
const PUBLIC_PATHS = new Set<string>(['/'])

// Paths that should always be skipped by this middleware
const SKIP_PREFIXES = [
  '/_next', // Next.js internal assets
  '/api', // Backend APIs (can do their own auth)
  '/admin', // Payload admin handles its own auth
  '/media', // Payload media
  '/public',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
]

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true
  return SKIP_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public and skipped paths
  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  // Check for Payload auth cookie
  const hasToken = Boolean(request.cookies.get('payload-token')?.value)

  if (!hasToken) {
    // Redirect unauthenticated users to Payload admin login (they already use this)
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/admin'
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

// Apply middleware to all paths; we filter inside
export const config = {
  matcher: ['/((?!.+\\.[\\w]+$).*)', '/'], // all routes except static files
}


