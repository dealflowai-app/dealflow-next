'use client'

import { useOnlineStatus } from '@/lib/hooks/useOnlineStatus'
import { WifiOff } from 'lucide-react'

export function OfflineBanner() {
  const isOnline = useOnlineStatus()

  if (isOnline) return null

  return (
    <div className="flex items-center justify-center gap-2 px-4 py-2 bg-amber-50 border-b border-amber-200 text-amber-700 text-xs">
      <WifiOff className="w-3.5 h-3.5" />
      You&apos;re offline. Messages will send when you reconnect.
    </div>
  )
}
