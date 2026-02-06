import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(_request: NextRequest) {
  // Payload CMS handles admin authentication internally
  // No custom middleware needed for /admin routes
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin',
    '/admin/:path*',
  ],
}

