export const TIERS = {
  free: {
    name: 'Free',
    markets: 1,
    crmContacts: 50,
    reveals: 0,
    callMinutes: 0,
    sms: 0,
    analyses: 0,
    teamUsers: 1,
    marketplace: false,
    whiteLabel: false,
    apiAccess: false,
  },
  trial: {
    name: 'Trial',
    markets: 1,
    crmContacts: 50,
    reveals: 10,
    callMinutes: 10,
    sms: 20,
    analyses: 3,
    teamUsers: 1,
    marketplace: false,
    whiteLabel: false,
    apiAccess: false,
  },
  starter: {
    name: 'Starter',
    price: 149,
    stripePriceId: process.env.STRIPE_STARTER_PRICE_ID,
    markets: 1,
    crmContacts: 500,
    reveals: 50,
    callMinutes: 50,
    sms: 100,
    analyses: 10,
    teamUsers: 1,
    marketplace: 'basic',
    whiteLabel: false,
    apiAccess: false,
  },
  pro: {
    name: 'Pro',
    price: 299,
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID,
    markets: 3,
    crmContacts: 3000,
    reveals: 200,
    callMinutes: 200,
    sms: 500,
    analyses: 50,
    teamUsers: 3,
    marketplace: 'full',
    whiteLabel: false,
    apiAccess: false,
  },
  business: {
    name: 'Business',
    price: 499,
    stripePriceId: process.env.STRIPE_BUSINESS_PRICE_ID,
    markets: Infinity,
    crmContacts: Infinity,
    reveals: 500,
    callMinutes: 400,
    sms: 1000,
    analyses: -1, // unlimited
    teamUsers: Infinity,
    marketplace: 'full',
    whiteLabel: true,
    apiAccess: true,
  },
} as const

export type TierKey = keyof typeof TIERS

/** Per-unit overage rates by tier */
export const OVERAGE_RATES: Record<string, { reveals: number; callMinutes: number; sms: number }> = {
  starter:  { reveals: 0.40, callMinutes: 0.25, sms: 0.05 },
  pro:      { reveals: 0.30, callMinutes: 0.20, sms: 0.04 },
  business: { reveals: 0.25, callMinutes: 0.15, sms: 0.03 },
}

/** Plan allowances keyed by tier (for allowance system) */
export const PLAN_ALLOWANCES: Record<string, { reveals: number; callMinutes: number; sms: number; analyses: number }> = {
  free:     { reveals: 0,   callMinutes: 0,   sms: 0,    analyses: 0 },
  trial:    { reveals: 10,  callMinutes: 10,  sms: 20,   analyses: 3 },
  starter:  { reveals: 50,  callMinutes: 50,  sms: 100,  analyses: 10 },
  pro:      { reveals: 200, callMinutes: 200, sms: 500,  analyses: 50 },
  business: { reveals: 500, callMinutes: 400, sms: 1000, analyses: -1 },
}
