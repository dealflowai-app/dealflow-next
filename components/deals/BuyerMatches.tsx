'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Users, Phone, Mail, Send, ChevronRight,
  Loader2, MapPin, DollarSign, TrendingUp, Star,
} from 'lucide-react'

/* ═══════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════ */

interface ScoreBreakdown {
  market: number
  priceRange: number
  strategy: number
  buyerScore: number
}

interface MatchResult {
  buyerId: string
  buyerName: string
  phone: string | null
  email: string | null
  entityName: string | null
  status: string
  strategy: string | null
  totalScore: number
  breakdown: ScoreBreakdown
  reasons: string[]
}

interface BuyerMatchesProps {
  dealId: string
}

/* ═══════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════ */

const FONT = "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"

const strategyLabels: Record<string, string> = {
  FLIP: 'Flip',
  HOLD: 'Hold',
  BOTH: 'Flip/Hold',
  LAND: 'Land',
  COMMERCIAL: 'Commercial',
}

/* ═══════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════ */

function scoreBarColor(score: number): string {
  if (score > 70) return '#22c55e'  // green
  if (score > 40) return '#eab308'  // yellow
  return '#ef4444'                   // red
}

function scoreBarBg(score: number): string {
  if (score > 70) return 'rgba(34,197,94,0.10)'
  if (score > 40) return 'rgba(234,179,8,0.10)'
  return 'rgba(239,68,68,0.10)'
}

function scoreLabelColor(score: number): string {
  if (score > 70) return '#16a34a'
  if (score > 40) return '#ca8a04'
  return '#dc2626'
}

/* ═══════════════════════════════════════════════
   SKELETON LOADER
   ═══════════════════════════════════════════════ */

function MatchSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-[10px] p-4 animate-pulse"
          style={{
            background: 'var(--dash-card, #fff)',
            border: '1px solid var(--dash-card-border, rgba(0,0,0,0.06))',
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gray-200 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 rounded bg-gray-200" />
              <div className="h-3 w-48 rounded bg-gray-100" />
            </div>
            <div className="h-8 w-16 rounded-lg bg-gray-200" />
          </div>
          <div className="mt-3 h-2 w-full rounded-full bg-gray-100" />
        </div>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════
   SCORE BREAKDOWN TOOLTIP
   ═══════════════════════════════════════════════ */

function BreakdownTooltip({ breakdown, reasons }: { breakdown: ScoreBreakdown; reasons: string[] }) {
  const items = [
    { label: 'Market', score: breakdown.market, max: 40, icon: MapPin },
    { label: 'Price', score: breakdown.priceRange, max: 25, icon: DollarSign },
    { label: 'Strategy', score: breakdown.strategy, max: 20, icon: TrendingUp },
    { label: 'Buyer', score: breakdown.buyerScore, max: 15, icon: Star },
  ]

  return (
    <div
      className="absolute z-[120] right-0 top-full mt-2 w-[280px] rounded-[10px] p-4 shadow-xl"
      style={{
        background: 'var(--dash-card, #fff)',
        border: '1px solid var(--dash-card-border, rgba(0,0,0,0.08))',
        fontFamily: FONT,
      }}
    >
      <div className="text-[0.72rem] font-semibold text-gray-500 uppercase tracking-wider mb-3">
        Score Breakdown
      </div>
      <div className="space-y-2.5">
        {items.map((item) => {
          const Icon = item.icon
          const pct = Math.round((item.score / item.max) * 100)
          return (
            <div key={item.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="flex items-center gap-1.5 text-[0.76rem] text-gray-600">
                  <Icon className="w-3 h-3 text-gray-400" />
                  {item.label}
                </span>
                <span className="text-[0.72rem] font-semibold text-gray-700">
                  {item.score}/{item.max}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${pct}%`, background: scoreBarColor(pct) }}
                />
              </div>
            </div>
          )
        })}
      </div>
      {reasons.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
          {reasons.slice(0, 4).map((r, i) => (
            <div key={i} className="text-[0.68rem] text-gray-400 leading-relaxed">
              {r}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════ */

export default function BuyerMatches({ dealId }: BuyerMatchesProps) {
  const [matches, setMatches] = useState<MatchResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchMatches() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/deals/${dealId}/matches`)
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Failed to fetch matches')
        }
        const data = await res.json()
        if (!cancelled) {
          setMatches(data.matches || [])
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Something went wrong')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchMatches()
    return () => { cancelled = true }
  }, [dealId])

  /* ── Loading ── */
  if (loading) {
    return <MatchSkeleton />
  }

  /* ── Error ── */
  if (error) {
    return (
      <div
        className="rounded-[10px] p-6 text-center"
        style={{
          background: 'rgba(239,68,68,0.04)',
          border: '1px solid rgba(239,68,68,0.12)',
          fontFamily: FONT,
        }}
      >
        <div className="text-[0.86rem] text-red-600 font-medium mb-1">Failed to load matches</div>
        <div className="text-[0.78rem] text-red-400">{error}</div>
      </div>
    )
  }

  /* ── Empty state ── */
  if (matches.length === 0) {
    return (
      <div
        className="rounded-[10px] p-8 text-center"
        style={{
          background: 'var(--dash-card, #fff)',
          border: '1px solid var(--dash-card-border, rgba(0,0,0,0.06))',
          fontFamily: FONT,
        }}
      >
        <Users className="w-8 h-8 text-gray-300 mx-auto mb-3" />
        <div className="text-[0.86rem] text-gray-500 font-medium mb-1">
          No matching buyers found
        </div>
        <div className="text-[0.78rem] text-gray-400">
          Try adding more buyers to your list.
        </div>
      </div>
    )
  }

  /* ── Matches list ── */
  return (
    <div className="space-y-2">
      {matches.map((match) => {
        const color = scoreBarColor(match.totalScore)
        const bgColor = scoreBarBg(match.totalScore)
        const labelColor = scoreLabelColor(match.totalScore)

        return (
          <div
            key={match.buyerId}
            className="rounded-[10px] p-4 transition-all duration-150 hover:shadow-sm"
            style={{
              background: 'var(--dash-card, #fff)',
              border: '1px solid var(--dash-card-border, rgba(0,0,0,0.06))',
              fontFamily: FONT,
            }}
          >
            {/* Header row */}
            <div className="flex items-start gap-3">
              {/* Avatar placeholder */}
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-[0.72rem] font-bold shrink-0"
                style={{ background: bgColor, color: labelColor }}
              >
                {match.buyerName.charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <Link
                    href={`/crm/${match.buyerId}`}
                    className="text-[0.86rem] font-semibold text-gray-900 hover:text-[#2563EB] transition-colors no-underline truncate"
                  >
                    {match.buyerName}
                  </Link>
                  {match.strategy && (
                    <span
                      className="text-[0.64rem] px-1.5 py-0.5 rounded-full font-medium shrink-0"
                      style={{ background: 'rgba(37,99,235,0.06)', color: '#2563EB' }}
                    >
                      {strategyLabels[match.strategy] || match.strategy}
                    </span>
                  )}
                </div>

                {/* Contact info */}
                <div className="flex items-center gap-3 text-[0.74rem] text-gray-400">
                  {match.phone && (
                    <span className="flex items-center gap-1 truncate">
                      <Phone className="w-3 h-3" />
                      {match.phone}
                    </span>
                  )}
                  {match.email && (
                    <span className="flex items-center gap-1 truncate">
                      <Mail className="w-3 h-3" />
                      {match.email}
                    </span>
                  )}
                </div>
              </div>

              {/* Score + tooltip */}
              <div
                className="relative shrink-0"
                onMouseEnter={() => setHoveredId(match.buyerId)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg cursor-default"
                  style={{ background: bgColor }}
                >
                  <span
                    className="text-[1rem] font-bold"
                    style={{ color: labelColor }}
                  >
                    {match.totalScore}
                  </span>
                  <span className="text-[0.62rem] font-medium uppercase tracking-wide" style={{ color: labelColor, opacity: 0.7 }}>
                    pts
                  </span>
                </div>

                {hoveredId === match.buyerId && (
                  <BreakdownTooltip breakdown={match.breakdown} reasons={match.reasons} />
                )}
              </div>
            </div>

            {/* Score bar */}
            <div className="mt-3 h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${match.totalScore}%`, background: color }}
              />
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 mt-3">
              <Link
                href={`/crm/${match.buyerId}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] text-[0.74rem] font-medium text-gray-600 no-underline transition-colors hover:bg-gray-50"
                style={{ border: '1px solid rgba(0,0,0,0.08)' }}
              >
                <ChevronRight className="w-3 h-3" />
                Contact
              </Link>
              <button
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] text-[0.74rem] font-medium text-[#2563EB] bg-[rgba(37,99,235,0.06)] border-0 cursor-pointer transition-colors hover:bg-[rgba(37,99,235,0.12)]"
              >
                <Send className="w-3 h-3" />
                Add to Campaign
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
