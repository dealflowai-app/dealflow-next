// ─── Conversation Intelligence Engine ────────────────────────────────────────
// Analyzes call transcripts for sentiment, buying signals, objections,
// competitive mentions, talk ratios, engagement, and script optimization.
//
// Part A: Rule-based analysis — fast (<100ms), runs on every call
// Part B: AI deep analysis — selective, fire-and-forget via Claude Haiku

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { parseTranscript, type TranscriptSegment, type ParsedTranscript } from './transcript-processor'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SentimentAnalysis {
  overall: 'positive' | 'neutral' | 'negative' | 'mixed'
  score: number          // -100 to +100
  arc: Array<{ segment: number; score: number }>
}

export interface BuyingSignal {
  signal: string
  strength: 'strong' | 'moderate' | 'weak'
  quote: string
  segmentId: number
}

export interface BuyingSignalAnalysis {
  signals: BuyingSignal[]
  count: number
  overallIntent: 'high' | 'medium' | 'low' | 'none'
}

export interface Objection {
  objection: string
  category: 'price' | 'trust' | 'timing' | 'competition' | 'other'
  handled: boolean
  response: string
  segmentId: number
}

export interface ObjectionAnalysis {
  objections: Objection[]
  count: number
}

export interface CompetitorMention {
  competitor: string
  context: string
  sentiment: 'positive' | 'neutral' | 'negative'
}

export interface CompetitorAnalysis {
  mentions: CompetitorMention[]
}

export interface TalkMetricAnalysis {
  aiTalkPercent: number
  buyerTalkPercent: number
  idealRatio: boolean
  longestAiMonologue: number
  questionCount: number
}

export interface EngagementAnalysis {
  score: number    // 0-100
  signals: Array<{ signal: string; type: 'positive' | 'negative' }>
}

export interface CallHighlight {
  type: string
  startSegment: number
  endSegment: number
  summary: string
  quote: string
}

export interface ScriptPerformanceAnalysis {
  effectiveness: number | null  // 0-100
  suggestions: Array<{ suggestion: string; reason: string; priority: 'high' | 'medium' | 'low' }>
}

export interface ConversationAnalysis {
  sentiment: SentimentAnalysis
  buyingSignals: BuyingSignalAnalysis
  objections: ObjectionAnalysis
  competitors: CompetitorAnalysis
  talkMetrics: TalkMetricAnalysis
  engagement: EngagementAnalysis
  highlights: CallHighlight[]
  scriptPerformance: ScriptPerformanceAnalysis
}

// ─── Part A: Rule-Based Analysis ─────────────────────────────────────────────

// Sentiment patterns (real estate-specific)
const POSITIVE_PATTERNS: Array<{ re: RegExp; weight: number }> = [
  { re: /\b(sounds good|that works|I like that|let'?s do it|perfect|great|awesome|fantastic)\b/i, weight: 3 },
  { re: /\b(send me (the )?details|send me info|email me|text me the address)\b/i, weight: 4 },
  { re: /\b(interested|definitely|absolutely|for sure|count me in)\b/i, weight: 3 },
  { re: /\b(I('d| would) (love|like) (to|that))\b/i, weight: 2 },
  { re: /\b(good deal|fair price|reasonable|makes sense|the numbers work)\b/i, weight: 3 },
  { re: /\b(yes|yeah|yep|sure thing|okay great)\b/i, weight: 1 },
  { re: /\b(ha(ha)?|lol|that'?s funny)\b/i, weight: 1 },
]

const NEGATIVE_PATTERNS: Array<{ re: RegExp; weight: number }> = [
  { re: /\b(not interested|waste of time|don'?t (bother|call)|stop calling)\b/i, weight: 4 },
  { re: /\b(too (expensive|high|much)|can'?t afford|out of (my )?range|numbers don'?t work)\b/i, weight: 3 },
  { re: /\b(terrible|horrible|annoyed|frustrated|angry|pissed)\b/i, weight: 4 },
  { re: /\b(scam|spam|how did you get my number|illegal)\b/i, weight: 4 },
  { re: /\b(no thanks|not right now|I'?m good|pass|nah)\b/i, weight: 2 },
  { re: /\b(bad (experience|deal)|been burned|ripped off)\b/i, weight: 3 },
  { re: /\b(not buying|paused|pulled back|slowed down|taking a break)\b/i, weight: 3 },
]

export function analyzeSentiment(segments: TranscriptSegment[]): SentimentAnalysis {
  const buyerSegments = segments.filter(s => s.speaker === 'buyer')
  if (buyerSegments.length === 0) {
    return { overall: 'neutral', score: 0, arc: [] }
  }

  const arc: Array<{ segment: number; score: number }> = []
  let totalWeighted = 0
  let totalWeight = 0

  for (let i = 0; i < buyerSegments.length; i++) {
    const seg = buyerSegments[i]
    let segScore = 0

    for (const p of POSITIVE_PATTERNS) {
      const matches = seg.text.match(new RegExp(p.re.source, 'gi'))
      if (matches) segScore += matches.length * p.weight
    }
    for (const p of NEGATIVE_PATTERNS) {
      const matches = seg.text.match(new RegExp(p.re.source, 'gi'))
      if (matches) segScore -= matches.length * p.weight
    }

    // Clamp segment score to -10..+10
    segScore = Math.max(-10, Math.min(10, segScore))
    arc.push({ segment: seg.id, score: segScore })

    // Weight later segments more (how the call ends matters)
    const positionWeight = 1 + (i / buyerSegments.length)
    totalWeighted += segScore * positionWeight
    totalWeight += positionWeight
  }

  const rawScore = totalWeight > 0 ? totalWeighted / totalWeight : 0
  // Map -10..+10 → -100..+100
  const score = Math.round(rawScore * 10)

  // Determine label
  const posCount = arc.filter(a => a.score > 0).length
  const negCount = arc.filter(a => a.score < 0).length
  const total = arc.length || 1

  let overall: SentimentAnalysis['overall']
  if (posCount > 0 && negCount > 0 && Math.min(posCount, negCount) / total > 0.25) {
    overall = 'mixed'
  } else if (score > 15) overall = 'positive'
  else if (score < -15) overall = 'negative'
  else overall = 'neutral'

  return { overall, score, arc }
}

// Buying signal patterns
const STRONG_SIGNALS: Array<{ re: RegExp; label: string }> = [
  { re: /\b(send me the details|send me (the )?info)\b/i, label: 'send me details' },
  { re: /\b(what'?s the address|where is (it|the property))\b/i, label: "what's the address" },
  { re: /\b(I can close in \d+ days?)\b/i, label: 'stated close speed' },
  { re: /\b(I'?ll take it|let'?s (do it|move forward))\b/i, label: "let's do it" },
  { re: /\b(let me run (my )?numbers|I'?ll (look at|review) (the|these) numbers)\b/i, label: 'running numbers' },
  { re: /\b(send (me )?(the )?contract|ready to (sign|close))\b/i, label: 'send the contract' },
  { re: /\b(I have (the )?funds|proof of funds|I can pay cash)\b/i, label: 'confirmed funds' },
]

const MODERATE_SIGNALS: Array<{ re: RegExp; label: string }> = [
  { re: /\b(tell me more|I('d| would) like to (hear|know|learn) more)\b/i, label: 'tell me more' },
  { re: /\b(that'?s interesting|sounds interesting|intriguing)\b/i, label: "that's interesting" },
  { re: /\b(what'?s the (price|asking|cost)|how much)\b/i, label: "what's the price" },
  { re: /\b(what condition|how much (work|rehab)|what'?s the (arv|repair))\b/i, label: 'asking about condition' },
  { re: /\b(what (area|neighborhood|zip)|where (exactly|specifically))\b/i, label: 'asking about location' },
  { re: /\b(is (it|this) (off[- ]?market|wholesale))\b/i, label: 'asking if wholesale' },
]

const WEAK_SIGNALS: Array<{ re: RegExp; label: string }> = [
  { re: /\b(maybe|possibly|I'?ll think about it)\b/i, label: 'maybe' },
  { re: /\b(let me check with (my )?(partner|wife|husband|associate))\b/i, label: 'checking with partner' },
  { re: /\b(I might be|could be interested|depends)\b/i, label: 'conditional interest' },
  { re: /\b(call me (back|later|next week))\b/i, label: 'wants follow-up' },
]

export function detectBuyingSignals(segments: TranscriptSegment[]): BuyingSignalAnalysis {
  const buyerSegments = segments.filter(s => s.speaker === 'buyer')
  const signals: BuyingSignal[] = []

  for (const seg of buyerSegments) {
    for (const { re, label } of STRONG_SIGNALS) {
      const match = seg.text.match(re)
      if (match) {
        signals.push({ signal: label, strength: 'strong', quote: extractQuote(seg.text, match.index || 0), segmentId: seg.id })
      }
    }
    for (const { re, label } of MODERATE_SIGNALS) {
      const match = seg.text.match(re)
      if (match) {
        signals.push({ signal: label, strength: 'moderate', quote: extractQuote(seg.text, match.index || 0), segmentId: seg.id })
      }
    }
    for (const { re, label } of WEAK_SIGNALS) {
      const match = seg.text.match(re)
      if (match) {
        signals.push({ signal: label, strength: 'weak', quote: extractQuote(seg.text, match.index || 0), segmentId: seg.id })
      }
    }
  }

  // Deduplicate by signal label (keep first occurrence)
  const seen = new Set<string>()
  const deduped = signals.filter(s => { if (seen.has(s.signal)) return false; seen.add(s.signal); return true })

  const strongCount = deduped.filter(s => s.strength === 'strong').length
  const moderateCount = deduped.filter(s => s.strength === 'moderate').length

  let overallIntent: BuyingSignalAnalysis['overallIntent']
  if (strongCount >= 2) overallIntent = 'high'
  else if (strongCount >= 1 || moderateCount >= 2) overallIntent = 'medium'
  else if (moderateCount >= 1 || deduped.length > 0) overallIntent = 'low'
  else overallIntent = 'none'

  return { signals: deduped, count: deduped.length, overallIntent }
}

// Objection patterns
const OBJECTION_PATTERNS: Array<{ re: RegExp; category: Objection['category']; label: string }> = [
  // Price
  { re: /\b(too (expensive|high|much)|can'?t afford|out of (my )?range|over (my )?budget)\b/i, category: 'price', label: 'too expensive' },
  { re: /\b(numbers don'?t work|doesn'?t make (financial )?sense|not enough (margin|spread))\b/i, category: 'price', label: "numbers don't work" },
  { re: /\b(arv (is|seems) (too )?(low|high)|comps don'?t support)\b/i, category: 'price', label: 'ARV concern' },
  // Trust
  { re: /\b(how did you get my number|where did you get my (info|number))\b/i, category: 'trust', label: 'how did you get my number' },
  { re: /\b(is this (a )?scam|sounds (too good|sketchy)|I don'?t (trust|know) you)\b/i, category: 'trust', label: 'trust concern' },
  { re: /\b(been burned|bad experience|ripped off|wholesalers are)\b/i, category: 'trust', label: 'bad past experience' },
  // Timing
  { re: /\b(not right now|not (currently )?buying|paused|taking a break|slowed down)\b/i, category: 'timing', label: 'not buying right now' },
  { re: /\b(market is (too )?(hot|crazy|volatile)|prices are (too high|insane))\b/i, category: 'timing', label: 'market concerns' },
  { re: /\b(pulled back|sitting (on the )?sidelines|waiting for)\b/i, category: 'timing', label: 'waiting/pulled back' },
  // Competition
  { re: /\b(already (work|deal) with (someone|another)|have (my own|a) (deals|source))\b/i, category: 'competition', label: 'already has sources' },
  { re: /\b(I use \w+|I('m| am) (on|with) \w+)\b/i, category: 'competition', label: 'uses competitor' },
]

export function detectObjections(segments: TranscriptSegment[]): ObjectionAnalysis {
  const objections: Objection[] = []

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    if (seg.speaker !== 'buyer') continue

    for (const { re, category, label } of OBJECTION_PATTERNS) {
      if (!re.test(seg.text)) continue

      // Find AI response (next agent segment)
      let response = ''
      for (let j = i + 1; j < segments.length && j <= i + 3; j++) {
        if (segments[j].speaker === 'agent') {
          response = segments[j].text.length > 200 ? segments[j].text.slice(0, 197) + '...' : segments[j].text
          break
        }
      }

      // Determine if handled: check buyer's next 2 segments after the AI response
      let handled = false
      const responseSeg = segments.findIndex((s, idx) => idx > i && s.speaker === 'agent')
      if (responseSeg >= 0) {
        const nextBuyer = segments.filter((s, idx) => idx > responseSeg && s.speaker === 'buyer').slice(0, 2)
        const posAfter = nextBuyer.filter(s => {
          let pos = 0, neg = 0
          for (const p of POSITIVE_PATTERNS) if (p.re.test(s.text)) pos += p.weight
          for (const p of NEGATIVE_PATTERNS) if (p.re.test(s.text)) neg += p.weight
          return pos > neg
        }).length
        handled = posAfter > 0 || (nextBuyer.length > 0 && nextBuyer.every(s => s.sentiment !== 'negative'))
      }

      objections.push({ objection: label, category, handled, response, segmentId: seg.id })
      break // only one objection per segment
    }
  }

  return { objections, count: objections.length }
}

// Competitor detection
const COMPETITOR_NAMES = [
  'PropStream', 'InvestorLift', 'REIRail', 'BatchLeads', 'DealMachine',
  'Podio', 'Carrot', 'REsimpli', 'FreedomSoft', 'REISift', 'Mojo',
]

export function detectCompetitors(segments: TranscriptSegment[]): CompetitorAnalysis {
  const mentions: CompetitorMention[] = []

  for (const seg of segments) {
    if (seg.speaker !== 'buyer') continue

    for (const name of COMPETITOR_NAMES) {
      if (seg.text.toLowerCase().includes(name.toLowerCase())) {
        const quote = extractQuote(seg.text, seg.text.toLowerCase().indexOf(name.toLowerCase()))
        const sentiment = seg.sentiment === 'positive' ? 'positive'
          : seg.sentiment === 'negative' ? 'negative' : 'neutral'
        mentions.push({ competitor: name, context: quote, sentiment })
      }
    }

    // Generic competitor mentions
    const genericMatch = seg.text.match(/\b(another (wholesaler|company|investor)|someone else|other (company|guy|person))\b/i)
    if (genericMatch) {
      mentions.push({
        competitor: 'Other wholesaler',
        context: extractQuote(seg.text, genericMatch.index || 0),
        sentiment: seg.sentiment === 'positive' ? 'positive' : seg.sentiment === 'negative' ? 'negative' : 'neutral',
      })
    }
  }

  return { mentions }
}

export function calculateTalkMetrics(segments: TranscriptSegment[]): TalkMetricAnalysis {
  const agentSegs = segments.filter(s => s.speaker === 'agent')
  const buyerSegs = segments.filter(s => s.speaker === 'buyer')

  const agentWords = agentSegs.reduce((sum, s) => sum + s.text.split(/\s+/).length, 0)
  const buyerWords = buyerSegs.reduce((sum, s) => sum + s.text.split(/\s+/).length, 0)
  const totalWords = agentWords + buyerWords || 1

  const aiTalkPercent = Math.round((agentWords / totalWords) * 100)
  const buyerTalkPercent = 100 - aiTalkPercent

  // Longest AI monologue: consecutive agent segments
  let longestMonologue = 0
  let currentMonologue = 0
  for (const seg of segments) {
    if (seg.speaker === 'agent') {
      currentMonologue += seg.text.split(/\s+/).length
    } else {
      // Convert word count to estimated seconds (avg 150 words/min)
      longestMonologue = Math.max(longestMonologue, Math.round(currentMonologue / 2.5))
      currentMonologue = 0
    }
  }
  longestMonologue = Math.max(longestMonologue, Math.round(currentMonologue / 2.5))

  // Count questions asked by AI
  const questionCount = agentSegs.reduce((count, s) => {
    const questions = s.text.match(/\?/g)
    return count + (questions?.length || 0)
  }, 0)

  return {
    aiTalkPercent,
    buyerTalkPercent,
    idealRatio: aiTalkPercent >= 30 && aiTalkPercent <= 45,
    longestAiMonologue: longestMonologue,
    questionCount,
  }
}

export function assessEngagement(
  segments: TranscriptSegment[],
  talkMetrics: TalkMetricAnalysis,
  sentiment: SentimentAnalysis,
): EngagementAnalysis {
  const buyerSegs = segments.filter(s => s.speaker === 'buyer')
  if (buyerSegs.length === 0) return { score: 0, signals: [{ signal: 'No buyer response', type: 'negative' }] }

  const signals: EngagementAnalysis['signals'] = []
  let score = 50 // start neutral

  // Response length analysis
  const avgWords = buyerSegs.reduce((sum, s) => sum + s.text.split(/\s+/).length, 0) / buyerSegs.length
  if (avgWords > 20) { score += 15; signals.push({ signal: 'Detailed responses (avg ' + Math.round(avgWords) + ' words)', type: 'positive' }) }
  else if (avgWords > 10) { score += 5; signals.push({ signal: 'Moderate responses', type: 'positive' }) }
  else if (avgWords < 5) { score -= 15; signals.push({ signal: 'Very short responses', type: 'negative' }) }

  // Buyer asks questions
  const buyerQuestions = buyerSegs.filter(s => s.text.includes('?')).length
  if (buyerQuestions >= 3) { score += 15; signals.push({ signal: `Buyer asked ${buyerQuestions} questions`, type: 'positive' }) }
  else if (buyerQuestions >= 1) { score += 5; signals.push({ signal: 'Buyer asked questions', type: 'positive' }) }

  // Mentions specifics (property types, markets, numbers)
  const specifics = buyerSegs.filter(s => /\b(sfr|single family|multi|condo|duplex|\$[\d,]+|\d+k)\b/i.test(s.text)).length
  if (specifics >= 2) { score += 10; signals.push({ signal: 'Discussed specific criteria', type: 'positive' }) }

  // One-word answers pattern
  const oneWordResponses = buyerSegs.filter(s => s.text.split(/\s+/).length <= 2).length
  if (oneWordResponses > buyerSegs.length * 0.6) { score -= 10; signals.push({ signal: 'Mostly one-word answers', type: 'negative' }) }

  // Sentiment contribution
  if (sentiment.score > 30) { score += 10; signals.push({ signal: 'Positive tone throughout', type: 'positive' }) }
  else if (sentiment.score < -30) { score -= 10; signals.push({ signal: 'Negative tone', type: 'negative' }) }

  // Talk ratio contribution
  if (talkMetrics.idealRatio) { score += 5 }
  else if (talkMetrics.aiTalkPercent > 60) { score -= 10; signals.push({ signal: 'AI dominated conversation', type: 'negative' }) }

  // Call length contribution (more segments = more engagement)
  if (segments.length > 20) { score += 5; signals.push({ signal: 'Extended conversation', type: 'positive' }) }
  else if (segments.length < 6) { score -= 5; signals.push({ signal: 'Very brief call', type: 'negative' }) }

  return { score: Math.max(0, Math.min(100, score)), signals }
}

// ─── Unified Rule-Based Analysis ─────────────────────────────────────────────

export function analyzeConversation(parsed: ParsedTranscript): ConversationAnalysis {
  const { segments } = parsed

  const sentiment = analyzeSentiment(segments)
  const buyingSignals = detectBuyingSignals(segments)
  const objections = detectObjections(segments)
  const competitors = detectCompetitors(segments)
  const talkMetrics = calculateTalkMetrics(segments)
  const engagement = assessEngagement(segments, talkMetrics, sentiment)

  // Build highlights from key moments + strongest signals + objections
  const highlights: CallHighlight[] = []

  for (const sig of buyingSignals.signals.filter(s => s.strength === 'strong')) {
    highlights.push({
      type: 'deal_interest',
      startSegment: sig.segmentId,
      endSegment: sig.segmentId,
      summary: `Strong buying signal: ${sig.signal}`,
      quote: sig.quote,
    })
  }

  for (const obj of objections.objections) {
    highlights.push({
      type: obj.handled ? 'objection_handled' : 'objection_raised',
      startSegment: obj.segmentId,
      endSegment: obj.segmentId + 2,
      summary: `${obj.category} objection: ${obj.objection}${obj.handled ? ' (handled)' : ' (not handled)'}`,
      quote: obj.response || obj.objection,
    })
  }

  // Script effectiveness from outcome signals
  const scriptPerformance = calculateScriptPerformance(sentiment, buyingSignals, objections, engagement, talkMetrics)

  return { sentiment, buyingSignals, objections, competitors, talkMetrics, engagement, highlights, scriptPerformance }
}

function calculateScriptPerformance(
  sentiment: SentimentAnalysis,
  buyingSignals: BuyingSignalAnalysis,
  objections: ObjectionAnalysis,
  engagement: EngagementAnalysis,
  talkMetrics: TalkMetricAnalysis,
): ScriptPerformanceAnalysis {
  // Weighted score from multiple factors
  let effectiveness = 0
  effectiveness += Math.max(0, (sentiment.score + 100) / 4)  // 0-50 from sentiment
  effectiveness += engagement.score * 0.3                       // 0-30 from engagement
  effectiveness += buyingSignals.count * 3                      // 0-15 from signals (capped)
  effectiveness -= objections.objections.filter(o => !o.handled).length * 5
  if (talkMetrics.idealRatio) effectiveness += 5

  effectiveness = Math.max(0, Math.min(100, Math.round(effectiveness)))

  // Generate suggestions
  const suggestions: ScriptPerformanceAnalysis['suggestions'] = []

  if (talkMetrics.aiTalkPercent > 55) {
    suggestions.push({ suggestion: 'Reduce AI talk time — let the buyer speak more', reason: `AI talked ${talkMetrics.aiTalkPercent}% of the time (ideal: 35-45%)`, priority: 'high' })
  }
  if (talkMetrics.longestAiMonologue > 30) {
    suggestions.push({ suggestion: 'Break up long monologues with questions', reason: `Longest uninterrupted AI speech: ${talkMetrics.longestAiMonologue}s`, priority: 'medium' })
  }
  if (talkMetrics.questionCount < 3) {
    suggestions.push({ suggestion: 'Add more qualifying questions to the script', reason: `Only ${talkMetrics.questionCount} questions asked`, priority: 'medium' })
  }
  const unhandledPrice = objections.objections.filter(o => o.category === 'price' && !o.handled)
  if (unhandledPrice.length > 0) {
    suggestions.push({ suggestion: 'Add price objection handling — mention ROI, comps, or flexible terms', reason: `${unhandledPrice.length} price objection(s) not overcome`, priority: 'high' })
  }
  const unhandledTrust = objections.objections.filter(o => o.category === 'trust' && !o.handled)
  if (unhandledTrust.length > 0) {
    suggestions.push({ suggestion: 'Build trust earlier — mention track record, references, or proof of funds', reason: `${unhandledTrust.length} trust objection(s) not overcome`, priority: 'high' })
  }
  if (buyingSignals.count === 0 && engagement.score > 40) {
    suggestions.push({ suggestion: 'Add a stronger call-to-action earlier in the script', reason: 'Engaged buyer but no buying signals detected', priority: 'medium' })
  }

  return { effectiveness: effectiveness || null, suggestions }
}

// ─── Part B: AI Deep Analysis ────────────────────────────────────────────────

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

export function qualifiesForDeepAnalysis(
  outcome: string | null,
  engagementScore: number,
  objectionCount: number,
  durationSecs: number | null,
): boolean {
  if (outcome === 'QUALIFIED') return true
  if (engagementScore > 60) return true
  if (objectionCount >= 3) return true
  if (durationSecs && durationSecs > 180) return true
  return false
}

export async function generateDeepAnalysis(
  transcript: string,
  basicAnalysis: ConversationAnalysis,
  extractedData: Record<string, unknown> | null,
): Promise<{ highlights: CallHighlight[]; suggestions: ScriptPerformanceAnalysis['suggestions'] } | null> {
  if (!ANTHROPIC_API_KEY) return null

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 800,
        system: 'You analyze real estate buyer qualification call transcripts and provide deep insights. Always respond with valid JSON only.',
        messages: [{
          role: 'user',
          content: `Analyze this real estate buyer qualification call transcript. Basic analysis done. Provide DEEPER insights.

TRANSCRIPT:
${transcript.substring(0, 2000)}

BASIC ANALYSIS:
Sentiment: ${basicAnalysis.sentiment.overall} (score: ${basicAnalysis.sentiment.score})
Buying signals: ${basicAnalysis.buyingSignals.count} (intent: ${basicAnalysis.buyingSignals.overallIntent})
Objections: ${basicAnalysis.objections.objections.map(o => o.objection).join(', ') || 'none'}
Outcome: ${extractedData?.stillBuying === true ? 'QUALIFIED' : extractedData?.stillBuying === false ? 'NOT_BUYING' : 'UNKNOWN'}

Respond with JSON only:
{
  "highlights": [
    { "type": "key_moment | objection_handled | deal_interest | preference_stated | rapport_building",
      "summary": "Brief description",
      "quote": "Exact or near-exact quote from transcript",
      "significance": "Why this matters" }
  ],
  "scriptSuggestions": [
    { "suggestion": "What to change",
      "reason": "Why this improves results",
      "priority": "high | medium | low" }
  ]
}`,
        }],
      }),
    })

    if (!res.ok) {
      logger.warn('Deep analysis API error', { route: 'conversation-intelligence', status: res.status })
      return null
    }

    const data = await res.json()
    const text = data.content?.[0]?.text || '{}'
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())

    const highlights: CallHighlight[] = (parsed.highlights || []).map((h: any) => ({
      type: h.type || 'key_moment',
      startSegment: 0,
      endSegment: 0,
      summary: h.summary || '',
      quote: h.quote || '',
    }))

    const suggestions = (parsed.scriptSuggestions || []).map((s: any) => ({
      suggestion: s.suggestion || '',
      reason: s.reason || '',
      priority: ['high', 'medium', 'low'].includes(s.priority) ? s.priority : 'medium',
    }))

    return { highlights, suggestions }
  } catch (err) {
    logger.warn('Deep analysis failed', { route: 'conversation-intelligence', error: err instanceof Error ? err.message : String(err) })
    return null
  }
}

// ─── Persistence ─────────────────────────────────────────────────────────────

export async function saveCallIntelligence(
  callId: string,
  profileId: string,
  analysis: ConversationAnalysis,
): Promise<string> {
  const record = await prisma.callIntelligence.create({
    data: {
      callId,
      profileId,
      overallSentiment: analysis.sentiment.overall,
      sentimentScore: analysis.sentiment.score,
      sentimentArc: analysis.sentiment.arc as any,
      buyingSignals: analysis.buyingSignals.signals as any,
      buyingSignalCount: analysis.buyingSignals.count,
      overallBuyingIntent: analysis.buyingSignals.overallIntent,
      objections: analysis.objections.objections as any,
      objectionCount: analysis.objections.count,
      competitorMentions: analysis.competitors.mentions as any,
      aiTalkPercent: analysis.talkMetrics.aiTalkPercent,
      buyerTalkPercent: analysis.talkMetrics.buyerTalkPercent,
      idealRatio: analysis.talkMetrics.idealRatio,
      longestAiMonologue: analysis.talkMetrics.longestAiMonologue,
      questionCount: analysis.talkMetrics.questionCount,
      engagementScore: analysis.engagement.score,
      engagementSignals: analysis.engagement.signals as any,
      highlights: analysis.highlights as any,
      scriptEffectiveness: analysis.scriptPerformance.effectiveness,
      scriptSuggestions: analysis.scriptPerformance.suggestions as any,
    },
  })
  return record.id
}

export async function updateCallIntelligenceDeep(
  callId: string,
  deep: { highlights: CallHighlight[]; suggestions: ScriptPerformanceAnalysis['suggestions'] },
): Promise<void> {
  const existing = await prisma.callIntelligence.findUnique({ where: { callId } })
  if (!existing) return

  const existingHighlights = (existing.highlights as unknown as CallHighlight[]) || []
  const existingSuggestions = (existing.scriptSuggestions as unknown as ScriptPerformanceAnalysis['suggestions']) || []

  await prisma.callIntelligence.update({
    where: { callId },
    data: {
      highlights: [...existingHighlights, ...deep.highlights] as any,
      scriptSuggestions: [...existingSuggestions, ...deep.suggestions] as any,
    },
  })
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractQuote(text: string, matchIndex: number): string {
  const start = Math.max(0, matchIndex - 30)
  const end = Math.min(text.length, matchIndex + 80)
  const prefix = start > 0 ? '...' : ''
  const suffix = end < text.length ? '...' : ''
  return prefix + text.slice(start, end).trim() + suffix
}
