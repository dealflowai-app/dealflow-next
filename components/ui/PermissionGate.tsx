'use client'

import { ReactNode, useEffect, useState } from 'react'

interface PermissionGateProps {
  permission: string
  children: ReactNode
  fallback?: ReactNode
}

/**
 * Client component that only renders children if the current user
 * has the required permission. Shows fallback (or nothing) otherwise.
 *
 * Fetches the user's team role from /api/team and checks locally.
 */
export function PermissionGate({ permission, children, fallback = null }: PermissionGateProps) {
  const [allowed, setAllowed] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false

    async function check() {
      try {
        const res = await fetch('/api/team')
        if (!res.ok) {
          // If no team exists, user is solo => full access
          if (!cancelled) setAllowed(true)
          return
        }
        const data = await res.json()
        const role: string = data.currentUserRole ?? 'ADMIN'

        // Check permission locally
        const { hasPermission } = await import('@/lib/permissions')
        if (!cancelled) setAllowed(hasPermission(role, permission))
      } catch {
        // On error, default to showing content (fail-open for UX)
        if (!cancelled) setAllowed(true)
      }
    }

    check()
    return () => { cancelled = true }
  }, [permission])

  if (allowed === null) return null // loading
  if (!allowed) return <>{fallback}</>
  return <>{children}</>
}
