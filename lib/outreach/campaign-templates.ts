// ─── Campaign Templates & Playbooks ──────────────────────────────────────────
// System templates available to all users. User-created templates live in the DB.

import type { AudienceFilter } from './audience-builder'

export interface SystemTemplate {
  id: string
  name: string
  description: string
  category: string
  icon: string
  channel: string
  scriptTemplate: string | null
  smsTemplateId: string | null
  emailSequenceId: string | null
  audienceFilter: Partial<AudienceFilter>
  settings: Record<string, unknown>
  multiChannelConfig?: Record<string, unknown>
  estimatedDuration: string
  bestFor: string
  expectedResults: string
}

const SYSTEM_TEMPLATES: SystemTemplate[] = [
  {
    id: 'sys_new_market_entry',
    name: 'New Market Entry',
    description: 'Find and qualify cash buyers in a new market',
    category: 'qualification',
    icon: 'compass',
    channel: 'VOICE',
    scriptTemplate: 'standard_qualification',
    smsTemplateId: null,
    emailSequenceId: null,
    audienceFilter: {
      hasPhone: true,
    },
    settings: {
      maxConcurrentCalls: 5,
      callingHoursStart: '09:00',
      callingHoursEnd: '19:00',
      timezone: 'America/New_York',
      leaveVoicemail: true,
      maxRetries: 2,
      retryDelayHours: 24,
    },
    estimatedDuration: '3-5 days',
    bestFor: 'Entering a new city and building your buyer list from scratch',
    expectedResults: 'Qualifies 15-25% of buyers, builds your CRM with fresh preferences',
  },
  {
    id: 'sys_deal_blast',
    name: 'Deal Blast',
    description: 'Blast a hot deal to your best buyers across all channels',
    category: 'deal_alert',
    icon: 'zap',
    channel: 'MULTI_CHANNEL',
    scriptTemplate: 'deal_alert',
    smsTemplateId: 'deal_alert',
    emailSequenceId: 'deal_alert',
    audienceFilter: {
      statuses: ['ACTIVE', 'HIGH_CONFIDENCE'],
      minScore: 50,
      hasPhone: true,
    },
    settings: {
      maxConcurrentCalls: 10,
      callingHoursStart: '09:00',
      callingHoursEnd: '20:00',
      timezone: 'America/New_York',
      leaveVoicemail: true,
      maxRetries: 1,
      retryDelayHours: 4,
    },
    multiChannelConfig: {
      primaryChannel: 'voice',
      fallbackSequence: [
        { channel: 'sms', triggerOn: 'no_answer', delayHours: 1 },
        { channel: 'email', triggerOn: 'no_response', delayHours: 4 },
      ],
      waitBetweenChannels: 1,
    },
    estimatedDuration: '1-2 days',
    bestFor: 'You have a hot deal and need to move it fast',
    expectedResults: 'Reaches 80%+ of your buyer list within 24 hours',
  },
  {
    id: 'sys_dormant_reactivation',
    name: 'Dormant Reactivation',
    description: 'Re-engage buyers who went cold or stopped responding',
    category: 'reactivation',
    icon: 'refresh-cw',
    channel: 'VOICE',
    scriptTemplate: 'reactivation',
    smsTemplateId: null,
    emailSequenceId: null,
    audienceFilter: {
      statuses: ['DORMANT', 'INACTIVE'],
      excludeRecentlyContacted: 90,
      hasPhone: true,
    },
    settings: {
      maxConcurrentCalls: 3,
      callingHoursStart: '10:00',
      callingHoursEnd: '18:00',
      timezone: 'America/New_York',
      leaveVoicemail: true,
      maxRetries: 2,
      retryDelayHours: 48,
    },
    estimatedDuration: '5-7 days',
    bestFor: 'Re-engaging buyers who went cold',
    expectedResults: 'Reactivates 10-15% of dormant buyers',
  },
  {
    id: 'sys_follow_up_sequence',
    name: 'Follow-Up Sequence',
    description: 'Nurture warm leads with a multi-touch follow-up cadence',
    category: 'follow_up',
    icon: 'repeat',
    channel: 'MULTI_CHANNEL',
    scriptTemplate: 'follow_up',
    smsTemplateId: 'follow_up',
    emailSequenceId: 'qualification',
    audienceFilter: {
      statuses: ['ACTIVE', 'HIGH_CONFIDENCE'],
      lastContactedAfter: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      hasPhone: true,
    },
    settings: {
      maxConcurrentCalls: 3,
      callingHoursStart: '10:00',
      callingHoursEnd: '18:00',
      timezone: 'America/New_York',
      leaveVoicemail: true,
      maxRetries: 3,
      retryDelayHours: 48,
    },
    multiChannelConfig: {
      primaryChannel: 'voice',
      fallbackSequence: [
        { channel: 'sms', triggerOn: 'no_answer', delayHours: 48 },
        { channel: 'email', triggerOn: 'no_response', delayHours: 48 },
        { channel: 'voice', triggerOn: 'no_response', delayHours: 48 },
      ],
      waitBetweenChannels: 48,
    },
    estimatedDuration: '7-10 days',
    bestFor: 'Nurturing warm leads who need another touch',
    expectedResults: 'Converts 20-30% of callbacks to qualified',
  },
  {
    id: 'sys_proof_of_funds',
    name: 'Proof of Funds Check',
    description: 'Verify your best buyers can actually close deals',
    category: 'verification',
    icon: 'shield-check',
    channel: 'VOICE',
    scriptTemplate: 'proof_of_funds',
    smsTemplateId: null,
    emailSequenceId: null,
    audienceFilter: {
      statuses: ['ACTIVE', 'HIGH_CONFIDENCE'],
      minScore: 70,
      hasPhone: true,
    },
    settings: {
      maxConcurrentCalls: 3,
      callingHoursStart: '09:00',
      callingHoursEnd: '17:00',
      timezone: 'America/New_York',
      leaveVoicemail: false,
      maxRetries: 2,
      retryDelayHours: 24,
    },
    estimatedDuration: '2-4 days',
    bestFor: 'Verifying your best buyers can actually close',
    expectedResults: 'Verifies 60-70% of high-confidence buyers',
  },
  {
    id: 'sys_sms_quick_blast',
    name: 'SMS Quick Blast',
    description: 'Quick text blast for deal alerts or market pulse checks',
    category: 'deal_alert',
    icon: 'message-square',
    channel: 'SMS',
    scriptTemplate: null,
    smsTemplateId: 'deal_alert',
    emailSequenceId: null,
    audienceFilter: {
      statuses: ['ACTIVE', 'HIGH_CONFIDENCE', 'NEW'],
      hasPhone: true,
    },
    settings: {
      maxConcurrentCalls: 20,
      maxRetries: 0,
      retryDelayHours: 0,
    },
    estimatedDuration: '1 day',
    bestFor: 'Quick market pulse or deal notification without calling',
    expectedResults: '5-15% response rate, instant delivery',
  },
  {
    id: 'sys_email_nurture_drip',
    name: 'Email Nurture Drip',
    description: 'Long-term email nurture sequence to stay top of mind',
    category: 'follow_up',
    icon: 'mail',
    channel: 'EMAIL',
    scriptTemplate: null,
    smsTemplateId: null,
    emailSequenceId: 'nurture',
    audienceFilter: {
      hasEmail: true,
    },
    settings: {
      maxRetries: 0,
      retryDelayHours: 0,
    },
    estimatedDuration: '14 days',
    bestFor: 'Long-term relationship building with your buyer list',
    expectedResults: 'Keeps you top of mind, 2-5% convert per drip cycle',
  },
]

/** Get all system templates. These are code-defined and always available. */
export function getSystemTemplates(): SystemTemplate[] {
  return SYSTEM_TEMPLATES
}

/** Get a single system template by ID. */
export function getSystemTemplate(id: string): SystemTemplate | undefined {
  return SYSTEM_TEMPLATES.find(t => t.id === id)
}

/** Check if an ID is a system template. */
export function isSystemTemplate(id: string): boolean {
  return id.startsWith('sys_')
}

/** Suggest templates based on user's data. Returns up to 3 suggestions with reasons. */
export function suggestTemplates(context: {
  totalBuyers: number
  dormantBuyers: number
  activeCampaigns: number
  hasDeals: boolean
  recentCallbacks: number
}): { template: SystemTemplate; reason: string }[] {
  const suggestions: { template: SystemTemplate; reason: string; priority: number }[] = []

  if (context.activeCampaigns === 0 && context.totalBuyers > 0) {
    suggestions.push({
      template: SYSTEM_TEMPLATES[0], // New Market Entry
      reason: `You have ${context.totalBuyers} buyers ready to qualify`,
      priority: 1,
    })
  }

  if (context.hasDeals) {
    suggestions.push({
      template: SYSTEM_TEMPLATES[1], // Deal Blast
      reason: 'You have active deals — blast them to your best buyers',
      priority: 2,
    })
  }

  if (context.dormantBuyers > 10) {
    suggestions.push({
      template: SYSTEM_TEMPLATES[2], // Dormant Reactivation
      reason: `You have ${context.dormantBuyers} dormant buyers to reactivate`,
      priority: 3,
    })
  }

  if (context.recentCallbacks > 0) {
    suggestions.push({
      template: SYSTEM_TEMPLATES[3], // Follow-Up Sequence
      reason: `${context.recentCallbacks} buyers requested a callback — follow up now`,
      priority: 2,
    })
  }

  // If no suggestions, offer defaults
  if (suggestions.length === 0) {
    suggestions.push({
      template: SYSTEM_TEMPLATES[0],
      reason: 'Start with a qualification campaign to build your buyer list',
      priority: 1,
    })
    suggestions.push({
      template: SYSTEM_TEMPLATES[5],
      reason: 'Send a quick SMS blast to gauge market interest',
      priority: 2,
    })
  }

  return suggestions
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 3)
    .map(({ template, reason }) => ({ template, reason }))
}
