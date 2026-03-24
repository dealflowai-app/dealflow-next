/**
 * Environment Variable Validation
 *
 * Validates that all required environment variables are set at startup,
 * with optional format validation for URLs, keys, and known patterns.
 * Import this module early (e.g. in instrumentation.ts or API route helpers)
 * to catch misconfigurations before they cause cryptic runtime errors.
 */

type FormatCheck = 'url' | 'key' | 'phone' | 'cron_secret'

interface EnvVar {
  name: string
  required: boolean
  clientSide?: boolean    // NEXT_PUBLIC_ vars available in browser
  format?: FormatCheck    // Optional format validation
}

const SERVER_VARS: EnvVar[] = [
  // Database
  { name: 'DATABASE_URL', required: true, format: 'url' },
  { name: 'DIRECT_URL', required: true, format: 'url' },

  // Supabase Auth
  { name: 'NEXT_PUBLIC_SUPABASE_URL', required: true, clientSide: true, format: 'url' },
  { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', required: true, clientSide: true },

  // AI
  { name: 'ANTHROPIC_API_KEY', required: true, format: 'key' },

  // Property Data
  { name: 'BATCHDATA_API_KEY', required: true, format: 'key' },

  // Maps
  { name: 'NEXT_PUBLIC_MAPBOX_TOKEN', required: true, clientSide: true },

  // Stripe
  { name: 'STRIPE_SECRET_KEY', required: true, format: 'key' },
  { name: 'STRIPE_WEBHOOK_SECRET', required: true },
  { name: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', required: true, clientSide: true },
  { name: 'STRIPE_STARTER_PRICE_ID', required: true },
  { name: 'STRIPE_PRO_PRICE_ID', required: true },

  // Twilio (required for OTP — core auth flow)
  { name: 'TWILIO_ACCOUNT_SID', required: true },
  { name: 'TWILIO_AUTH_TOKEN', required: true },
  { name: 'TWILIO_PHONE_NUMBER', required: true, format: 'phone' },

  // SendGrid
  { name: 'SENDGRID_API_KEY', required: true, format: 'key' },

  // Cron Security
  { name: 'CRON_SECRET', required: true, format: 'cron_secret' },

  // Bland AI (optional — outreach feature)
  { name: 'BLAND_API_KEY', required: false, format: 'key' },
  { name: 'BLAND_WEBHOOK_SECRET', required: false },

  // RentCast (optional — enrichment)
  { name: 'RENTCAST_API_KEY', required: false, format: 'key' },

  // App URL
  { name: 'NEXT_PUBLIC_APP_URL', required: false, clientSide: true, format: 'url' },

  // Sentry (optional — error tracking)
  { name: 'SENTRY_DSN', required: false, format: 'url' },
  { name: 'NEXT_PUBLIC_SENTRY_DSN', required: false, clientSide: true, format: 'url' },
]

// ─── Format validators ─────────────────────────────────────────────────────

const FORMAT_VALIDATORS: Record<FormatCheck, (val: string) => string | null> = {
  url: (val) => {
    // Accept postgres:// and https:// URLs
    if (/^(https?|postgres(ql)?|wss?):\/\/.+/i.test(val)) return null
    return 'must be a valid URL (https://, postgres://, etc.)'
  },
  key: (val) => {
    // API keys should be at least 10 chars and not contain spaces
    if (val.length >= 10 && !/\s/.test(val)) return null
    return 'must be at least 10 characters with no spaces'
  },
  phone: (val) => {
    // E.164 format: +1XXXXXXXXXX or similar
    if (/^\+?[1-9]\d{6,14}$/.test(val.replace(/[\s-()]/g, ''))) return null
    return 'must be a valid phone number (e.g. +15551234567)'
  },
  cron_secret: (val) => {
    if (val.length >= 16) return null
    return 'must be at least 16 characters for security'
  },
}

// ─── Validation ─────────────────────────────────────────────────────────────

export interface EnvValidationResult {
  valid: boolean
  missing: string[]
  warnings: string[]
  formatErrors: string[]
}

export function validateEnv(): EnvValidationResult {
  const missing: string[] = []
  const warnings: string[] = []
  const formatErrors: string[] = []

  for (const v of SERVER_VARS) {
    const value = process.env[v.name]
    if (!value || value.trim() === '') {
      if (v.required) {
        missing.push(v.name)
      } else {
        warnings.push(v.name)
      }
      continue
    }

    // Format validation (only if value is present)
    if (v.format) {
      const error = FORMAT_VALIDATORS[v.format](value.trim())
      if (error) {
        formatErrors.push(`${v.name}: ${error}`)
      }
    }
  }

  // Check for common misconfigurations
  const dbUrl = process.env.DATABASE_URL
  if (dbUrl && dbUrl.includes('[PASSWORD]')) {
    formatErrors.push('DATABASE_URL: contains placeholder [PASSWORD] — replace with actual password')
  }
  if (dbUrl && dbUrl.includes('[PROJECT]')) {
    formatErrors.push('DATABASE_URL: contains placeholder [PROJECT] — replace with actual project ID')
  }

  return {
    valid: missing.length === 0 && formatErrors.length === 0,
    missing,
    warnings,
    formatErrors,
  }
}

/**
 * Call this at server startup. Logs errors for missing required vars,
 * format validation failures, and warnings for missing optional vars.
 * Throws in production if required vars are missing or format checks fail.
 */
export function assertEnv(): void {
  // Only run on server
  if (typeof window !== 'undefined') return

  const { valid, missing, warnings, formatErrors } = validateEnv()

  if (warnings.length > 0) {
    console.warn(
      `[ENV] Optional variables not set (some features will be disabled): ${warnings.join(', ')}`,
    )
  }

  if (formatErrors.length > 0) {
    console.error(`[ENV] Format validation errors:\n  ${formatErrors.join('\n  ')}`)
  }

  if (missing.length > 0) {
    const message = `[ENV] Missing required environment variables: ${missing.join(', ')}`
    console.error(message)
  }

  if (!valid && process.env.NODE_ENV === 'production') {
    throw new Error(
      `[ENV] Environment validation failed. Missing: [${missing.join(', ')}]` +
      (formatErrors.length > 0 ? `. Format errors: [${formatErrors.join('; ')}]` : ''),
    )
  }
}
