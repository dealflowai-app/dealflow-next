'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import type {
  ParsedTranscript,
  TranscriptSegment,
  KeyMoment,
  SpeakerStats,
} from '@/lib/outreach/transcript-processor'

// ─── Transcript Viewer ──────────────────────────────────────────────────────
// Renders a parsed transcript as speaker-labeled chat bubbles with:
// - Key moment markers and jump-to navigation
// - In-transcript search with highlight
// - Speaker stats (talk ratio, word counts)
// - Optional sync with audio player (highlights current segment)

export interface TranscriptViewerProps {
  transcript: ParsedTranscript
  /** Current playback time in seconds (from AudioPlayer) for segment highlighting */
  currentTime?: number
  /** Callback to seek audio to a segment's timestamp */
  onSeekTo?: (time: number) => void
}

function formatTimestamp(secs: number | null): string {
  if (secs === null) return ''
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

const KEY_MOMENT_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  interest: { bg: 'bg-blue-900/40', text: 'text-blue-400', dot: 'bg-blue-400' },
  objection: { bg: 'bg-red-900/40', text: 'text-red-400', dot: 'bg-red-400' },
  pricing: { bg: 'bg-amber-900/40', text: 'text-amber-400', dot: 'bg-amber-400' },
  opt_out: { bg: 'bg-red-900/60', text: 'text-red-300', dot: 'bg-red-500' },
  closing: { bg: 'bg-blue-900/40', text: 'text-blue-400', dot: 'bg-blue-400' },
  buy_box: { bg: 'bg-purple-900/40', text: 'text-purple-400', dot: 'bg-purple-400' },
}

// ─── Highlight search matches in text ────────────────────────────────────────

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>

  const parts: { text: string; match: boolean }[] = []
  const lower = text.toLowerCase()
  const lowerQ = query.toLowerCase()
  let lastIndex = 0

  let searchFrom = 0
  while (searchFrom < lower.length) {
    const idx = lower.indexOf(lowerQ, searchFrom)
    if (idx === -1) break
    if (idx > lastIndex) {
      parts.push({ text: text.slice(lastIndex, idx), match: false })
    }
    parts.push({ text: text.slice(idx, idx + query.length), match: true })
    lastIndex = idx + query.length
    searchFrom = lastIndex
  }
  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), match: false })
  }

  return (
    <>
      {parts.map((p, i) =>
        p.match ? (
          <mark key={i} className="rounded bg-yellow-500/30 text-yellow-200 px-0.5">
            {p.text}
          </mark>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  )
}

// ─── Speaker Stats Bar ──────────────────────────────────────────────────────

function SpeakerStatsBar({ stats }: { stats: SpeakerStats[] }) {
  const agent = stats.find(s => s.speaker === 'agent')
  const buyer = stats.find(s => s.speaker === 'buyer')

  return (
    <div className="rounded-lg bg-gray-800/50 p-3 mb-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-medium text-gray-400">Talk Ratio</span>
      </div>
      <div className="flex h-2 rounded-full overflow-hidden bg-gray-700 mb-2">
        <div
          className="bg-brand-blue-500 transition-all"
          style={{ width: `${agent?.talkTimePercent || 0}%` }}
        />
        <div
          className="bg-blue-500 transition-all"
          style={{ width: `${buyer?.talkTimePercent || 0}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-400">
        <span>
          <span className="inline-block w-2 h-2 rounded-full bg-brand-blue-500 mr-1" />
          {agent?.speakerLabel || 'Agent'}: {agent?.talkTimePercent || 0}% ({agent?.wordCount || 0} words)
        </span>
        <span>
          <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1" />
          {buyer?.speakerLabel || 'Buyer'}: {buyer?.talkTimePercent || 0}% ({buyer?.wordCount || 0} words)
        </span>
      </div>
    </div>
  )
}

// ─── Key Moments List ───────────────────────────────────────────────────────

function KeyMomentsList({
  moments,
  onJumpTo,
}: {
  moments: KeyMoment[]
  onJumpTo: (segmentId: number, timestamp: number | null) => void
}) {
  if (moments.length === 0) return null

  return (
    <div className="rounded-lg bg-gray-800/50 p-3 mb-3">
      <span className="text-xs font-medium text-gray-400 mb-2 block">Key Moments</span>
      <div className="flex flex-wrap gap-1.5">
        {moments.map((km, i) => {
          const colors = KEY_MOMENT_COLORS[km.type] || KEY_MOMENT_COLORS.interest
          return (
            <button
              key={i}
              onClick={() => onJumpTo(km.segmentId, km.timestamp)}
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${colors.bg} ${colors.text} hover:brightness-125 transition-all`}
              title={km.snippet}
            >
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${colors.dot}`} />
              {km.label}
              {km.timestamp !== null && (
                <span className="opacity-60 ml-0.5">{formatTimestamp(km.timestamp)}</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function TranscriptViewer({
  transcript,
  currentTime,
  onSeekTo,
}: TranscriptViewerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showStats, setShowStats] = useState(true)
  const segmentRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const containerRef = useRef<HTMLDivElement>(null)

  // Find the "active" segment based on current playback time
  const activeSegmentId = useMemo(() => {
    if (currentTime === undefined) return null
    // Find the last segment whose timestamp <= currentTime
    let active: number | null = null
    for (const seg of transcript.segments) {
      if (seg.timestamp !== null && seg.timestamp <= currentTime) {
        active = seg.id
      }
    }
    return active
  }, [currentTime, transcript.segments])

  // Auto-scroll to active segment during playback
  useEffect(() => {
    if (activeSegmentId === null) return
    const el = segmentRefs.current.get(activeSegmentId)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [activeSegmentId])

  // Filter segments by search query
  const filteredSegments = useMemo(() => {
    if (!searchQuery) return transcript.segments
    const lower = searchQuery.toLowerCase()
    return transcript.segments.filter(s => s.text.toLowerCase().includes(lower))
  }, [searchQuery, transcript.segments])

  const matchCount = searchQuery ? filteredSegments.length : 0

  const jumpToSegment = (segmentId: number, timestamp: number | null) => {
    const el = segmentRefs.current.get(segmentId)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
    if (timestamp !== null && onSeekTo) {
      onSeekTo(timestamp)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <div className="mb-3 flex items-center gap-2">
        <div className="relative flex-1">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search transcript..."
            className="w-full rounded-lg bg-gray-800 py-1.5 pl-8 pr-3 text-sm text-gray-200 placeholder-gray-500 outline-none ring-1 ring-gray-700 focus:ring-brand-blue-500 transition-colors"
          />
          {searchQuery && (
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-500">
              {matchCount} match{matchCount !== 1 ? 'es' : ''}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowStats(s => !s)}
          className="rounded-lg bg-gray-800 px-2.5 py-1.5 text-xs text-gray-400 hover:text-white ring-1 ring-gray-700 transition-colors"
          title={showStats ? 'Hide stats' : 'Show stats'}
        >
          Stats
        </button>
      </div>

      {/* Speaker stats */}
      {showStats && <SpeakerStatsBar stats={transcript.speakerStats} />}

      {/* Key moments */}
      <KeyMomentsList moments={transcript.keyMoments} onJumpTo={jumpToSegment} />

      {/* Transcript segments */}
      <div ref={containerRef} className="flex-1 overflow-y-auto space-y-1.5 pr-1">
        {filteredSegments.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-500">
            {searchQuery ? 'No matching segments found' : 'No transcript available'}
          </div>
        ) : (
          filteredSegments.map(seg => {
            const isAgent = seg.speaker === 'agent'
            const isSystem = seg.speaker === 'system'
            const isActive = seg.id === activeSegmentId
            const km = seg.isKeyMoment && seg.keyMomentType
              ? KEY_MOMENT_COLORS[seg.keyMomentType]
              : null

            return (
              <div
                key={seg.id}
                ref={el => { if (el) segmentRefs.current.set(seg.id, el) }}
                className={`group flex gap-2 ${isAgent ? '' : 'flex-row-reverse'} ${isActive ? 'ring-1 ring-brand-blue-500/40 rounded-lg' : ''}`}
              >
                {/* Bubble */}
                <div
                  className={`relative max-w-[80%] rounded-lg px-3 py-2 text-sm transition-colors ${
                    isSystem
                      ? 'bg-gray-800/50 text-gray-500 italic text-xs mx-auto max-w-full text-center'
                      : isAgent
                      ? 'bg-gray-800 text-gray-200'
                      : 'bg-brand-blue-900/30 text-gray-200'
                  } ${km ? `border-l-2 ${km.dot.replace('bg-', 'border-')}` : ''}`}
                >
                  {/* Speaker label + timestamp */}
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-xs font-medium ${isAgent ? 'text-brand-blue-400' : 'text-blue-400'}`}>
                      {seg.speakerLabel}
                    </span>
                    {seg.timestamp !== null && (
                      <button
                        onClick={() => onSeekTo?.(seg.timestamp!)}
                        className="text-xs text-gray-600 hover:text-gray-400 tabular-nums transition-colors"
                        title="Jump to this point"
                      >
                        {formatTimestamp(seg.timestamp)}
                      </button>
                    )}
                    {/* Key moment badge */}
                    {km && seg.keyMomentType && (
                      <span className={`text-[10px] rounded-full px-1.5 ${km.bg} ${km.text}`}>
                        {seg.keyMomentType.replace('_', ' ')}
                      </span>
                    )}
                    {/* Sentiment indicator */}
                    {seg.sentiment === 'positive' && !isSystem && (
                      <span className="text-[10px] text-blue-500" title="Positive sentiment">+</span>
                    )}
                    {seg.sentiment === 'negative' && !isSystem && (
                      <span className="text-[10px] text-red-400" title="Negative sentiment">-</span>
                    )}
                  </div>

                  {/* Text content */}
                  <p className="leading-relaxed">
                    <HighlightedText text={seg.text} query={searchQuery} />
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
