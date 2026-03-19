export const TIERS = {
  free: {
    name: 'Free Trial',
    markets: 1,
    crmContacts: 50,
    dealsAnalyzed: 5,
    activeDeals: 1,
    freeAiMinutes: 10,
    contractStates: 0,
    marketplace: false,
    sms: false,
    abTesting: false,
    teamUsers: 1,
    whiteLabel: false,
    apiAccess: false,
  },
  starter: {
    name: 'Starter',
    price: 149,
    stripePriceId: process.env.STRIPE_STARTER_PRICE_ID,
    markets: 1,
    crmContacts: 500,
    dealsAnalyzed: 30,
    activeDeals: 5,
    freeAiMinutes: 50,
    contractStates: 5,
    marketplace: 'basic',
    sms: false,
    abTesting: false,
    teamUsers: 1,
    whiteLabel: false,
    apiAccess: false,
    dealFee: 200, // $200 per closed deal
  },
  pro: {
    name: 'Pro',
    price: 299,
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID,
    markets: 3,
    crmContacts: 3000,
    dealsAnalyzed: 150,
    activeDeals: 20,
    freeAiMinutes: 150,
    contractStates: 50,
    marketplace: 'full',
    sms: true,
    abTesting: true,
    teamUsers: 3,
    whiteLabel: false,
    apiAccess: false,
    dealFee: 200,
  },
  enterprise: {
    name: 'Enterprise',
    price: 499,
    stripePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID,
    markets: Infinity,
    crmContacts: Infinity,
    dealsAnalyzed: Infinity,
    activeDeals: Infinity,
    freeAiMinutes: 500,
    contractStates: 50,
    marketplace: 'full',
    sms: true,
    abTesting: true,
    teamUsers: Infinity,
    whiteLabel: true,
    apiAccess: true,
    dealFee: 'negotiated',
  },
} as const

export type TierKey = keyof typeof TIERS

export const USAGE_RATES = {
  aiCallPerMinute: 0.18,    // $0.18/min after free minutes
  smsPerMessage: 0.03,      // $0.03/msg
  skipTracePerReveal: 0.50,  // $0.50/reveal
  dealClosedFee: 200,        // $200/closed deal
} as const
