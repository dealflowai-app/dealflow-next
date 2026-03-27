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
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Prevent clickjacking
          { key: 'X-Frame-Options', value: 'DENY' },
          // Prevent MIME-type sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Enforce HTTPS
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          // Control referrer information
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Restrict browser features
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=(self), interest-cohort=()' },
          // XSS protection (legacy browsers)
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          // DNS prefetch control
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          // Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://api.mapbox.com",
              "style-src 'self' 'unsafe-inline' https://api.mapbox.com",
              "img-src 'self' data: blob: https://images.unsplash.com https://*.supabase.co https://*.mapbox.com https://*.stripe.com",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.mapbox.com https://*.mapbox.com https://api.stripe.com https://*.sentry.io",
              "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "upgrade-insecure-requests",
            ].join('; '),
          },
        ],
      },
    ]
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

// Wrap with bundle analyzer when ANALYZE=true (npm run analyze)
try {
  if (process.env.ANALYZE === 'true') {
    const withBundleAnalyzer = (await import('@next/bundle-analyzer')).default({
      enabled: true,
    })
    config = withBundleAnalyzer(config)
  }
} catch {
  // @next/bundle-analyzer not installed — skip
}

export default config
