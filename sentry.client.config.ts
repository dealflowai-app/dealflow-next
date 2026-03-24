// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a user loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV,
    release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || 'dev',

    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Session replay for debugging (sample 1% of sessions, 100% of error sessions)
    replaysSessionSampleRate: 0.01,
    replaysOnErrorSampleRate: 1.0,

    integrations: [
      Sentry.replayIntegration(),
      Sentry.browserTracingIntegration(),
    ],

    // Filter out noisy errors
    ignoreErrors: [
      // Browser extensions
      /extensions\//i,
      /^chrome:\/\//,
      // Network errors (already handled by app)
      'Failed to fetch',
      'NetworkError',
      'Load failed',
      // User navigation
      'AbortError',
      'ResizeObserver loop',
    ],

    // Don't send PII
    sendDefaultPii: false,

    // Filter breadcrumbs to prevent PII leakage
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.category === 'xhr' || breadcrumb.category === 'fetch') {
        if (breadcrumb.data) {
          delete breadcrumb.data.request_body
          delete breadcrumb.data.response_body
        }
      }
      return breadcrumb
    },

    // Only enable in production or when DSN is explicitly set
    enabled: process.env.NODE_ENV === 'production' || !!SENTRY_DSN,
  })
}
