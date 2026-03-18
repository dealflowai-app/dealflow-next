// ─── System Voicemail Templates ──────────────────────────────────────────────
// Pre-built voicemail scripts for common wholesaling scenarios.
// These are text-based templates that can be used as TTS or Bland AI instructions.

export interface VoicemailTemplate {
  id: string
  name: string
  category: string
  ttsText: string
  estimatedDuration: number // seconds
  bestFor: string
}

// Merge fields: {{buyerName}}, {{agentName}}, {{companyName}}, {{market}},
//               {{callbackNumber}}, {{propertyType}}

const SYSTEM_VOICEMAIL_TEMPLATES: VoicemailTemplate[] = [
  {
    id: 'vm_introduction',
    name: 'Introduction',
    category: 'introduction',
    ttsText:
      'Hey {{buyerName}}, this is {{agentName}} from {{companyName}}. ' +
      "I'm reaching out because we work with cash buyers and investors in the {{market}} area, " +
      "and I think we might have some deals that fit what you're looking for. " +
      "Give me a call back at {{callbackNumber}} when you get a chance. " +
      "Again, that's {{agentName}} from {{companyName}}, {{callbackNumber}}. Talk soon.",
    estimatedDuration: 20,
    bestFor: 'First-time outreach to new buyer leads',
  },
  {
    id: 'vm_deal_alert',
    name: 'Deal Alert',
    category: 'deal_alert',
    ttsText:
      'Hey {{buyerName}}, {{agentName}} from {{companyName}}. ' +
      "Quick message — I just locked up a {{propertyType}} in {{market}} that I think is right in your wheelhouse. " +
      "It's priced well below market and the numbers look solid. " +
      'Call me back at {{callbackNumber}} if you want the details before I send it out to my full list. ' +
      "That's {{callbackNumber}}. Thanks.",
    estimatedDuration: 22,
    bestFor: 'Hot deal notifications to active buyers',
  },
  {
    id: 'vm_follow_up',
    name: 'Follow Up',
    category: 'follow_up',
    ttsText:
      "Hey {{buyerName}}, it's {{agentName}} from {{companyName}} again. " +
      "Just following up from my last call. I've got a few properties that match what investors like you " +
      'are looking for in {{market}}. Would love to connect for two minutes and see if any of them work for you. ' +
      'Call me at {{callbackNumber}}. Hope to hear from you.',
    estimatedDuration: 18,
    bestFor: 'Second or third attempt follow-ups',
  },
  {
    id: 'vm_reactivation',
    name: 'Reactivation',
    category: 'reactivation',
    ttsText:
      "Hi {{buyerName}}, {{agentName}} here from {{companyName}}. " +
      "It's been a while since we connected and I wanted to check in. " +
      "The {{market}} market has been moving and I've got some new inventory that might interest you. " +
      "If you're still picking up investment properties, give me a ring at {{callbackNumber}}. " +
      'No pressure either way. Talk soon.',
    estimatedDuration: 20,
    bestFor: 'Re-engaging dormant or inactive buyers',
  },
  {
    id: 'vm_urgency',
    name: 'Urgency',
    category: 'deal_alert',
    ttsText:
      "{{buyerName}}, hey it's {{agentName}} from {{companyName}}. " +
      "I've got a deal under contract right now that's going fast — it's a {{propertyType}} in {{market}} " +
      "with a solid spread. I'm reaching out to my top buyers first before I blast it out. " +
      'Call me back today at {{callbackNumber}} if you want first look. {{callbackNumber}}. Thanks.',
    estimatedDuration: 20,
    bestFor: 'Time-sensitive deals needing quick response',
  },
]

/**
 * Return all system voicemail templates.
 */
export function getVoicemailTemplates(): VoicemailTemplate[] {
  return SYSTEM_VOICEMAIL_TEMPLATES
}

/**
 * Return a single system template by ID.
 */
export function getVoicemailTemplate(id: string): VoicemailTemplate | undefined {
  return SYSTEM_VOICEMAIL_TEMPLATES.find(t => t.id === id)
}

/**
 * Check whether a template ID is a system template.
 */
export function isSystemVoicemailTemplate(id: string): boolean {
  return SYSTEM_VOICEMAIL_TEMPLATES.some(t => t.id === id)
}

export interface VoicemailMergeData {
  buyerName?: string
  agentName?: string
  companyName?: string
  market?: string
  callbackNumber?: string
  propertyType?: string
}

/**
 * Merge placeholder fields into a voicemail template text.
 * Unknown placeholders are replaced with sensible defaults.
 */
export function mergeVoicemailTemplate(text: string, data: VoicemailMergeData): string {
  const defaults: VoicemailMergeData = {
    buyerName: 'there',
    agentName: 'your contact',
    companyName: 'our company',
    market: 'your area',
    callbackNumber: 'the number on your caller ID',
    propertyType: 'property',
  }
  const merged = { ...defaults, ...data }
  return text
    .replace(/\{\{buyerName\}\}/g, merged.buyerName!)
    .replace(/\{\{agentName\}\}/g, merged.agentName!)
    .replace(/\{\{companyName\}\}/g, merged.companyName!)
    .replace(/\{\{market\}\}/g, merged.market!)
    .replace(/\{\{callbackNumber\}\}/g, merged.callbackNumber!)
    .replace(/\{\{propertyType\}\}/g, merged.propertyType!)
}

/**
 * Suggest the best system voicemail template for a given campaign script template.
 */
export function getDefaultVoicemailForScript(scriptTemplate: string | null): VoicemailTemplate {
  const map: Record<string, string> = {
    standard_qualification: 'vm_introduction',
    deal_alert: 'vm_deal_alert',
    reactivation: 'vm_reactivation',
    follow_up: 'vm_follow_up',
    verification: 'vm_follow_up',
  }
  const id = map[scriptTemplate || ''] || 'vm_introduction'
  return SYSTEM_VOICEMAIL_TEMPLATES.find(t => t.id === id) || SYSTEM_VOICEMAIL_TEMPLATES[0]
}
