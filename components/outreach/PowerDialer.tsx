'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  formatPhoneDisplay,
  toDialableE164,
  runComplianceCheck,
  logManualCall,
  openNativeDialer,
  fetchTwilioToken,
} from '@/lib/outreach/browser-calling'

// ─── Power Dialer ───────────────────────────────────────────────────────────
// Focused calling mode that auto-advances through a list of buyers.
// Three-panel layout: queue (left), active call (center), buyer context (right).

export interface DialerBuyer {
  id: string
  name: string
  phone: string
  score: number
  status: string
  notes?: string
  strategy?: string | null
  preferredTypes?: string[]
  preferredMarkets?: string[]
  minPrice?: number | null
  maxPrice?: number | null
  closeSpeedDays?: number | null
  lastContactedAt?: string | null
}

export interface DialerResult {
  buyerId: string
  buyerName: string
  outcome: string
  duration: number
  notes: string
}

export interface PowerDialerProps {
  buyers: DialerBuyer[]
  campaignId?: string
  onComplete?: (results: DialerResult[]) => void
  onClose?: () => void
}

const OUTCOMES = [
  { value: 'QUALIFIED', label: 'Qualified', color: 'bg-emerald-500 text-white', shortcut: 'Q' },
  { value: 'NOT_BUYING', label: 'Not Buying', color: 'bg-gray-500 text-white', shortcut: 'N' },
  { value: 'NO_ANSWER', label: 'No Answer', color: 'bg-yellow-500 text-white', shortcut: 'A' },
  { value: 'VOICEMAIL', label: 'Voicemail', color: 'bg-blue-500 text-white', shortcut: 'V' },
  { value: 'CALLBACK_REQUESTED', label: 'Callback', color: 'bg-purple-500 text-white', shortcut: 'C' },
  { value: 'WRONG_NUMBER', label: 'Wrong #', color: 'bg-orange-500 text-white', shortcut: 'W' },
  { value: 'DO_NOT_CALL', label: 'DNC', color: 'bg-red-600 text-white', shortcut: 'D' },
]

type BuyerState = 'pending' | 'calling' | 'logging' | 'done' | 'skipped' | 'compliance_skip'

interface QueueEntry {
  buyer: DialerBuyer
  state: BuyerState
  outcome?: string
  duration?: number
  notes?: string
  skipReason?: string
}

function formatPrice(n: number | null | undefined): string {
  if (n == null) return '--'
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `$${Math.round(n / 1000)}K`
  return `$${n}`
}

export default function PowerDialer({ buyers, campaignId, onComplete, onClose }: PowerDialerProps) {
  const [queue, setQueue] = useState<QueueEntry[]>(() =>
    buyers.map(b => ({ buyer: b, state: 'pending' as BuyerState })),
  )
  const [currentIndex, setCurrentIndex] = useState(0)
  const [phase, setPhase] = useState<'idle' | 'calling' | 'logging' | 'countdown' | 'complete'>('idle')
  const [duration, setDuration] = useState(0)
  const [countdown, setCountdown] = useState(3)
  const [paused, setPaused] = useState(false)
  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [sessionResults, setSessionResults] = useState<DialerResult[]>([])

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<Date | null>(null)

  const current = queue[currentIndex]
  const completedCount = queue.filter(q => q.state === 'done').length
  const qualifiedCount = sessionResults.filter(r => r.outcome === 'QUALIFIED').length
  const totalDuration = sessionResults.reduce((sum, r) => sum + r.duration, 0)
  const avgDuration = completedCount > 0 ? Math.round(totalDuration / completedCount) : 0

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [])

  const startTimer = useCallback(() => {
    startTimeRef.current = new Date()
    setDuration(0)
    timerRef.current = setInterval(() => {
      if (startTimeRef.current) {
        setDuration(Math.floor((Date.now() - startTimeRef.current.getTime()) / 1000))
      }
    }, 1000)
  }, [])

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const dialCurrent = useCallback(async () => {
    if (!current || current.state !== 'pending') return

    // Update queue state
    setQueue(q => q.map((entry, i) => i === currentIndex ? { ...entry, state: 'calling' } : entry))
    setPhase('calling')
    setSelectedOutcome(null)
    setNotes('')

    // Compliance check
    const compliance = await runComplianceCheck(current.buyer.phone, current.buyer.id)
    if (!compliance.allowed) {
      // Auto-skip with compliance note
      setQueue(q => q.map((entry, i) =>
        i === currentIndex ? { ...entry, state: 'compliance_skip', skipReason: compliance.reason } : entry,
      ))
      advanceToNext()
      return
    }

    // Initiate call (try browser, fall back to tel:)
    const tokenResult = await fetchTwilioToken()
    if (tokenResult.available) {
      const Twilio = (window as any).Twilio
      if (Twilio?.Device) {
        try {
          const device = new Twilio.Device(tokenResult.token)
          const conn = await device.connect({ params: { To: toDialableE164(current.buyer.phone) } })
          conn.on('accept', () => startTimer())
          conn.on('disconnect', () => { stopTimer(); setPhase('logging') })
          conn.on('error', () => { stopTimer(); setPhase('logging') })
          return
        } catch { /* fall through to tel: */ }
      }
    }

    // Fallback: open native dialer
    openNativeDialer(current.buyer.phone)
    startTimer()
  }, [current, currentIndex, startTimer, stopTimer])

  const advanceToNext = useCallback(() => {
    const nextIdx = queue.findIndex((q, i) => i > currentIndex && q.state === 'pending')
    if (nextIdx === -1) {
      // Queue exhausted
      setPhase('complete')
      onComplete?.(sessionResults)
      return
    }
    setCurrentIndex(nextIdx)
    setPhase('idle')
  }, [currentIndex, queue, sessionResults, onComplete])

  const startCountdown = useCallback(() => {
    setCountdown(3)
    setPhase('countdown')
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current)
          countdownRef.current = null
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [])

  // Auto-dial when countdown hits 0
  useEffect(() => {
    if (phase === 'countdown' && countdown === 0 && !paused) {
      dialCurrent()
    }
  }, [phase, countdown, paused, dialCurrent])

  const handleEndCall = () => {
    stopTimer()
    setPhase('logging')
  }

  const handleSaveOutcome = async () => {
    if (!selectedOutcome || !current) return
    setSaving(true)

    await logManualCall({
      buyerId: current.buyer.id,
      phoneNumber: toDialableE164(current.buyer.phone),
      outcome: selectedOutcome,
      durationSecs: duration,
      notes: notes || undefined,
      campaignId,
    })

    const result: DialerResult = {
      buyerId: current.buyer.id,
      buyerName: current.buyer.name,
      outcome: selectedOutcome,
      duration,
      notes,
    }

    setSessionResults(prev => [...prev, result])
    setQueue(q => q.map((entry, i) =>
      i === currentIndex ? { ...entry, state: 'done', outcome: selectedOutcome, duration, notes } : entry,
    ))

    setSaving(false)
    setDuration(0)

    // Advance to next
    const nextIdx = queue.findIndex((q, i) => i > currentIndex && q.state === 'pending')
    if (nextIdx === -1) {
      setPhase('complete')
      onComplete?.([...sessionResults, result])
      return
    }

    setCurrentIndex(nextIdx)
    if (!paused) {
      startCountdown()
    } else {
      setPhase('idle')
    }
  }

  const handleSkip = () => {
    setQueue(q => q.map((entry, i) =>
      i === currentIndex ? { ...entry, state: 'skipped' } : entry,
    ))
    stopTimer()
    advanceToNext()
  }

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const formatTotalTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    return `${m} min`
  }

  const outcomeColor = (outcome?: string) => {
    switch (outcome) {
      case 'QUALIFIED': return 'bg-emerald-100 text-emerald-700'
      case 'NOT_BUYING': return 'bg-gray-200 text-gray-600'
      case 'NO_ANSWER': case 'VOICEMAIL': return 'bg-yellow-100 text-yellow-700'
      case 'DO_NOT_CALL': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-500'
    }
  }

  // ── Complete screen ──────────────────────────────────────────────────
  if (phase === 'complete') {
    return (
      <div className="fixed inset-0 z-50 bg-gray-900/80 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Session Complete</h2>
          <p className="text-sm text-gray-500 mb-4">{sessionResults.length} calls completed</p>

          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-gray-900">{sessionResults.length}</div>
              <div className="text-xs text-gray-500">Calls</div>
            </div>
            <div className="bg-emerald-50 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-emerald-600">{qualifiedCount}</div>
              <div className="text-xs text-gray-500">Qualified</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-blue-600">{formatDuration(avgDuration)}</div>
              <div className="text-xs text-gray-500">Avg Duration</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-gray-900">{formatTotalTime(totalDuration)}</div>
              <div className="text-xs text-gray-500">Total Time</div>
            </div>
          </div>

          <div className="max-h-[200px] overflow-y-auto space-y-1 mb-4">
            {sessionResults.map((r, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded bg-gray-50 text-sm">
                <span className="text-gray-700">{r.buyerName}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{formatDuration(r.duration)}</span>
                  <span className={`text-xs rounded-full px-2 py-0.5 ${outcomeColor(r.outcome)}`}>
                    {r.outcome.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={onClose}
            className="w-full rounded-lg bg-gray-900 py-2.5 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    )
  }

  // ── Main dialer layout ────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2.5 bg-gray-50">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <h1 className="text-sm font-bold text-gray-900">Power Dialer</h1>
        </div>

        {/* Session stats */}
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>{completedCount} / {queue.length} calls</span>
          <span className="text-emerald-600 font-medium">{qualifiedCount} qualified</span>
          <span>{formatDuration(avgDuration)} avg</span>
          <span>{formatTotalTime(totalDuration)} total</span>
          <button
            onClick={() => setPaused(!paused)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              paused ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            {paused ? 'Paused' : 'Pause Auto'}
          </button>
        </div>
      </div>

      {/* Three-panel layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Queue */}
        <div className="w-[280px] border-r border-gray-200 overflow-y-auto bg-gray-50">
          <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-50 border-b border-gray-100">
            Queue ({queue.filter(q => q.state === 'pending').length} remaining)
          </div>
          {queue.map((entry, i) => (
            <div
              key={entry.buyer.id}
              className={`flex items-center gap-2 px-3 py-2 border-b border-gray-100 transition-colors ${
                i === currentIndex ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
              } ${entry.state === 'done' ? 'opacity-60' : ''}`}
            >
              {/* State indicator */}
              <div className={`flex-shrink-0 w-2 h-2 rounded-full ${
                entry.state === 'calling' ? 'bg-emerald-500 animate-pulse' :
                entry.state === 'done' ? (entry.outcome === 'QUALIFIED' ? 'bg-emerald-500' : 'bg-gray-400') :
                entry.state === 'skipped' ? 'bg-yellow-400' :
                entry.state === 'compliance_skip' ? 'bg-red-400' :
                entry.state === 'logging' ? 'bg-blue-500' :
                'bg-gray-300'
              }`} />

              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-gray-800 truncate">{entry.buyer.name}</div>
                <div className="text-[10px] text-gray-500">{formatPhoneDisplay(entry.buyer.phone)}</div>
              </div>

              <div className="flex-shrink-0 flex items-center gap-1">
                <span className="text-[10px] font-bold text-gray-400">{entry.buyer.score}</span>
                {entry.outcome && (
                  <span className={`text-[9px] rounded px-1 py-0.5 ${outcomeColor(entry.outcome)}`}>
                    {entry.outcome.split('_')[0]}
                  </span>
                )}
                {entry.state === 'compliance_skip' && (
                  <span className="text-[9px] rounded px-1 py-0.5 bg-red-100 text-red-600">DNC</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Center: Active call */}
        <div className="flex-1 flex flex-col items-center justify-center px-8">
          {phase === 'idle' && current && (
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-gray-400">{current.buyer.name.charAt(0)}</span>
              </div>
              <div className="text-lg font-bold text-gray-900 mb-1">{current.buyer.name}</div>
              <div className="text-sm text-gray-500 mb-6">{formatPhoneDisplay(current.buyer.phone)}</div>
              <div className="flex items-center gap-3">
                <button
                  onClick={dialCurrent}
                  className="rounded-full bg-emerald-600 px-8 py-3 text-sm font-bold text-white hover:bg-emerald-500 transition-colors shadow-lg"
                >
                  Start Calling
                </button>
                <button
                  onClick={handleSkip}
                  className="rounded-full bg-gray-200 px-5 py-3 text-sm font-medium text-gray-600 hover:bg-gray-300 transition-colors"
                >
                  Skip
                </button>
              </div>
            </div>
          )}

          {phase === 'countdown' && current && (
            <div className="text-center">
              <div className="text-6xl font-bold text-blue-600 mb-2 tabular-nums">{countdown}</div>
              <div className="text-sm text-gray-500 mb-1">Dialing {current.buyer.name} in...</div>
              <div className="flex items-center gap-2 mt-4">
                <button
                  onClick={() => { if (countdownRef.current) clearInterval(countdownRef.current); setCountdown(0) }}
                  className="rounded-full bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
                >
                  Dial Now
                </button>
                <button
                  onClick={handleSkip}
                  className="rounded-full bg-gray-200 px-5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-300 transition-colors"
                >
                  Skip
                </button>
              </div>
            </div>
          )}

          {phase === 'calling' && current && (
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4 ring-4 ring-emerald-200 animate-pulse">
                <span className="text-2xl font-bold text-emerald-600">{current.buyer.name.charAt(0)}</span>
              </div>
              <div className="text-lg font-bold text-gray-900 mb-1">{current.buyer.name}</div>
              <div className="text-3xl font-mono font-bold text-gray-900 mb-1 tabular-nums">{formatDuration(duration)}</div>
              <div className="text-sm text-emerald-600 font-medium mb-6">In Progress</div>
              <button
                onClick={handleEndCall}
                className="rounded-full bg-red-500 px-8 py-3 text-sm font-bold text-white hover:bg-red-600 transition-colors shadow-lg"
              >
                End Call
              </button>
            </div>
          )}

          {phase === 'logging' && current && (
            <div className="w-full max-w-md">
              <div className="text-center mb-4">
                <div className="text-sm text-gray-500">{current.buyer.name} &middot; {formatDuration(duration)}</div>
              </div>

              <div className="text-xs font-medium text-gray-500 mb-2">Outcome</div>
              <div className="grid grid-cols-4 gap-1.5 mb-4">
                {OUTCOMES.map(o => (
                  <button
                    key={o.value}
                    onClick={() => setSelectedOutcome(o.value)}
                    className={`rounded-lg py-2 text-xs font-bold transition-all ${
                      selectedOutcome === o.value
                        ? o.color + ' shadow-md scale-105'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>

              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Quick notes..."
                rows={2}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-blue-400 resize-none mb-3"
              />

              <button
                onClick={handleSaveOutcome}
                disabled={saving || !selectedOutcome}
                className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-bold text-white hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Saving...' : 'Save & Next'}
              </button>
            </div>
          )}

          {!current && (
            <div className="text-center text-gray-400">
              <div className="text-lg font-medium mb-2">No more buyers in queue</div>
              <button onClick={onClose} className="text-blue-600 hover:text-blue-500 text-sm">Close Dialer</button>
            </div>
          )}
        </div>

        {/* Right: Buyer context */}
        <div className="w-[280px] border-l border-gray-200 overflow-y-auto bg-gray-50 p-3">
          {current ? (
            <div className="space-y-3">
              <div>
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Buyer Profile</div>
                <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Score</span>
                    <span className={`text-xs font-bold rounded-full px-2 py-0.5 ${
                      current.buyer.score >= 70 ? 'bg-emerald-100 text-emerald-700' :
                      current.buyer.score >= 50 ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>{current.buyer.score}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Status</span>
                    <span className="text-xs text-gray-700">{current.buyer.status.replace(/_/g, ' ')}</span>
                  </div>
                  {current.buyer.strategy && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Strategy</span>
                      <span className="text-xs text-gray-700">{current.buyer.strategy}</span>
                    </div>
                  )}
                  {(current.buyer.minPrice || current.buyer.maxPrice) && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Budget</span>
                      <span className="text-xs text-gray-700">
                        {formatPrice(current.buyer.minPrice)} - {formatPrice(current.buyer.maxPrice)}
                      </span>
                    </div>
                  )}
                  {current.buyer.closeSpeedDays && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Close Speed</span>
                      <span className="text-xs text-gray-700">{current.buyer.closeSpeedDays}d</span>
                    </div>
                  )}
                  {current.buyer.preferredTypes && current.buyer.preferredTypes.length > 0 && (
                    <div>
                      <span className="text-xs text-gray-500 block mb-1">Types</span>
                      <div className="flex flex-wrap gap-1">
                        {current.buyer.preferredTypes.map(t => (
                          <span key={t} className="text-[10px] bg-gray-100 text-gray-600 rounded px-1.5 py-0.5">{t}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {current.buyer.preferredMarkets && current.buyer.preferredMarkets.length > 0 && (
                    <div>
                      <span className="text-xs text-gray-500 block mb-1">Markets</span>
                      <div className="text-xs text-gray-700">{current.buyer.preferredMarkets.join(', ')}</div>
                    </div>
                  )}
                </div>
              </div>

              {current.buyer.notes && (
                <div>
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Notes</div>
                  <div className="bg-white rounded-lg border border-gray-200 p-2 text-xs text-gray-600">
                    {current.buyer.notes}
                  </div>
                </div>
              )}

              {current.buyer.lastContactedAt && (
                <div className="text-xs text-gray-400">
                  Last contacted: {new Date(current.buyer.lastContactedAt).toLocaleDateString()}
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-gray-400 text-center py-8">Select a buyer to view details</div>
          )}
        </div>
      </div>
    </div>
  )
}
