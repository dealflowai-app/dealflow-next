'use client'

import ErrorBoundaryFallback from '@/components/ErrorBoundaryFallback'

export default function OutreachError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <ErrorBoundaryFallback error={error} reset={reset} tabName="Outreach" />
}
