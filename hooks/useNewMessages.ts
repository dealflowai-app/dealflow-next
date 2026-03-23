'use client'

import { useRealtimePolling } from './useRealtimePolling'

interface MessageCountResponse {
  count: number
}

export function useNewMessages() {
  const { data, isLoading, lastUpdated, refetch } = useRealtimePolling<MessageCountResponse>(
    '/api/messages/unread-count',
    20_000, // 20 seconds
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
