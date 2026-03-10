export interface Market {
  id: string
  name: string
  type: 'city' | 'county' | 'zip'
  state: string
  buyerCount: number
  lastSynced: string | null
}

export interface CashBuyer {
  id: string
  name: string
  entityType: 'individual' | 'llc' | 'corporation' | 'trust'
  phone?: string
  email?: string
  mailingAddress?: string
  cashPurchases12mo: number
  lastPurchaseDate: string
  priceRangeMin: number
  priceRangeMax: number
  propertyTypes: string[]
  contactStatus: 'enriched' | 'needs_enrichment' | 'do_not_call' | 'opted_out'
  activityScore: number
  inCRM: boolean
  aiPreferences?: {
    isActive: boolean
    strategy: 'flip' | 'hold' | 'both'
    closeSpeed: string
    notes: string
    propertyTypes: string[]
    priceMin: number
    priceMax: number
    markets: string[]
    objections: string[]
  }
}

export type CampaignStatus = 'draft' | 'running' | 'paused' | 'completed' | 'cancelled'
export type CallOutcome = 'qualified' | 'not_buying' | 'no_answer' | 'voicemail' | 'callback' | 'do_not_call'

export interface CampaignConfig {
  name: string
  marketName: string
  buyerSource: 'discovery' | 'crm' | 'both'
  buyerCount: number
  scriptTemplate: string
  companyName: string
  agentName: string
  tone: 'professional' | 'conversational'
  mode: 'ai' | 'manual'
  maxConcurrent: number
  callHoursStart: string
  callHoursEnd: string
  voicemailAction: 'leave_message' | 'hang_up'
  retryCount: number
  retryHours: number
  scheduleType: 'now' | 'later' | 'recurring'
  scheduledAt?: string
  complianceAgreed: boolean
}

export interface Campaign extends CampaignConfig {
  id: string
  status: CampaignStatus
  buyersTotal: number
  buyersCalled: number
  callsQualified: number
  callsNotBuying: number
  callsNoAnswer: number
  totalTalkSeconds: number
  startedAt?: string
  completedAt?: string
  createdAt: string
}

export interface TranscriptLine {
  speaker: 'agent' | 'buyer'
  text: string
  timestamp: number
}

export interface LiveCall {
  id: string
  buyerName: string
  buyerPhone: string
  startedAt: number
  status: 'ringing' | 'in_progress' | 'completed'
  outcome?: CallOutcome
  transcript: TranscriptLine[]
  summary?: string
  durationSeconds?: number
}

export interface MarketSuggestion {
  name: string
  state: string
  type: 'city' | 'county' | 'zip'
  estimatedBuyers: number
}
