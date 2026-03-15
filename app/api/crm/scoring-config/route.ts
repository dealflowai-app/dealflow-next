import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthProfile } from '@/lib/auth'
import {
  resolveWeights,
  resolveThresholds,
  resolveDecay,
  dbConfigToScoringConfig,
} from '@/lib/scoring'

/**
 * GET /api/crm/scoring-config
 * Returns the user's scoring configuration with defaults filled in.
 */
export async function GET() {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const dbConfig = await prisma.scoringConfig.findUnique({
      where: { profileId: profile.id },
    })

    const config = dbConfigToScoringConfig(dbConfig)

    return NextResponse.json({
      hasCustomConfig: !!dbConfig,
      weights: resolveWeights(config),
      thresholds: resolveThresholds(config),
      decay: resolveDecay(config),
      customTags: config?.customTags ?? [],
      raw: dbConfig,
    })
  } catch (err) {
    console.error('GET /api/crm/scoring-config error:', err)
    return NextResponse.json({ error: 'Failed to fetch scoring config' }, { status: 500 })
  }
}

const WEIGHT_FIELDS = [
  'weightTransaction', 'weightRecency', 'weightResponsiveness',
  'weightCompleteness', 'weightEngagement', 'weightClosing',
] as const

const THRESHOLD_FIELDS = [
  'highConfidenceMinScore', 'highConfidenceMaxDays', 'recentlyVerifiedMaxDays',
  'dormantMinDays', 'dormantMaxScore', 'activeMinScore',
] as const

const DECAY_FIELDS = [
  'decay30to60', 'decay60to90', 'decay90to180', 'decay180plus',
] as const

/**
 * PUT /api/crm/scoring-config
 * Create or update the user's scoring configuration.
 *
 * Body can include any combination of:
 * - weights: { transaction, recency, responsiveness, completeness, engagement, closing }
 * - thresholds: { highConfidenceMinScore, highConfidenceMaxDays, ... }
 * - decay: { decay30to60, decay60to90, decay90to180, decay180plus }
 * - customTags: [{ tag, label, scoreBonus }]
 * - reset: true  — resets all config to system defaults
 */
export async function PUT(req: NextRequest) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const body = await req.json()

    // Reset to defaults
    if (body.reset === true) {
      await prisma.scoringConfig.deleteMany({
        where: { profileId: profile.id },
      })
      const config = dbConfigToScoringConfig(null)
      return NextResponse.json({
        hasCustomConfig: false,
        weights: resolveWeights(config),
        thresholds: resolveThresholds(config),
        decay: resolveDecay(config),
        customTags: [],
        message: 'Scoring config reset to system defaults',
      })
    }

    // Build update data
    const data: Record<string, unknown> = {}

    // Map friendly weight names to DB columns
    if (body.weights) {
      const w = body.weights
      if (w.transaction != null) data.weightTransaction = w.transaction
      if (w.recency != null) data.weightRecency = w.recency
      if (w.responsiveness != null) data.weightResponsiveness = w.responsiveness
      if (w.completeness != null) data.weightCompleteness = w.completeness
      if (w.engagement != null) data.weightEngagement = w.engagement
      if (w.closing != null) data.weightClosing = w.closing

      // Validate weights sum to 100
      const weightKeys = ['weightTransaction', 'weightRecency', 'weightResponsiveness',
        'weightCompleteness', 'weightEngagement', 'weightClosing'] as const

      // Merge with existing config to get full picture
      const existing = await prisma.scoringConfig.findUnique({
        where: { profileId: profile.id },
      })

      const merged = {
        weightTransaction: (data.weightTransaction ?? existing?.weightTransaction ?? 25) as number,
        weightRecency: (data.weightRecency ?? existing?.weightRecency ?? 20) as number,
        weightResponsiveness: (data.weightResponsiveness ?? existing?.weightResponsiveness ?? 20) as number,
        weightCompleteness: (data.weightCompleteness ?? existing?.weightCompleteness ?? 15) as number,
        weightEngagement: (data.weightEngagement ?? existing?.weightEngagement ?? 10) as number,
        weightClosing: (data.weightClosing ?? existing?.weightClosing ?? 10) as number,
      }

      const sum = Object.values(merged).reduce((a, b) => a + b, 0)
      if (sum !== 100) {
        return NextResponse.json(
          { error: `Weights must sum to 100, got ${sum}`, current: merged },
          { status: 400 },
        )
      }
    }

    // Thresholds
    if (body.thresholds) {
      const t = body.thresholds
      if (t.highConfidenceMinScore != null) data.highConfidenceMinScore = t.highConfidenceMinScore
      if (t.highConfidenceMaxDays != null) data.highConfidenceMaxDays = t.highConfidenceMaxDays
      if (t.recentlyVerifiedMaxDays != null) data.recentlyVerifiedMaxDays = t.recentlyVerifiedMaxDays
      if (t.dormantMinDays != null) data.dormantMinDays = t.dormantMinDays
      if (t.dormantMaxScore != null) data.dormantMaxScore = t.dormantMaxScore
      if (t.activeMinScore != null) data.activeMinScore = t.activeMinScore
    }

    // Decay
    if (body.decay) {
      const d = body.decay
      if (d.decay30to60 != null) data.decay30to60 = d.decay30to60
      if (d.decay60to90 != null) data.decay60to90 = d.decay60to90
      if (d.decay90to180 != null) data.decay90to180 = d.decay90to180
      if (d.decay180plus != null) data.decay180plus = d.decay180plus

      // Validate decay values are 0-1
      for (const key of DECAY_FIELDS) {
        if (data[key] != null) {
          const val = data[key] as number
          if (val < 0 || val > 1) {
            return NextResponse.json(
              { error: `${key} must be between 0 and 1, got ${val}` },
              { status: 400 },
            )
          }
        }
      }
    }

    // Custom tags
    if (body.customTags != null) {
      if (!Array.isArray(body.customTags)) {
        return NextResponse.json(
          { error: 'customTags must be an array of { tag, label, scoreBonus }' },
          { status: 400 },
        )
      }
      // Validate each tag
      for (const tag of body.customTags) {
        if (!tag.tag || !tag.label || typeof tag.scoreBonus !== 'number') {
          return NextResponse.json(
            { error: 'Each custom tag must have tag (string), label (string), and scoreBonus (number)' },
            { status: 400 },
          )
        }
        if (tag.scoreBonus < -50 || tag.scoreBonus > 50) {
          return NextResponse.json(
            { error: `scoreBonus for "${tag.tag}" must be between -50 and 50` },
            { status: 400 },
          )
        }
      }
      data.customTags = body.customTags
    }

    const dbConfig = await prisma.scoringConfig.upsert({
      where: { profileId: profile.id },
      create: {
        profileId: profile.id,
        ...data,
      },
      update: data,
    })

    const config = dbConfigToScoringConfig(dbConfig)

    return NextResponse.json({
      hasCustomConfig: true,
      weights: resolveWeights(config),
      thresholds: resolveThresholds(config),
      decay: resolveDecay(config),
      customTags: config?.customTags ?? [],
    })
  } catch (err) {
    console.error('PUT /api/crm/scoring-config error:', err)
    return NextResponse.json({ error: 'Failed to update scoring config' }, { status: 500 })
  }
}
