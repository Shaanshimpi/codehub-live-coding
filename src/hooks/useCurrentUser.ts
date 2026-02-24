/**
 * Centralized hook for the current user (/api/users/me).
 * Use this everywhere instead of fetching /api/users/me directly so the app
 * makes at most one request per tab (shared React Query cache).
 */

import { useQuery } from '@tanstack/react-query'
import type { User } from '@/payload-types'
import { logApiFetch } from '@/utilities/devApiLogger'

interface MeResponse {
  user: User | null
}

export function useCurrentUser() {
  const query = useQuery<MeResponse>({
    queryKey: ['user', 'me'],
    queryFn: async () => {
      const url = '/api/users/me'
      logApiFetch('useCurrentUser', url)
      const res = await fetch(url, {
        credentials: 'include',
        cache: 'no-store',
      })
      if (!res.ok) {
        logApiFetch('useCurrentUser', url, 'error')
        return { user: null }
      }
      logApiFetch('useCurrentUser', url, 'ok')
      const data = await res.json()
      return { user: data.user ?? null }
    },
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: false,
  })

  const user = query.data?.user ?? null
  return {
    user,
    isLoggedIn: !!user,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  }
}
