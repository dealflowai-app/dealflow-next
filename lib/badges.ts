import { prisma } from '@/lib/prisma'

export type BadgeType =
  | 'FIRST_DEAL'
  | 'FIVE_DEALS'
  | 'FIRST_BUYER'
  | 'TEN_BUYERS'
  | 'FIFTY_BUYERS'
  | 'FIRST_CAMPAIGN'
  | 'DEAL_CLOSED'
  | 'FIRST_POST'
  | 'ANALYZER_PRO'
  | 'EARLY_ADOPTER'

export type BadgeDefinition = {
  name: string
  description: string
  icon: string
  threshold?: number
  counterLabel?: string
}

export const BADGE_DEFINITIONS: Record<BadgeType, BadgeDefinition> = {
  FIRST_DEAL:     { name: 'First Deal',        description: 'Created your first deal',         icon: '\uD83C\uDFE0', threshold: 1,  counterLabel: 'deal' },
  FIVE_DEALS:     { name: 'Deal Maker',         description: 'Created 5 deals',                 icon: '\uD83C\uDFD8\uFE0F',  threshold: 5,  counterLabel: 'deals' },
  FIRST_BUYER:    { name: 'Network Starter',     description: 'Added your first buyer',          icon: '\uD83D\uDC64', threshold: 1,  counterLabel: 'buyer' },
  TEN_BUYERS:     { name: 'Network Builder',     description: 'Added 10 buyers to your list',    icon: '\uD83D\uDC65', threshold: 10, counterLabel: 'buyers' },
  FIFTY_BUYERS:   { name: 'Power Networker',     description: 'Added 50 buyers',                 icon: '\uD83C\uDF10', threshold: 50, counterLabel: 'buyers' },
  FIRST_CAMPAIGN: { name: 'Outreach Pioneer',    description: 'Launched your first campaign',     icon: '\uD83D\uDCE2', threshold: 1,  counterLabel: 'campaign' },
  DEAL_CLOSED:    { name: 'Deal Closer',         description: 'Closed your first deal',           icon: '\uD83E\uDD1D', threshold: 1,  counterLabel: 'closed deal' },
  FIRST_POST:     { name: 'Community Voice',     description: 'Made your first community post',   icon: '\uD83D\uDCAC', threshold: 1,  counterLabel: 'post' },
  ANALYZER_PRO:   { name: 'Analyzer Pro',        description: 'Analyzed 10 properties',           icon: '\uD83D\uDCCA', threshold: 10, counterLabel: 'analyses' },
  EARLY_ADOPTER:  { name: 'Early Adopter',       description: 'Joined during beta',               icon: '\u2B50' },
}

// Map badge types to the counts they depend on
type CountKey = 'deals' | 'buyers' | 'campaigns' | 'closedDeals' | 'posts' | 'analyses'
const BADGE_RULES: { type: BadgeType; countKey: CountKey; threshold: number }[] = [
  { type: 'FIRST_DEAL',     countKey: 'deals',       threshold: 1  },
  { type: 'FIVE_DEALS',     countKey: 'deals',       threshold: 5  },
  { type: 'FIRST_BUYER',    countKey: 'buyers',      threshold: 1  },
  { type: 'TEN_BUYERS',     countKey: 'buyers',      threshold: 10 },
  { type: 'FIFTY_BUYERS',   countKey: 'buyers',      threshold: 50 },
  { type: 'FIRST_CAMPAIGN', countKey: 'campaigns',   threshold: 1  },
  { type: 'DEAL_CLOSED',    countKey: 'closedDeals', threshold: 1  },
  { type: 'FIRST_POST',     countKey: 'posts',       threshold: 1  },
  { type: 'ANALYZER_PRO',   countKey: 'analyses',    threshold: 10 },
]

/**
 * Get current progress counts for badge evaluation.
 */
export async function getBadgeProgress(profileId: string): Promise<Record<CountKey, number>> {
  const [deals, buyers, campaigns, closedDeals, posts, analyses] = await Promise.all([
    prisma.deal.count({ where: { profileId } }),
    prisma.cashBuyer.count({ where: { profileId } }),
    prisma.campaign.count({ where: { profileId } }),
    prisma.deal.count({ where: { profileId, status: 'CLOSED' } }),
    prisma.communityPost.count({ where: { profileId } }),
    prisma.analysisCache.count({ where: { profileId } }),
  ])

  return { deals, buyers, campaigns, closedDeals, posts, analyses }
}

/**
 * Check all badge thresholds and award any newly earned badges.
 * Returns the list of newly awarded badge types.
 */
export async function checkAndAwardBadges(profileId: string): Promise<string[]> {
  const [counts, existingBadges, profile] = await Promise.all([
    getBadgeProgress(profileId),
    prisma.badge.findMany({ where: { profileId }, select: { type: true } }),
    prisma.profile.findUnique({ where: { id: profileId }, select: { createdAt: true } }),
  ])

  const earned = new Set(existingBadges.map(b => b.type))
  const newlyAwarded: string[] = []

  // Check threshold-based badges
  for (const rule of BADGE_RULES) {
    if (!earned.has(rule.type) && counts[rule.countKey] >= rule.threshold) {
      newlyAwarded.push(rule.type)
    }
  }

  // Check EARLY_ADOPTER (joined before 2027-01-01, i.e. during beta period)
  if (!earned.has('EARLY_ADOPTER') && profile) {
    const betaCutoff = new Date('2027-01-01T00:00:00Z')
    if (profile.createdAt < betaCutoff) {
      newlyAwarded.push('EARLY_ADOPTER')
    }
  }

  // Upsert new badges (upsert to avoid race condition duplicates)
  if (newlyAwarded.length > 0) {
    await Promise.all(
      newlyAwarded.map(type =>
        prisma.badge.upsert({
          where: { profileId_type: { profileId, type } },
          create: { profileId, type },
          update: {},
        })
      )
    )
  }

  return newlyAwarded
}

/**
 * Get all badges for a profile, including progress toward unearned badges.
 */
export async function getBadgesWithProgress(profileId: string) {
  const [earnedBadges, counts] = await Promise.all([
    prisma.badge.findMany({ where: { profileId }, orderBy: { earnedAt: 'desc' } }),
    getBadgeProgress(profileId),
  ])

  const earnedMap = new Map(earnedBadges.map(b => [b.type, b]))

  const allBadgeTypes = Object.keys(BADGE_DEFINITIONS) as BadgeType[]

  return allBadgeTypes.map(type => {
    const def = BADGE_DEFINITIONS[type]
    const earned = earnedMap.get(type)
    const rule = BADGE_RULES.find(r => r.type === type)

    // Calculate progress for threshold-based badges
    let progress: number | undefined
    let progressMax: number | undefined
    if (rule && !earned) {
      progress = counts[rule.countKey]
      progressMax = rule.threshold
    }

    return {
      type,
      name: def.name,
      description: def.description,
      icon: def.icon,
      earned: !!earned,
      earnedAt: earned?.earnedAt?.toISOString() ?? null,
      progress: progress ?? null,
      progressMax: progressMax ?? null,
    }
  })
}
