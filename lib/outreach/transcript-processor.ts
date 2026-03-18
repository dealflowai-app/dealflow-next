// ─── Transcript Processor ────────────────────────────────────────────────────
// Parses raw Bland AI transcripts into structured segments with speaker labels,
// timestamps, key moments, and per-speaker stats.
//
// Bland AI transcript format (typical):
//   "Agent: Hello, this is Sarah from ABC Investments...\nUser: Hi, yeah...\n"
//   or timestamped: "[0:05] Agent: Hello...\n[0:12] User: Hi...\n"
//
// This processor handles both formats and normalizes them.

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TranscriptSegment {
  id: number                  // sequential segment index
  speaker: 'agent' | 'buyer' | 'system'
  speakerLabel: string        // display name e.g. "AI Agent" or "John Smith"
  text: string
  timestamp: number | null    // seconds from call start (null if not available)
  sentiment: 'positive' | 'negative' | 'neutral'
  isKeyMoment: boolean
  keyMomentType?: 'objection' | 'interest' | 'pricing' | 'opt_out' | 'closing' | 'buy_box'
}

export interface SpeakerStats {
  speaker: 'agent' | 'buyer'
  speakerLabel: string
  segmentCount: number
  wordCount: number
  talkTimePercent: number     // estimated from word count ratio
  avgWordsPerTurn: number
}

export interface KeyMoment {
  segmentId: number
  type: 'objection' | 'interest' | 'pricing' | 'opt_out' | 'closing' | 'buy_box'
  label: string
  snippet: string             // first 120 chars of the segment
  timestamp: number | null
}

export interface ParsedTranscript {
  segments: TranscriptSegment[]
  keyMoments: KeyMoment[]
  speakerStats: SpeakerStats[]
  totalSegments: number
  estimatedDurationSecs: number | null
}

export interface ParseOptions {
  agentName?: string
  buyerName?: string
}

// ─── Key Moment Detection Patterns ──────────────────────────────────────────

const KEY_MOMENT_PATTERNS: { type: KeyMoment['type']; label: string; patterns: RegExp[] }[] = [
  {
    type: 'interest',
    label: 'Expressed Interest',
    patterns: [
      /\b(interested|send me|tell me more|sounds good|I('d| would) like|looking for|let('s| us) do it|sign me up)\b/i,
      /\b(yes|yeah|definitely|absolutely|for sure)\b.*\b(buy|purchase|invest|deal)\b/i,
    ],
  },
  {
    type: 'objection',
    label: 'Raised Objection',
    patterns: [
      /\b(not interested|too (expensive|high|much)|can't afford|no budget|bad timing|not right now)\b/i,
      /\b(don't need|won't work|doesn't work|not looking|slowed down|pulling back)\b/i,
    ],
  },
  {
    type: 'pricing',
    label: 'Pricing Discussion',
    patterns: [
      /\$[\d,]+/,
      /\b(\d{2,3})\s*(k|thousand)\b/i,
      /\b(price|cost|budget|range|arv|offer|asking)\b.*\b(\d{2,})\b/i,
      /\b(min|max|minimum|maximum)\s*(price|budget|range)\b/i,
    ],
  },
  {
    type: 'buy_box',
    label: 'Buy Box Criteria',
    patterns: [
      /\b(single family|sfr|multi[- ]?family|commercial|land|condo|duplex|triplex|fourplex)\b/i,
      /\b(flip|rental|hold|buy and hold|wholesale)\b.*\b(strategy|approach|focus)\b/i,
      /\b(close|closing)\b.*\b(\d+)\s*(day|week)\b/i,
      /\b(proof of funds|hard money|cash buyer|pre[- ]?approved)\b/i,
    ],
  },
  {
    type: 'opt_out',
    label: 'Opt-Out Request',
    patterns: [
      /\b(remove me|do not call|don'?t call|stop calling|take me off|unsubscribe|opt out)\b/i,
      /\b(never call|stop contacting|delete my number|remove my number)\b/i,
    ],
  },
  {
    type: 'closing',
    label: 'Closing / Next Steps',
    patterns: [
      /\b(send (me |the )?(details|info|contract)|set up|schedule|follow up|next step|move forward)\b/i,
      /\b(email|text) (me|it|that|the)\b/i,
      /\b(when can|how soon|let('s| me) get|ready to)\b/i,
    ],
  },
]

// ─── Sentiment Signals ──────────────────────────────────────────────────────

const POSITIVE_SIGNALS = [
  /\b(great|excellent|perfect|awesome|love|interested|sure|absolutely|definitely|sounds good|fantastic|wonderful)\b/i,
  /\b(yes|yeah|yep|ok|okay)\b/i,
]

const NEGATIVE_SIGNALS = [
  /\b(no|not|don't|won't|can't|never|terrible|horrible|bad|hate|annoyed|frustrated|stop|remove)\b/i,
  /\b(not interested|too expensive|bad timing|waste of time)\b/i,
]

// ─── Parser ─────────────────────────────────────────────────────────────────

// Timestamp pattern: [0:05] or [00:05] or [1:23:45]
const TIMESTAMP_RE = /^\[(\d{1,2}):(\d{2})(?::(\d{2}))?\]\s*/

// Speaker label pattern: "Agent:" or "User:" or "System:" etc.
const SPEAKER_RE = /^(Agent|User|AI|Assistant|Buyer|System|Bot|Customer|Caller|Rep)\s*:\s*/i

// Combined: optional timestamp + speaker label
const LINE_RE = /^(?:\[(\d{1,2}):(\d{2})(?::(\d{2}))?\]\s*)?(Agent|User|AI|Assistant|Buyer|System|Bot|Customer|Caller|Rep)\s*:\s*/i

function parseTimestamp(match: RegExpMatchArray | null): number | null {
  if (!match) return null
  const h = match[3] ? parseInt(match[1], 10) : 0
  const m = match[3] ? parseInt(match[2], 10) : parseInt(match[1], 10)
  const s = match[3] ? parseInt(match[3], 10) : parseInt(match[2], 10)
  return h * 3600 + m * 60 + s
}

function classifySpeaker(label: string): 'agent' | 'buyer' | 'system' {
  const lower = label.toLowerCase()
  if (['agent', 'ai', 'assistant', 'bot', 'rep'].includes(lower)) return 'agent'
  if (['system'].includes(lower)) return 'system'
  return 'buyer'
}

function detectSentiment(text: string): 'positive' | 'negative' | 'neutral' {
  let posScore = 0
  let negScore = 0

  for (const re of POSITIVE_SIGNALS) {
    const matches = text.match(new RegExp(re.source, 'gi'))
    if (matches) posScore += matches.length
  }
  for (const re of NEGATIVE_SIGNALS) {
    const matches = text.match(new RegExp(re.source, 'gi'))
    if (matches) negScore += matches.length
  }

  if (posScore > negScore + 1) return 'positive'
  if (negScore > posScore + 1) return 'negative'
  return 'neutral'
}

function detectKeyMoment(text: string): { type: KeyMoment['type']; label: string } | null {
  for (const km of KEY_MOMENT_PATTERNS) {
    for (const pattern of km.patterns) {
      if (pattern.test(text)) {
        return { type: km.type, label: km.label }
      }
    }
  }
  return null
}

export function parseTranscript(
  rawTranscript: string,
  options?: ParseOptions,
): ParsedTranscript {
  const agentName = options?.agentName || 'AI Agent'
  const buyerName = options?.buyerName || 'Buyer'

  const lines = rawTranscript.split('\n').filter(l => l.trim().length > 0)

  const segments: TranscriptSegment[] = []
  let segId = 0

  for (const line of lines) {
    const trimmed = line.trim()

    // Try to match structured line: [timestamp] Speaker: text
    const lineMatch = trimmed.match(LINE_RE)

    if (lineMatch) {
      // Extract timestamp if present
      let timestamp: number | null = null
      if (lineMatch[1] !== undefined) {
        const h = lineMatch[3] ? parseInt(lineMatch[1], 10) : 0
        const m = lineMatch[3] ? parseInt(lineMatch[2], 10) : parseInt(lineMatch[1], 10)
        const s = lineMatch[3] ? parseInt(lineMatch[3], 10) : parseInt(lineMatch[2], 10)
        timestamp = h * 3600 + m * 60 + s
      }

      const speakerRaw = lineMatch[4]
      const speaker = classifySpeaker(speakerRaw)
      const text = trimmed.replace(LINE_RE, '').trim()

      if (!text) continue

      const speakerLabel = speaker === 'agent' ? agentName
        : speaker === 'buyer' ? buyerName
        : 'System'

      const sentiment = speaker !== 'system' ? detectSentiment(text) : 'neutral'
      const km = speaker === 'buyer' ? detectKeyMoment(text) : null

      segments.push({
        id: segId++,
        speaker,
        speakerLabel,
        text,
        timestamp,
        sentiment,
        isKeyMoment: !!km,
        keyMomentType: km?.type,
      })
    } else {
      // Unstructured line — append to previous segment or create new one
      if (segments.length > 0) {
        const last = segments[segments.length - 1]
        last.text += ' ' + trimmed
        // Re-evaluate sentiment and key moments with combined text
        last.sentiment = detectSentiment(last.text)
        const km = last.speaker === 'buyer' ? detectKeyMoment(last.text) : null
        if (km) {
          last.isKeyMoment = true
          last.keyMomentType = km.type
        }
      } else {
        // First line with no speaker label — treat as system message
        segments.push({
          id: segId++,
          speaker: 'system',
          speakerLabel: 'System',
          text: trimmed,
          timestamp: null,
          sentiment: 'neutral',
          isKeyMoment: false,
        })
      }
    }
  }

  // ── Extract key moments ─────────────────────────────────────────────────
  const keyMoments: KeyMoment[] = segments
    .filter(s => s.isKeyMoment && s.keyMomentType)
    .map(s => ({
      segmentId: s.id,
      type: s.keyMomentType!,
      label: KEY_MOMENT_PATTERNS.find(k => k.type === s.keyMomentType)?.label || s.keyMomentType!,
      snippet: s.text.length > 120 ? s.text.slice(0, 117) + '...' : s.text,
      timestamp: s.timestamp,
    }))

  // ── Compute speaker stats ──────────────────────────────────────────────
  const agentSegments = segments.filter(s => s.speaker === 'agent')
  const buyerSegments = segments.filter(s => s.speaker === 'buyer')

  const agentWords = agentSegments.reduce((sum, s) => sum + s.text.split(/\s+/).length, 0)
  const buyerWords = buyerSegments.reduce((sum, s) => sum + s.text.split(/\s+/).length, 0)
  const totalWords = agentWords + buyerWords || 1

  const speakerStats: SpeakerStats[] = [
    {
      speaker: 'agent',
      speakerLabel: agentName,
      segmentCount: agentSegments.length,
      wordCount: agentWords,
      talkTimePercent: Math.round((agentWords / totalWords) * 100),
      avgWordsPerTurn: agentSegments.length > 0 ? Math.round(agentWords / agentSegments.length) : 0,
    },
    {
      speaker: 'buyer',
      speakerLabel: buyerName,
      segmentCount: buyerSegments.length,
      wordCount: buyerWords,
      talkTimePercent: Math.round((buyerWords / totalWords) * 100),
      avgWordsPerTurn: buyerSegments.length > 0 ? Math.round(buyerWords / buyerSegments.length) : 0,
    },
  ]

  // ── Estimated duration from last timestamp ────────────────────────────
  const lastTimestamp = [...segments].reverse().find(s => s.timestamp !== null)?.timestamp ?? null

  return {
    segments,
    keyMoments,
    speakerStats,
    totalSegments: segments.length,
    estimatedDurationSecs: lastTimestamp,
  }
}

// ─── Search helper: find segments matching a query ──────────────────────────

export function searchTranscript(
  parsed: ParsedTranscript,
  query: string,
): { segmentId: number; snippet: string; matchStart: number }[] {
  const lower = query.toLowerCase()
  const results: { segmentId: number; snippet: string; matchStart: number }[] = []

  for (const seg of parsed.segments) {
    const idx = seg.text.toLowerCase().indexOf(lower)
    if (idx === -1) continue

    // Build snippet with context around the match
    const start = Math.max(0, idx - 40)
    const end = Math.min(seg.text.length, idx + query.length + 40)
    const prefix = start > 0 ? '...' : ''
    const suffix = end < seg.text.length ? '...' : ''
    const snippet = prefix + seg.text.slice(start, end) + suffix

    results.push({ segmentId: seg.id, snippet, matchStart: idx })
  }

  return results
}
