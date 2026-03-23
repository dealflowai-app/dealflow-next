'use client'

import { useRealtimePolling } from './useRealtimePolling'

interface NotificationCountResponse {
  count: number
}

export function useNotificationCount() {
  const { data, isLoading, lastUpdated, refetch } = useRealtimePolling<NotificationCountResponse>(
    '/api/notifications/count',
    15_000, // 15 seconds
    {
      compareKey: 'count',
    },
  )

  return {
    unreadCount: data?.count ?? 0,
    isLoading,
    lastUpdated,
    refetch,
  }
}
