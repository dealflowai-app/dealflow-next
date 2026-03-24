/**
 * Environment Variable Validation
 *
 * Validates that all required environment variables are set at startup.
 * Import this module early (e.g. in layout.tsx or API route helpers)
 * to catch misconfigurations before they cause cryptic runtime errors.
 */

interface EnvVar {
  name: string
  required: boolean
  clientSide?: boolean // NEXT_PUBLIC_ vars available in browser
}

const SERVER_VARS: EnvVar[] = [
  // Database
  { name: 'DATABASE_URL', required: true },
  { name: 'DIRECT_URL', required: true },

  // Supabase Auth
  { name: 'NEXT_PUBLIC_SUPABASE_URL', required: true, clientSide: true },
  { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', required: true, clientSide: true },

  // AI
  { name: 'ANTHROPIC_API_KEY', required: true },

  // Property Data
  { name: 'BATCHDATA_API_KEY', required: true },

  // Maps
  { name: 'NEXT_PUBLIC_MAPBOX_TOKEN', required: true, clientSide: true },

  // Stripe
  { name: 'STRIPE_SECRET_KEY', required: true },
  { name: 'STRIPE_WEBHOOK_SECRET', required: true },
  { name: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', required: true, clientSide: true },
  { name: 'STRIPE_STARTER_PRICE_ID', required: true },
  { name: 'STRIPE_PRO_PRICE_ID', required: true },

  // Twilio (required for OTP — core auth flow)
  { name: 'TWILIO_ACCOUNT_SID', required: true },
  { name: 'TWILIO_AUTH_TOKEN', required: true },
  { name: 'TWILIO_PHONE_NUMBER', required: true },

  // SendGrid
  { name: 'SENDGRID_API_KEY', required: true },

  // Bland AI (optional — outreach feature)
  { name: 'BLAND_API_KEY', required: false },
  { name: 'BLAND_WEBHOOK_SECRET', required: false },

  // RentCast (optional — enrichment)
  { name: 'RENTCAST_API_KEY', required: false },

  // App URL
  { name: 'NEXT_PUBLIC_APP_URL', required: false, clientSide: true },
]

export function validateEnv(): { valid: boolean; missing: string[]; warnings: string[] } {
  const missing: string[] = []
  const warnings: string[] = []

  for (const v of SERVER_VARS) {
    const value = process.env[v.name]
    if (!value || value.trim() === '') {
      if (v.required) {
        missing.push(v.name)
      } else {
        warnings.push(v.name)
      }
    }
  }

  return { valid: missing.length === 0, missing, warnings }
}

/**
 * Call this at server startup. Logs errors for missing required vars
 * and warnings for missing optional vars. Throws in production if
 * required vars are missing.
 */
export function assertEnv(): void {
  // Only run on server
  if (typeof window !== 'undefined') return

  const { valid, missing, warnings } = validateEnv()

  if (warnings.length > 0) {
    console.warn(
      `[ENV] Optional variables not set (some features will be disabled): ${warnings.join(', ')}`,
    )
  }

  if (!valid) {
    const message = `[ENV] Missing required environment variables: ${missing.join(', ')}`
    console.error(message)

    if (process.env.NODE_ENV === 'production') {
      throw new Error(message)
    }
  }
}
