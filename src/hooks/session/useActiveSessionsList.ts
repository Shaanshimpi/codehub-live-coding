/**
 * Hook for fetching active sessions list with React Query.
 * Shared cache between /join and /trainer/start so one request serves both.
 */

import { useQuery } from '@tanstack/react-query'
import { logApiFetch } from '@/utilities/devApiLogger'

export interface SessionListItem {
  id: number
  joinCode: string
  title: string
  trainer: {
    id: number
    name: string
    email: string
  } | null
  participantCount: number
  startedAt: string
}

interface ListResponse {
  sessions: SessionListItem[]
}

export function useActiveSessionsList(trainerId?: string | number) {
  const trainerIdStr = trainerId != null ? String(trainerId) : undefined
  const query = useQuery<SessionListItem[]>({
    queryKey: ['sessions', 'list', trainerIdStr ?? 'all'],
    queryFn: async () => {
      const url = trainerIdStr
        ? `/api/sessions/list?trainerId=${encodeURIComponent(trainerIdStr)}`
        : '/api/sessions/list'
      logApiFetch('useActiveSessionsList', url)
      const res = await fetch(url, { cache: 'no-store', credentials: 'include' })
      if (res.status === 401 || res.status === 403) {
        logApiFetch('useActiveSessionsList', url, 'ok')
        return []
      }
      if (!res.ok) {
        logApiFetch('useActiveSessionsList', url, 'error')
        throw new Error(`Failed to fetch sessions (${res.status})`)
      }
      logApiFetch('useActiveSessionsList', url, 'ok')
      const data: ListResponse = await res.json()
      return data.sessions ?? []
    },
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: (_, error) => {
      if (error instanceof Error && error.message.includes('401')) return false
      if (error instanceof Error && error.message.includes('403')) return false
      return true
    },
  })

  return {
    sessions: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  }
}
