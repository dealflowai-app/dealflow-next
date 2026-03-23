import { prisma } from '@/lib/prisma'

// ─── Seed demo data for a new user ──────────────────────────────────────────

export async function seedDemoData(profileId: string) {
  // Create 4 demo deals
  const deals = await Promise.all([
    prisma.deal.create({
      data: {
        profileId,
        address: '123 Oak Street',
        city: 'Phoenix',
        state: 'AZ',
        zip: '85001',
        propertyType: 'SFR',
        askingPrice: 185000,
        arv: 265000,
        status: 'ACTIVE',
        beds: 3,
        baths: 2,
        sqft: 1450,
        yearBuilt: 1998,
        condition: 'fair',
        notes: '[DEMO] Demo deal seeded during onboarding',
      },
    }),
    prisma.deal.create({
      data: {
        profileId,
        address: '456 Maple Ave',
        city: 'Dallas',
        state: 'TX',
        zip: '75201',
        propertyType: 'SFR',
        askingPrice: 142000,
        arv: 210000,
        status: 'UNDER_OFFER',
        beds: 3,
        baths: 1.5,
        sqft: 1280,
        yearBuilt: 2004,
        condition: 'fair',
        notes: '[DEMO] Demo deal seeded during onboarding',
      },
    }),
    prisma.deal.create({
      data: {
        profileId,
        address: '789 Pine Blvd',
        city: 'Atlanta',
        state: 'GA',
        zip: '30301',
        propertyType: 'MULTI_FAMILY',
        askingPrice: 98000,
        arv: 155000,
        status: 'ACTIVE',
        beds: 4,
        baths: 2,
        sqft: 1800,
        yearBuilt: 1985,
        condition: 'distressed',
        notes: '[DEMO] Demo deal seeded during onboarding',
      },
    }),
    prisma.deal.create({
      data: {
        profileId,
        address: '321 Cedar Lane',
        city: 'Tampa',
        state: 'FL',
        zip: '33601',
        propertyType: 'SFR',
        askingPrice: 225000,
        arv: 310000,
        status: 'DRAFT',
        beds: 4,
        baths: 2.5,
        sqft: 2100,
        yearBuilt: 2010,
        condition: 'good',
        notes: '[DEMO] Demo deal seeded during onboarding',
      },
    }),
  ])

  // Create 5 demo buyers
  const buyers = await Promise.all([
    prisma.cashBuyer.create({
      data: {
        profileId,
        firstName: 'Marcus',
        lastName: 'Johnson',
        phone: '(602) 555-0147',
        email: 'marcus@fixnflip.com',
        status: 'ACTIVE',
        buyerScore: 92,
        preferredMarkets: ['Phoenix, AZ'],
        buyerType: 'CASH_BUYER',
        strategy: 'FLIP',
        contactType: 'BUYER',
        motivation: 'HOT',
        city: 'Phoenix',
        state: 'AZ',
        notes: '[DEMO] Demo buyer seeded during onboarding',
      },
    }),
    prisma.cashBuyer.create({
      data: {
        profileId,
        firstName: 'Sarah',
        lastName: 'Chen',
        phone: '(214) 555-0238',
        email: 'sarah@chenproperties.com',
        status: 'HIGH_CONFIDENCE',
        buyerScore: 87,
        preferredMarkets: ['Dallas, TX'],
        buyerType: 'CASH_BUYER',
        strategy: 'HOLD',
        contactType: 'BUYER',
        motivation: 'WARM',
        city: 'Dallas',
        state: 'TX',
        notes: '[DEMO] Demo buyer seeded during onboarding',
      },
    }),
    prisma.cashBuyer.create({
      data: {
        profileId,
        firstName: 'David',
        lastName: 'Williams',
        phone: '(404) 555-0319',
        email: 'david@williamsrei.com',
        status: 'ACTIVE',
        buyerScore: 75,
        preferredMarkets: ['Atlanta, GA'],
        buyerType: 'CASH_BUYER',
        strategy: 'FLIP',
        contactType: 'BUYER',
        motivation: 'WARM',
        city: 'Atlanta',
        state: 'GA',
        notes: '[DEMO] Demo buyer seeded during onboarding',
      },
    }),
    prisma.cashBuyer.create({
      data: {
        profileId,
        firstName: 'Jessica',
        lastName: 'Martinez',
        phone: '(813) 555-0421',
        email: 'jess@martinezgroup.com',
        status: 'RECENTLY_VERIFIED',
        buyerScore: 84,
        preferredMarkets: ['Tampa, FL'],
        buyerType: 'CASH_BUYER',
        strategy: 'BOTH',
        contactType: 'BUYER',
        motivation: 'HOT',
        city: 'Tampa',
        state: 'FL',
        notes: '[DEMO] Demo buyer seeded during onboarding',
      },
    }),
    prisma.cashBuyer.create({
      data: {
        profileId,
        firstName: 'Robert',
        lastName: 'Kim',
        phone: '(602) 555-0563',
        email: 'robert@kimcapital.com',
        status: 'DORMANT',
        buyerScore: 61,
        preferredMarkets: ['Phoenix, AZ', 'Las Vegas, NV'],
        buyerType: 'CASH_BUYER',
        strategy: 'HOLD',
        contactType: 'BUYER',
        motivation: 'COLD',
        city: 'Phoenix',
        state: 'AZ',
        notes: '[DEMO] Demo buyer seeded during onboarding',
      },
    }),
  ])

  // Create 3 demo community posts
  const posts = await Promise.all([
    prisma.communityPost.create({
      data: {
        profileId,
        content:
          'Just closed my first deal of the month! Phoenix market is heating up. ARV came in at $265K on a property I picked up for $185K. The key was moving fast on the initial offer.',
      },
    }),
    prisma.communityPost.create({
      data: {
        profileId,
        content:
          'Anyone else seeing increased competition in the Dallas market? Thinking about expanding to Houston. Would love to hear from wholesalers who work both markets.',
      },
    }),
    prisma.communityPost.create({
      data: {
        profileId,
        content:
          "Pro tip: Always get 3 separate comps before making an offer. I use DealFlow's analyzer plus my own research. Saved me from a bad deal last week.",
      },
    }),
  ])

  // Create 1 demo community group + membership
  const group = await prisma.communityGroup.create({
    data: {
      name: 'Phoenix Wholesalers',
      description:
        'Connect with active wholesalers in the Phoenix metro area. Share deals, strategies, and market insights.',
      createdById: profileId,
      members: {
        create: { profileId },
      },
    },
  })

  // Store demo record IDs in profile settings
  const demoData = {
    dealIds: deals.map((d) => d.id),
    buyerIds: buyers.map((b) => b.id),
    postIds: posts.map((p) => p.id),
    groupIds: [group.id],
  }

  // Read existing settings and merge
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { settings: true },
  })

  const existingSettings =
    (profile?.settings as Record<string, unknown>) || {}

  await prisma.profile.update({
    where: { id: profileId },
    data: {
      settings: {
        ...existingSettings,
        demoMode: true,
        demoData,
      },
    },
  })

  return demoData
}

// ─── Clear demo data for a user ─────────────────────────────────────────────

export async function clearDemoData(profileId: string) {
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { settings: true },
  })

  const settings = (profile?.settings as Record<string, unknown>) || {}
  const demoData = settings.demoData as {
    dealIds?: string[]
    buyerIds?: string[]
    postIds?: string[]
    groupIds?: string[]
  } | undefined

  if (!demoData) {
    return { cleared: false, message: 'No demo data found' }
  }

  // Delete all demo records in parallel
  await Promise.all([
    demoData.dealIds?.length
      ? prisma.deal.deleteMany({ where: { id: { in: demoData.dealIds } } })
      : Promise.resolve(),
    demoData.buyerIds?.length
      ? prisma.cashBuyer.deleteMany({
          where: { id: { in: demoData.buyerIds } },
        })
      : Promise.resolve(),
    demoData.postIds?.length
      ? prisma.communityPost.deleteMany({
          where: { id: { in: demoData.postIds } },
        })
      : Promise.resolve(),
    demoData.groupIds?.length
      ? prisma.communityGroup.deleteMany({
          where: { id: { in: demoData.groupIds } },
        })
      : Promise.resolve(),
  ])

  // Remove demo flags from settings
  const { demoMode, demoData: _, ...remainingSettings } = settings
  void demoMode // suppress unused variable

  await prisma.profile.update({
    where: { id: profileId },
    data: {
      settings: {
        ...remainingSettings,
        demoMode: false,
      },
    },
  })

  return { cleared: true }
}
