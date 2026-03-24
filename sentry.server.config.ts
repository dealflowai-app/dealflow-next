// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV,
    release: process.env.VERCEL_GIT_COMMIT_SHA || 'dev',

    // Performance monitoring — lower sample rate in production
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Filter out noisy errors
    ignoreErrors: [
      'NEXT_NOT_FOUND',
      'NEXT_REDIRECT',
    ],

    // Don't send PII
    sendDefaultPii: false,

    // Enrich events with server context
    beforeSend(event) {
      // Strip sensitive headers
      if (event.request?.headers) {
        delete event.request.headers['authorization']
        delete event.request.headers['cookie']
        delete event.request.headers['x-forwarded-for']
      }
      return event
    },

    // Filter breadcrumbs to prevent PII leakage in HTTP requests
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.category === 'http' || breadcrumb.category === 'fetch') {
        if (breadcrumb.data) {
          delete breadcrumb.data.request_body
          delete breadcrumb.data.response_body
          // Strip auth headers from breadcrumb URLs
          if (typeof breadcrumb.data.url === 'string') {
            breadcrumb.data.url = breadcrumb.data.url.replace(/[?&](token|key|secret|auth)=[^&]*/gi, '')
          }
        }
      }
      return breadcrumb
    },

    enabled: process.env.NODE_ENV === 'production' || !!SENTRY_DSN,
  })
}
