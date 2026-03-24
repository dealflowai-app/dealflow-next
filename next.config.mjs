/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
}

// Wrap with Sentry if available (installed via `npm i @sentry/nextjs`)
let config = nextConfig
try {
  const { withSentryConfig } = await import('@sentry/nextjs')
  config = withSentryConfig(nextConfig, {
    // Suppress Sentry logs during build
    silent: true,
    // Upload source maps for better stack traces
    widenClientFileUpload: true,
    // Hide source maps from client bundles
    hideSourceMaps: true,
    // Automatically tree-shake Sentry logger statements
    disableLogger: true,
  })
} catch {
  // @sentry/nextjs not installed — use plain config
}

export default config
