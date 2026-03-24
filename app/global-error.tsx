'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html>
      <body style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, system-ui, sans-serif", background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', margin: 0 }}>
        <div style={{ textAlign: 'center', maxWidth: 440, padding: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>Something went wrong</div>
          <p style={{ color: '#6B7280', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            An unexpected error occurred. Our team has been notified and is looking into it.
          </p>
          {error.digest && (
            <p style={{ color: '#9CA3AF', fontSize: '0.75rem', marginBottom: '1rem' }}>
              Error ID: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              background: '#2563EB',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              padding: '10px 24px',
              fontSize: '0.88rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
