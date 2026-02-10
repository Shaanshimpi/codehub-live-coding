import { NextResponse } from 'next/server'

export interface AuthErrorResponse {
  error: string
  authExpired?: boolean
  code?: 'AUTH_EXPIRED' | 'UNAUTHORIZED' | 'FORBIDDEN'
}

/**
 * Create a standardized authentication error response
 * @param message - Error message
 * @param status - HTTP status code (401 or 403)
 * @returns NextResponse with standardized auth error format
 */
export function createAuthErrorResponse(
  message: string = 'Unauthorized',
  status: 401 | 403 = 401
): NextResponse<AuthErrorResponse> {
  return NextResponse.json(
    {
      error: message,
      authExpired: status === 401,
      code: status === 401 ? 'AUTH_EXPIRED' : 'FORBIDDEN',
    },
    { status }
  )
}



