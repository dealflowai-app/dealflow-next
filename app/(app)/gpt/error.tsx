'use client'

import ErrorBoundaryFallback from '@/components/ErrorBoundaryFallback'

export default function GPTError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <ErrorBoundaryFallback error={error} reset={reset} tabName="Ask AI" />
}
