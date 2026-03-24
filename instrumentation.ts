export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { assertEnv } = await import('@/lib/env')
    assertEnv()

    // Initialize Sentry on the server if DSN is configured
    if (process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN) {
      await import('./sentry.server.config')
    }
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    if (process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN) {
      await import('./sentry.edge.config')
    }
  }
}
