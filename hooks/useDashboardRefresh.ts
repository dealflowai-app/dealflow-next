'use client'

import { usePathname } from 'next/navigation'
import { useRealtimePolling } from './useRealtimePolling'

interface DashboardData {
  kpis: Record<string, number>
  [key: string]: unknown
}

export function useDashboardRefresh(onUpdate?: (data: DashboardData) => void) {
  const pathname = usePathname()
  const isOnDashboard = pathname === '/dashboard'

  const { data, isLoading, lastUpdated, refetch } = useRealtimePolling<DashboardData>(
    '/api/dashboard',
    60_000, // 60 seconds
    {
      enabled: isOnDashboard,
      onUpdate,
    },
  )

  return {
    data,
    isLoading,
    lastUpdated,
    isActive: isOnDashboard,
    refetch,
  }
}
