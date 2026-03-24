'use client'

/**
 * Shows a banner on preview/staging deployments so you never
 * confuse staging with production. Hidden in production.
 *
 * Vercel sets NEXT_PUBLIC_VERCEL_ENV automatically:
 *   - "production" for production deploys
 *   - "preview" for preview deploys (PRs, staging branch)
 *   - "development" for `vercel dev`
 */
export default function StagingBanner() {
  const env = process.env.NEXT_PUBLIC_VERCEL_ENV

  if (!env || env === 'production') return null

  const label = env === 'preview' ? 'STAGING / PREVIEW' : 'DEVELOPMENT'

  return (
    <div className="bg-amber-500 text-amber-950 text-center text-xs font-semibold py-1 px-2 shrink-0">
      {label} — This is not the production environment
    </div>
  )
}
