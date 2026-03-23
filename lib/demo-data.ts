import { prisma } from '@/lib/prisma'

// ─── Seed demo data for a new user ──────────────────────────────────────────

export async function seedDemoData(profileId: string) {
  // Create 8 demo deals across different statuses and markets
  const deals = await Promise.all([
    prisma.deal.create({
      data: {
        profileId, address: '123 Oak Street', city: 'Phoenix', state: 'AZ', zip: '85001',
        propertyType: 'SFR', askingPrice: 185000, arv: 265000, status: 'ACTIVE',
        beds: 3, baths: 2, sqft: 1450, yearBuilt: 1998, condition: 'fair',
        notes: '[DEMO] Great flip opportunity in central Phoenix. Seller motivated.',
      },
    }),
    prisma.deal.create({
      data: {
        profileId, address: '456 Maple Ave', city: 'Dallas', state: 'TX', zip: '75201',
        propertyType: 'SFR', askingPrice: 142000, arv: 210000, status: 'UNDER_OFFER',
        beds: 3, baths: 1.5, sqft: 1280, yearBuilt: 2004, condition: 'fair',
        notes: '[DEMO] Buyer Marcus Johnson submitted offer at $148K.',
      },
    }),
    prisma.deal.create({
      data: {
        profileId, address: '789 Pine Blvd', city: 'Atlanta', state: 'GA', zip: '30301',
        propertyType: 'MULTI_FAMILY', askingPrice: 98000, arv: 155000, status: 'ACTIVE',
        beds: 4, baths: 2, sqft: 1800, yearBuilt: 1985, condition: 'distressed',
        notes: '[DEMO] Duplex with major upside. Needs full rehab.',
      },
    }),
    prisma.deal.create({
      data: {
        profileId, address: '321 Cedar Lane', city: 'Tampa', state: 'FL', zip: '33601',
        propertyType: 'SFR', askingPrice: 225000, arv: 310000, status: 'DRAFT',
        beds: 4, baths: 2.5, sqft: 2100, yearBuilt: 2010, condition: 'good',
        notes: '[DEMO] Just pulled comps, preparing to submit offer.',
      },
    }),
    prisma.deal.create({
      data: {
        profileId, address: '550 Birch Dr', city: 'Houston', state: 'TX', zip: '77001',
        propertyType: 'SFR', askingPrice: 165000, arv: 240000, status: 'ACTIVE',
        beds: 3, baths: 2, sqft: 1600, yearBuilt: 2001, condition: 'fair',
        notes: '[DEMO] Pre-foreclosure lead. Owner open to assignment.',
      },
    }),
    prisma.deal.create({
      data: {
        profileId, address: '88 Willow Ct', city: 'Phoenix', state: 'AZ', zip: '85003',
        propertyType: 'SFR', askingPrice: 135000, arv: 195000, status: 'CLOSED',
        beds: 2, baths: 1, sqft: 980, yearBuilt: 1992, condition: 'distressed',
        notes: '[DEMO] Closed for $12K assignment fee. Buyer: Sarah Chen.',
        closedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.deal.create({
      data: {
        profileId, address: '1200 Elm St', city: 'San Antonio', state: 'TX', zip: '78201',
        propertyType: 'MULTI_FAMILY', askingPrice: 280000, arv: 400000, status: 'UNDER_OFFER',
        beds: 6, baths: 3, sqft: 3200, yearBuilt: 1978, condition: 'fair',
        notes: '[DEMO] Triplex with strong rental history. Two offers pending.',
      },
    }),
    prisma.deal.create({
      data: {
        profileId, address: '42 Sunset Blvd', city: 'Las Vegas', state: 'NV', zip: '89101',
        propertyType: 'SFR', askingPrice: 195000, arv: 275000, status: 'CANCELLED',
        beds: 3, baths: 2, sqft: 1550, yearBuilt: 2006, condition: 'good',
        notes: '[DEMO] Seller pulled out. Title issues discovered.',
      },
    }),
  ])

  // Create 10 demo buyers with varied profiles
  const buyers = await Promise.all([
    prisma.cashBuyer.create({
      data: {
        profileId, firstName: 'Marcus', lastName: 'Johnson',
        phone: '(602) 555-0147', email: 'marcus@fixnflip.com',
        status: 'ACTIVE', buyerScore: 92, preferredMarkets: ['Phoenix, AZ'],
        buyerType: 'CASH_BUYER', strategy: 'FLIP', contactType: 'BUYER',
        motivation: 'HOT', city: 'Phoenix', state: 'AZ',
        notes: '[DEMO] Closes fast, prefers distressed SFR under $200K.',
      },
    }),
    prisma.cashBuyer.create({
      data: {
        profileId, firstName: 'Sarah', lastName: 'Chen',
        phone: '(214) 555-0238', email: 'sarah@chenproperties.com',
        status: 'HIGH_CONFIDENCE', buyerScore: 87, preferredMarkets: ['Dallas, TX', 'Houston, TX'],
        buyerType: 'CASH_BUYER', strategy: 'HOLD', contactType: 'BUYER',
        motivation: 'WARM', city: 'Dallas', state: 'TX',
        notes: '[DEMO] Building rental portfolio. Prefers turnkey or light rehab.',
      },
    }),
    prisma.cashBuyer.create({
      data: {
        profileId, firstName: 'David', lastName: 'Williams',
        phone: '(404) 555-0319', email: 'david@williamsrei.com',
        status: 'ACTIVE', buyerScore: 75, preferredMarkets: ['Atlanta, GA'],
        buyerType: 'CASH_BUYER', strategy: 'FLIP', contactType: 'BUYER',
        motivation: 'WARM', city: 'Atlanta', state: 'GA',
        notes: '[DEMO] Experienced flipper, 20+ deals per year.',
      },
    }),
    prisma.cashBuyer.create({
      data: {
        profileId, firstName: 'Jessica', lastName: 'Martinez',
        phone: '(813) 555-0421', email: 'jess@martinezgroup.com',
        status: 'RECENTLY_VERIFIED', buyerScore: 84, preferredMarkets: ['Tampa, FL', 'Orlando, FL'],
        buyerType: 'CASH_BUYER', strategy: 'BOTH', contactType: 'BUYER',
        motivation: 'HOT', city: 'Tampa', state: 'FL',
        notes: '[DEMO] Runs a property management company. Buys flips and rentals.',
      },
    }),
    prisma.cashBuyer.create({
      data: {
        profileId, firstName: 'Robert', lastName: 'Kim',
        phone: '(602) 555-0563', email: 'robert@kimcapital.com',
        status: 'DORMANT', buyerScore: 61, preferredMarkets: ['Phoenix, AZ', 'Las Vegas, NV'],
        buyerType: 'CASH_BUYER', strategy: 'HOLD', contactType: 'BUYER',
        motivation: 'COLD', city: 'Phoenix', state: 'AZ',
        notes: '[DEMO] Last active 3 months ago. Follow up needed.',
      },
    }),
    prisma.cashBuyer.create({
      data: {
        profileId, firstName: 'Angela', lastName: 'Thompson',
        phone: '(713) 555-0892', email: 'angela@thompsonhomes.com',
        status: 'ACTIVE', buyerScore: 95, preferredMarkets: ['Houston, TX', 'San Antonio, TX'],
        buyerType: 'CASH_BUYER', strategy: 'FLIP', contactType: 'BUYER',
        motivation: 'HOT', city: 'Houston', state: 'TX',
        notes: '[DEMO] VIP buyer. Closes in under 10 days. No inspections.',
      },
    }),
    prisma.cashBuyer.create({
      data: {
        profileId, firstName: 'Brian', lastName: 'Patel',
        phone: '(480) 555-0734', email: 'brian@patelinvest.com',
        status: 'ACTIVE', buyerScore: 78, preferredMarkets: ['Phoenix, AZ', 'Tucson, AZ'],
        buyerType: 'CASH_BUYER', strategy: 'HOLD', contactType: 'BUYER',
        motivation: 'WARM', city: 'Scottsdale', state: 'AZ',
        notes: '[DEMO] Owns 30+ rental units. Looking for multi-family.',
      },
    }),
    prisma.cashBuyer.create({
      data: {
        profileId, firstName: 'Lisa', lastName: 'Nguyen',
        phone: '(407) 555-0156', email: 'lisa@nguyenrei.com',
        status: 'HIGH_CONFIDENCE', buyerScore: 89, preferredMarkets: ['Orlando, FL', 'Tampa, FL'],
        buyerType: 'CASH_BUYER', strategy: 'BOTH', contactType: 'BUYER',
        motivation: 'HOT', city: 'Orlando', state: 'FL',
        notes: '[DEMO] Realtor-investor hybrid. Great for quick dispositions.',
      },
    }),
    prisma.cashBuyer.create({
      data: {
        profileId, firstName: 'Carlos', lastName: 'Rivera',
        phone: '(210) 555-0467', email: 'carlos@riveracap.com',
        status: 'ACTIVE', buyerScore: 70, preferredMarkets: ['San Antonio, TX'],
        buyerType: 'CASH_BUYER', strategy: 'FLIP', contactType: 'BUYER',
        motivation: 'WARM', city: 'San Antonio', state: 'TX',
        notes: '[DEMO] New buyer, did 3 deals last quarter.',
      },
    }),
    prisma.cashBuyer.create({
      data: {
        profileId, firstName: 'Tanya', lastName: 'Brooks',
        phone: '(702) 555-0291', email: 'tanya@brooksholdings.com',
        status: 'DORMANT', buyerScore: 55, preferredMarkets: ['Las Vegas, NV'],
        buyerType: 'CASH_BUYER', strategy: 'HOLD', contactType: 'BUYER',
        motivation: 'COLD', city: 'Las Vegas', state: 'NV',
        notes: '[DEMO] Reached out twice, no response. Try again in 30 days.',
      },
    }),
  ])

  // Create 5 demo community posts
  const posts = await Promise.all([
    prisma.communityPost.create({
      data: {
        profileId,
        content: 'Just closed my first deal of the month! Phoenix market is heating up. ARV came in at $265K on a property I picked up for $185K. The key was moving fast on the initial offer.',
      },
    }),
    prisma.communityPost.create({
      data: {
        profileId,
        content: 'Anyone else seeing increased competition in the Dallas market? Thinking about expanding to Houston. Would love to hear from wholesalers who work both markets.',
      },
    }),
    prisma.communityPost.create({
      data: {
        profileId,
        content: "Pro tip: Always get 3 separate comps before making an offer. I use DealFlow's analyzer plus my own research. Saved me from a bad deal last week.",
      },
    }),
    prisma.communityPost.create({
      data: {
        profileId,
        content: 'New to wholesaling and just signed up for DealFlow AI. Impressed by the buyer discovery tool. Already found 3 cash buyers in my market within 10 minutes.',
      },
    }),
    prisma.communityPost.create({
      data: {
        profileId,
        content: 'Tip for new wholesalers: Build your buyer list BEFORE you get a deal under contract. Having 50+ vetted buyers means you can move any deal in 48 hours.',
      },
    }),
  ])

  // Create 2 demo community groups + membership
  const groups = await Promise.all([
    prisma.communityGroup.create({
      data: {
        name: 'Phoenix Wholesalers',
        description: 'Connect with active wholesalers in the Phoenix metro area. Share deals, strategies, and market insights.',
        createdById: profileId,
        members: { create: { profileId } },
      },
    }),
    prisma.communityGroup.create({
      data: {
        name: 'Texas Deal Network',
        description: 'Wholesalers covering Dallas, Houston, San Antonio, and Austin. JV opportunities and buyer sharing.',
        createdById: profileId,
        members: { create: { profileId } },
      },
    }),
  ])

  // Create demo notifications
  const notifications = await Promise.all([
    prisma.notification.create({
      data: {
        profileId, type: 'deal_update', title: 'New offer on 456 Maple Ave',
        body: 'Marcus Johnson submitted an offer of $148,000 on your Dallas deal.',
      },
    }),
    prisma.notification.create({
      data: {
        profileId, type: 'match_alert', title: '3 buyers matched your Phoenix deal',
        body: 'New matches found for 123 Oak Street based on buyer preferences.',
      },
    }),
    prisma.notification.create({
      data: {
        profileId, type: 'system', title: 'Welcome to DealFlow AI!',
        body: 'Your account is set up with demo data. Explore the platform and clear it when ready.',
      },
    }),
    prisma.notification.create({
      data: {
        profileId, type: 'campaign_complete', title: 'Campaign "Phoenix Outreach" completed',
        body: '15 calls made, 8 answered, 3 qualified buyers identified.',
      },
    }),
  ])

  // Create demo activity logs
  const activities = await Promise.all([
    prisma.activityLog.create({
      data: {
        profileId, type: 'DEAL_CREATED', title: 'Created deal at 123 Oak Street, Phoenix AZ',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      },
    }),
    prisma.activityLog.create({
      data: {
        profileId, type: 'BUYER_ADDED', title: 'Added Marcus Johnson to buyer list',
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
      },
    }),
    prisma.activityLog.create({
      data: {
        profileId, type: 'DEAL_STATUS_CHANGED', title: '456 Maple Ave status changed to Under Offer',
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.activityLog.create({
      data: {
        profileId, type: 'BUYER_ADDED', title: 'Imported 5 buyers from Find Buyers',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.activityLog.create({
      data: {
        profileId, type: 'DEAL_CREATED', title: 'Closed deal at 88 Willow Ct for $12K assignment fee',
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.activityLog.create({
      data: {
        profileId, type: 'CAMPAIGN_SENT', title: 'Launched "Phoenix Outreach" campaign to 15 buyers',
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
    }),
  ])

  // Create demo outreach campaigns with calls
  const campaigns = await Promise.all([
    prisma.campaign.create({
      data: {
        profileId, name: 'Phoenix Cash Buyer Outreach', market: 'Phoenix, AZ',
        status: 'COMPLETED', mode: 'AI', channel: 'VOICE',
        scriptTemplate: 'standard_qualification',
        agentName: 'Alex', companyName: 'DealFlow Properties',
        totalBuyers: 15, callsCompleted: 12, qualified: 4, notBuying: 3, noAnswer: 5,
        totalTalkTime: 1840,
        estimatedCost: 18.75, actualCost: 15.60,
        startedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.campaign.create({
      data: {
        profileId, name: 'Dallas Investor Follow-Up', market: 'Dallas, TX',
        status: 'COMPLETED', mode: 'AI', channel: 'VOICE',
        scriptTemplate: 'follow_up',
        agentName: 'Jordan', companyName: 'DealFlow Properties',
        totalBuyers: 8, callsCompleted: 7, qualified: 3, notBuying: 1, noAnswer: 3,
        totalTalkTime: 1260,
        estimatedCost: 10.00, actualCost: 8.75,
        startedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.campaign.create({
      data: {
        profileId, name: 'Tampa Deal Alert', market: 'Tampa, FL',
        status: 'RUNNING', mode: 'AI', channel: 'MULTI_CHANNEL',
        scriptTemplate: 'deal_alert',
        agentName: 'Alex', companyName: 'DealFlow Properties',
        totalBuyers: 10, callsCompleted: 4, qualified: 2, notBuying: 0, noAnswer: 2,
        totalTalkTime: 480,
        estimatedCost: 12.50, actualCost: 5.00,
        startedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.campaign.create({
      data: {
        profileId, name: 'Houston New Leads', market: 'Houston, TX',
        status: 'DRAFT', mode: 'AI', channel: 'VOICE',
        scriptTemplate: 'standard_qualification',
        agentName: 'Jordan',
        totalBuyers: 0, callsCompleted: 0, qualified: 0, notBuying: 0, noAnswer: 0,
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
    }),
  ])

  // Create demo campaign calls linked to buyers and campaigns
  const campaignCalls = await Promise.all([
    // Phoenix campaign calls
    prisma.campaignCall.create({
      data: {
        campaignId: campaigns[0].id, buyerId: buyers[0].id,
        phoneNumber: '(602) 555-0101', outcome: 'QUALIFIED', durationSecs: 245,
        aiSummary: 'Buyer confirmed interest in Phoenix SFRs under $200K. Prefers fix-and-flip, can close in 14 days cash. Wants to see the Oak Street property.',
        transcript: '[DEMO] AI: Hi Marcus, this is Alex calling from DealFlow Properties... Buyer: Yes, I\'m definitely still buying in Phoenix...',
        attemptNumber: 1,
        startedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        endedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 245 * 1000),
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.campaignCall.create({
      data: {
        campaignId: campaigns[0].id, buyerId: buyers[1].id,
        phoneNumber: '(214) 555-0202', outcome: 'QUALIFIED', durationSecs: 189,
        aiSummary: 'Interested in multi-family properties. Currently looking to expand portfolio in DFW and Phoenix markets.',
        attemptNumber: 1,
        startedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 300 * 1000),
        endedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 489 * 1000),
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.campaignCall.create({
      data: {
        campaignId: campaigns[0].id, buyerId: buyers[2].id,
        phoneNumber: '(470) 555-0303', outcome: 'NOT_BUYING', durationSecs: 95,
        aiSummary: 'Not currently buying. Focused on selling existing portfolio. Asked to be contacted again in Q3.',
        attemptNumber: 1,
        startedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 600 * 1000),
        endedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 695 * 1000),
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.campaignCall.create({
      data: {
        campaignId: campaigns[0].id, buyerId: buyers[3].id,
        phoneNumber: '(813) 555-0404', outcome: 'NO_ANSWER', durationSecs: 0,
        attemptNumber: 1,
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.campaignCall.create({
      data: {
        campaignId: campaigns[0].id, buyerId: buyers[4].id,
        phoneNumber: '(713) 555-0505', outcome: 'VOICEMAIL', durationSecs: 32,
        aiSummary: 'Left voicemail about Phoenix investment opportunity.',
        attemptNumber: 1,
        startedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 900 * 1000),
        endedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 932 * 1000),
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
    }),
    // Dallas campaign calls
    prisma.campaignCall.create({
      data: {
        campaignId: campaigns[1].id, buyerId: buyers[1].id,
        phoneNumber: '(214) 555-0202', outcome: 'QUALIFIED', durationSecs: 312,
        aiSummary: 'Follow-up successful. Buyer wants to see 456 Maple Ave. Ready to make offer this week. Budget up to $160K.',
        transcript: '[DEMO] AI: Hi Sarah, this is Jordan following up from DealFlow Properties... Buyer: Yes, I remember, I\'d love to see that Dallas property...',
        attemptNumber: 1,
        startedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        endedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 312 * 1000),
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.campaignCall.create({
      data: {
        campaignId: campaigns[1].id, buyerId: buyers[5].id,
        phoneNumber: '(713) 555-0606', outcome: 'CALLBACK_REQUESTED', durationSecs: 68,
        aiSummary: 'Buyer busy, requested callback Thursday afternoon. Expressed interest in Texas deals.',
        attemptNumber: 1,
        startedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 400 * 1000),
        endedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 468 * 1000),
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.campaignCall.create({
      data: {
        campaignId: campaigns[1].id, buyerId: buyers[6].id,
        phoneNumber: '(480) 555-0707', outcome: 'QUALIFIED', durationSecs: 198,
        aiSummary: 'Very interested in DFW market. Looking for SFR and small multi-family. Can close cash in 10 days.',
        attemptNumber: 1,
        startedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 600 * 1000),
        endedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 798 * 1000),
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
    }),
    // Tampa campaign calls (running)
    prisma.campaignCall.create({
      data: {
        campaignId: campaigns[2].id, buyerId: buyers[3].id,
        phoneNumber: '(813) 555-0404', outcome: 'QUALIFIED', durationSecs: 275,
        aiSummary: 'Highly interested in Tampa deal alert. Wants the Cedar Lane property details sent over. Pre-approved for $350K.',
        transcript: '[DEMO] AI: Hi David, this is Alex from DealFlow Properties with a new deal alert in Tampa... Buyer: Oh great, tell me more about it...',
        attemptNumber: 1,
        startedAt: new Date(Date.now() - 50 * 60 * 1000),
        endedAt: new Date(Date.now() - 45 * 60 * 1000),
        createdAt: new Date(Date.now() - 50 * 60 * 1000),
      },
    }),
    prisma.campaignCall.create({
      data: {
        campaignId: campaigns[2].id, buyerId: buyers[7].id,
        phoneNumber: '(407) 555-0808', outcome: 'NO_ANSWER', durationSecs: 0,
        attemptNumber: 1,
        createdAt: new Date(Date.now() - 40 * 60 * 1000),
      },
    }),
  ])

  // Create demo campaign templates
  const templates = await Promise.all([
    prisma.campaignTemplate.create({
      data: {
        profileId, name: 'Cash Buyer Qualification',
        description: 'Qualify cash buyers by confirming their buying criteria, budget, and timeline.',
        category: 'qualification', channel: 'VOICE',
        scriptTemplate: 'standard_qualification', useCount: 3,
        lastUsedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.campaignTemplate.create({
      data: {
        profileId, name: 'New Deal Alert',
        description: 'Notify matching buyers about a new wholesale deal opportunity.',
        category: 'deal_alert', channel: 'MULTI_CHANNEL',
        scriptTemplate: 'deal_alert', useCount: 1,
        lastUsedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.campaignTemplate.create({
      data: {
        profileId, name: 'Dormant Buyer Reactivation',
        description: 'Re-engage buyers who haven\'t been contacted in 30+ days.',
        category: 'reactivation', channel: 'VOICE',
        scriptTemplate: 'reactivation', useCount: 0,
      },
    }),
  ])

  // Store demo record IDs in profile settings
  const demoData = {
    dealIds: deals.map((d) => d.id),
    buyerIds: buyers.map((b) => b.id),
    postIds: posts.map((p) => p.id),
    groupIds: groups.map((g) => g.id),
    notificationIds: notifications.map((n) => n.id),
    activityIds: activities.map((a) => a.id),
    campaignIds: campaigns.map((c) => c.id),
    campaignCallIds: campaignCalls.map((c) => c.id),
    templateIds: templates.map((t) => t.id),
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
    notificationIds?: string[]
    activityIds?: string[]
    campaignIds?: string[]
    campaignCallIds?: string[]
    templateIds?: string[]
  } | undefined

  if (!demoData) {
    return { cleared: false, message: 'No demo data found' }
  }

  // Delete campaign calls first (foreign key to campaigns and buyers)
  if (demoData.campaignCallIds?.length) {
    await prisma.campaignCall.deleteMany({ where: { id: { in: demoData.campaignCallIds } } })
  }

  // Delete remaining records in parallel
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
    demoData.notificationIds?.length
      ? prisma.notification.deleteMany({
          where: { id: { in: demoData.notificationIds } },
        })
      : Promise.resolve(),
    demoData.activityIds?.length
      ? prisma.activityLog.deleteMany({
          where: { id: { in: demoData.activityIds } },
        })
      : Promise.resolve(),
    demoData.campaignIds?.length
      ? prisma.campaign.deleteMany({
          where: { id: { in: demoData.campaignIds } },
        })
      : Promise.resolve(),
    demoData.templateIds?.length
      ? prisma.campaignTemplate.deleteMany({
          where: { id: { in: demoData.templateIds } },
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
