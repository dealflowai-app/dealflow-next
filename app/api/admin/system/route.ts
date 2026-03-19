import { NextRequest, NextResponse } from 'next/server'
import { getAdminProfile } from '@/lib/admin'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'

export async function GET(req: NextRequest) {
  const { profile, error, status } = await getAdminProfile()
  if (!profile) return NextResponse.json({ error }, { status })

  // --- Service health checks ---
  const services: Array<{
    name: string
    status: 'healthy' | 'warning' | 'error'
    message: string
  }> = []

  // Database
  try {
    await prisma.profile.count()
    services.push({ name: 'Database', status: 'healthy', message: 'Connected' })
  } catch {
    services.push({ name: 'Database', status: 'error', message: 'Connection failed' })
  }

  // Stripe
  try {
    await stripe.balance.retrieve()
    services.push({ name: 'Stripe', status: 'healthy', message: 'Connected' })
  } catch {
    services.push({
      name: 'Stripe',
      status: process.env.STRIPE_SECRET_KEY ? 'error' : 'warning',
      message: process.env.STRIPE_SECRET_KEY ? 'API error' : 'Not configured',
    })
  }

  // Supabase Auth
  services.push({
    name: 'Supabase Auth',
    status: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'healthy' : 'warning',
    message: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Configured' : 'Not configured',
  })

  // External APIs (check env vars only)
  const apiChecks = [
    { name: 'ATTOM Data', envKey: 'ATTOM_API_KEY' },
    { name: 'RentCast', envKey: 'RENTCAST_API_KEY' },
    { name: 'Mapbox', envKey: 'NEXT_PUBLIC_MAPBOX_TOKEN' },
    { name: 'Bland AI', envKey: 'BLAND_AI_API_KEY' },
    { name: 'Twilio', envKey: 'TWILIO_ACCOUNT_SID' },
    { name: 'SendGrid', envKey: 'SENDGRID_API_KEY' },
    { name: 'OpenAI', envKey: 'OPENAI_API_KEY' },
    { name: 'Anthropic', envKey: 'ANTHROPIC_API_KEY' },
    { name: 'ElevenLabs', envKey: 'ELEVENLABS_API_KEY' },
  ]

  for (const api of apiChecks) {
    const isSet = !!process.env[api.envKey]
    services.push({
      name: api.name,
      status: isSet ? 'healthy' : 'warning',
      message: isSet ? 'Configured' : 'Not configured',
    })
  }

  // --- Database stats ---
  const [
    profileCount,
    buyerCount,
    dealCount,
    contractCount,
    campaignCount,
    usageCount,
    paymentCount,
    chatCount,
    listingCount,
    callCount,
  ] = await Promise.all([
    prisma.profile.count(),
    prisma.cashBuyer.count().catch(() => 0),
    prisma.deal.count().catch(() => 0),
    prisma.contract.count().catch(() => 0),
    prisma.campaign.count().catch(() => 0),
    prisma.usage.count().catch(() => 0),
    prisma.paymentHistory.count().catch(() => 0),
    prisma.chatConversation.count().catch(() => 0),
    prisma.marketplaceListing.count().catch(() => 0),
    prisma.campaignCall.count().catch(() => 0),
  ])

  const dbStats = [
    { table: 'Profiles', count: profileCount },
    { table: 'Cash Buyers', count: buyerCount },
    { table: 'Deals', count: dealCount },
    { table: 'Contracts', count: contractCount },
    { table: 'Campaigns', count: campaignCount },
    { table: 'Campaign Calls', count: callCount },
    { table: 'Usage Records', count: usageCount },
    { table: 'Payment Records', count: paymentCount },
    { table: 'Chat Conversations', count: chatCount },
    { table: 'Marketplace Listings', count: listingCount },
  ]

  // --- Environment info ---
  const stripeKey = process.env.STRIPE_SECRET_KEY || ''
  const stripeMode = stripeKey.startsWith('sk_live') ? 'Live' : 'Test'

  const environment = {
    nodeVersion: process.version,
    platform: process.platform,
    stripeMode,
    vercel: !!process.env.VERCEL,
    vercelEnv: process.env.VERCEL_ENV || 'local',
    region: process.env.VERCEL_REGION || 'N/A',
  }

  return NextResponse.json({
    services,
    dbStats,
    environment,
  })
}
