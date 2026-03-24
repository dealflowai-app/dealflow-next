'use client'

import ErrorBoundaryFallback from '@/components/ErrorBoundaryFallback'

export default function CommunityError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <ErrorBoundaryFallback error={error} reset={reset} tabName="Community" />
}
