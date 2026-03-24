'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import * as Sentry from '@sentry/nextjs'

interface ErrorBoundaryFallbackProps {
  error: Error & { digest?: string }
  reset: () => void
  tabName: string
}

export default function ErrorBoundaryFallback({ error, reset, tabName }: ErrorBoundaryFallbackProps) {
  useEffect(() => {
    console.error(`[${tabName}] Unhandled error:`, error)
    Sentry.captureException(error, {
      tags: { tab: tabName },
      extra: { digest: error.digest },
    })
  }, [error, tabName])

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-6">
      <div className="max-w-md w-full text-center">
        <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-7 h-7 text-red-500" />
        </div>
        <h2 className="text-[1.1rem] font-semibold text-[#0B1224] mb-2">
          Something went wrong
        </h2>
        <p className="text-[0.85rem] text-[rgba(5,14,36,0.5)] mb-6 leading-relaxed">
          An error occurred while loading {tabName}. This has been logged automatically.
          {error.digest && (
            <span className="block mt-1 text-[0.75rem] text-[rgba(5,14,36,0.3)] font-mono">
              Error ID: {error.digest}
            </span>
          )}
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-[0.82rem] font-medium text-white bg-[#2563EB] hover:bg-[#1d4ed8] transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Try Again
          </button>
          <a
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-[0.82rem] font-medium text-[rgba(5,14,36,0.6)] bg-[rgba(5,14,36,0.04)] hover:bg-[rgba(5,14,36,0.08)] transition-colors"
          >
            <Home className="w-4 h-4" /> Dashboard
          </a>
        </div>
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-6 text-left">
            <summary className="text-[0.75rem] text-[rgba(5,14,36,0.4)] cursor-pointer hover:text-[rgba(5,14,36,0.6)]">
              Stack trace (dev only)
            </summary>
            <pre className="mt-2 p-3 bg-[rgba(5,14,36,0.03)] rounded-md text-[0.7rem] text-red-600 overflow-x-auto whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
              {error.message}
              {'\n'}
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    </div>
  )
}
