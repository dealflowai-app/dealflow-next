/**
 * Referral System
 *
 * Handles referral code generation, signup processing, and stats.
 */

import { prisma } from '@/lib/prisma'

const CODE_LENGTH = 8
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no ambiguous chars (0/O, 1/I)

function randomCode(): string {
  let code = ''
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  }
  return code
}

/**
 * Generate a unique 8-char referral code for a profile.
 * If the profile already has a code, returns the existing one.
 */
export async function generateReferralCode(profileId: string): Promise<string> {
  // Check if profile already has a referral code
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { referralCode: true },
  })

  if (profile?.referralCode) {
    return profile.referralCode
  }

  // Generate a unique code with retry logic
  let code: string
  let attempts = 0
  const MAX_ATTEMPTS = 10

  while (attempts < MAX_ATTEMPTS) {
    code = randomCode()
    const existing = await prisma.profile.findUnique({
      where: { referralCode: code },
      select: { id: true },
    })

    if (!existing) {
      // Save the code to the profile
      await prisma.profile.update({
        where: { id: profileId },
        data: { referralCode: code },
      })
      return code
    }

    attempts++
  }

  throw new Error('Failed to generate a unique referral code after maximum attempts')
}

/**
 * Process a referral signup: link the referral record to the new user
 * and assign rewards to both the referrer and the referred user.
 */
export async function processReferralSignup(
  referralCode: string,
  newProfileId: string,
): Promise<{ success: boolean; error?: string }> {
  // Find the referral record by code
  const referral = await prisma.referral.findFirst({
    where: { code: referralCode, status: 'PENDING' },
    include: { referrer: { select: { id: true, tier: true } } },
  })

  if (!referral) {
    // Could also be a profile-level referral code (direct link share, no invite sent)
    const referrerProfile = await prisma.profile.findUnique({
      where: { referralCode },
      select: { id: true, tier: true },
    })

    if (!referrerProfile) {
      return { success: false, error: 'Invalid referral code' }
    }

    // Prevent self-referral
    if (referrerProfile.id === newProfileId) {
      return { success: false, error: 'Cannot refer yourself' }
    }

    // Create a referral record for tracking
    const newProfile = await prisma.profile.findUnique({
      where: { id: newProfileId },
      select: { email: true },
    })

    await prisma.referral.create({
      data: {
        referrerId: referrerProfile.id,
        referredEmail: newProfile?.email || '',
        referredId: newProfileId,
        code: referralCode,
        status: 'SIGNED_UP',
        reward: '7_DAY_EXTENSION',
      },
    })

    return { success: true }
  }

  // Prevent self-referral
  if (referral.referrerId === newProfileId) {
    return { success: false, error: 'Cannot refer yourself' }
  }

  // Update the existing referral record
  await prisma.referral.update({
    where: { id: referral.id },
    data: {
      referredId: newProfileId,
      status: 'SIGNED_UP',
      reward: '7_DAY_EXTENSION',
    },
  })

  return { success: true }
}

export interface ReferralStats {
  total: number
  pending: number
  signedUp: number
  converted: number
  rewards: {
    earned: number
    pending: number
    claimed: number
  }
}

/**
 * Get referral statistics for a profile.
 */
export async function getReferralStats(profileId: string): Promise<ReferralStats> {
  const referrals = await prisma.referral.findMany({
    where: { referrerId: profileId },
    select: {
      status: true,
      reward: true,
      rewardClaimed: true,
    },
  })

  const stats: ReferralStats = {
    total: referrals.length,
    pending: 0,
    signedUp: 0,
    converted: 0,
    rewards: {
      earned: 0,
      pending: 0,
      claimed: 0,
    },
  }

  for (const ref of referrals) {
    switch (ref.status) {
      case 'PENDING':
        stats.pending++
        break
      case 'SIGNED_UP':
        stats.signedUp++
        break
      case 'CONVERTED':
        stats.converted++
        break
    }

    if (ref.reward) {
      stats.rewards.earned++
      if (ref.rewardClaimed) {
        stats.rewards.claimed++
      } else {
        stats.rewards.pending++
      }
    }
  }

  return stats
}

/**
 * Get the list of referrals for a profile (for display).
 */
export async function getReferralList(profileId: string) {
  return prisma.referral.findMany({
    where: { referrerId: profileId },
    select: {
      id: true,
      referredEmail: true,
      status: true,
      reward: true,
      rewardClaimed: true,
      createdAt: true,
      convertedAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
}
