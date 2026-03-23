'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  formatPhoneDisplay,
  toDialableE164,
  fetchTwilioToken,
  runComplianceCheck,
  logManualCall,
  openNativeDialer,
} from '@/lib/outreach/browser-calling'

// ─── Click-to-Call Component ────────────────────────────────────────────────
// Initiates a call to a buyer from anywhere in the app.
// - If Twilio Client is configured: browser-based WebRTC call
// - If not: falls back to tel: link (native dialer)
// Shows an active call overlay with controls and outcome logging.

export interface ClickToCallProps {
  buyerId: string
  buyerName: string
  phone: string
  campaignId?: string
  compact?: boolean                // small icon button vs full button
  onCallStarted?: (callSid: string) => void
  onCallEnded?: (outcome: string, duration: number) => void
}

const OUTCOMES = [
  { value: 'QUALIFIED', label: 'Qualified', color: 'bg-blue-500/20 text-blue-700 border-blue-300' },
  { value: 'NOT_BUYING', label: 'Not Buying', color: 'bg-gray-200 text-gray-700 border-gray-300' },
  { value: 'NO_ANSWER', label: 'No Answer', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  { value: 'VOICEMAIL', label: 'Voicemail', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { value: 'WRONG_NUMBER', label: 'Wrong Number', color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { value: 'CALLBACK_REQUESTED', label: 'Callback', color: 'bg-purple-100 text-purple-700 border-purple-300' },
  { value: 'DO_NOT_CALL', label: 'Do Not Call', color: 'bg-red-100 text-red-700 border-red-300' },
]

const QUICK_TAGS = [
  'Interested in SFR',
  'Wants Phoenix deals',
  'Proof of funds verified',
  'Call back Thursday',
  'Wants under $200K',
  'Multi-family investor',
]

type CallPhase = 'idle' | 'compliance' | 'connecting' | 'ringing' | 'in-progress' | 'ended'

export default function ClickToCall({
  buyerId,
  buyerName,
  phone,
  campaignId,
  compact = false,
  onCallStarted,
  onCallEnded,
}: ClickToCallProps) {
  const [phase, setPhase] = useState<CallPhase>('idle')
  const [duration, setDuration] = useState(0)
  const [callSid, setCallSid] = useState<string | null>(null)
  const [muted, setMuted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showOutcome, setShowOutcome] = useState(false)
  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [useBrowser, setUseBrowser] = useState(false)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<Date | null>(null)
  const twilioDeviceRef = useRef<unknown>(null)
  const twilioConnectionRef = useRef<unknown>(null)

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const startTimer = useCallback(() => {
    startTimeRef.current = new Date()
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

  const handleCall = async () => {
    setError(null)
    setPhase('compliance')

    // 1. Compliance check
    const compliance = await runComplianceCheck(phone, buyerId)
    if (!compliance.allowed) {
      setError(compliance.reason || 'Blocked by compliance check')
      setPhase('idle')
      return
    }

    // 2. Check if Twilio Client is available
    const tokenResult = await fetchTwilioToken()

    if (tokenResult.available && tokenResult.token) {
      setUseBrowser(true)
      setPhase('connecting')

      try {
        // Dynamically load Twilio Client SDK
        const Twilio = (window as any).Twilio
        if (!Twilio?.Device) {
          // SDK not loaded — fall back to tel:
          setUseBrowser(false)
          openNativeDialer(phone)
          setPhase('in-progress')
          startTimer()
          return
        }

        const device = new Twilio.Device(tokenResult.token, {
          codecPreferences: ['opus', 'pcmu'],
          edge: 'ashburn',
        })

        twilioDeviceRef.current = device

        const params = { To: toDialableE164(phone) }
        const connection = await device.connect({ params })
        twilioConnectionRef.current = connection

        const sid = connection.parameters?.CallSid || `browser_${Date.now()}`
        setCallSid(sid)
        onCallStarted?.(sid)

        connection.on('ringing', () => setPhase('ringing'))
        connection.on('accept', () => {
          setPhase('in-progress')
          startTimer()
        })
        connection.on('disconnect', () => {
          setPhase('ended')
          stopTimer()
          setShowOutcome(true)
        })
        connection.on('error', (err: Error) => {
          setError(err.message)
          setPhase('ended')
          stopTimer()
          setShowOutcome(true)
        })
        connection.on('cancel', () => {
          setPhase('ended')
          stopTimer()
          setShowOutcome(true)
        })
      } catch {
        // Twilio Client failed — fall back to tel:
        setUseBrowser(false)
        openNativeDialer(phone)
        setPhase('in-progress')
        startTimer()
      }
    } else {
      // No Twilio Client — use native dialer
      setUseBrowser(false)
      openNativeDialer(phone)
      setPhase('in-progress')
      startTimer()
    }
  }

  const handleEndCall = () => {
    try {
      const conn = twilioConnectionRef.current as any
      if (conn?.disconnect) conn.disconnect()
      const device = twilioDeviceRef.current as any
      if (device?.disconnectAll) device.disconnectAll()
    } catch {
      // ignore cleanup errors
    }
    setPhase('ended')
    stopTimer()
    setShowOutcome(true)
  }

  const handleMute = () => {
    const conn = twilioConnectionRef.current as any
    if (conn?.mute) {
      conn.mute(!muted)
      setMuted(!muted)
    }
  }

  const handleSaveOutcome = async () => {
    setSaving(true)
    const result = await logManualCall({
      buyerId,
      phoneNumber: toDialableE164(phone),
      outcome: selectedOutcome || undefined,
      durationSecs: duration,
      notes: notes || undefined,
      callSid: callSid || undefined,
      campaignId,
    })

    if (result.success && selectedOutcome) {
      onCallEnded?.(selectedOutcome, duration)
    }

    setSaving(false)
    // Reset state
    setPhase('idle')
    setShowOutcome(false)
    setSelectedOutcome(null)
    setNotes('')
    setDuration(0)
    setCallSid(null)
    setMuted(false)
    setUseBrowser(false)
    twilioConnectionRef.current = null
    twilioDeviceRef.current = null
  }

  const handleAddQuickTag = (tag: string) => {
    setNotes(prev => prev ? `${prev}. ${tag}` : tag)
  }

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const statusLabel = (p: CallPhase) => {
    switch (p) {
      case 'compliance': return 'Checking compliance...'
      case 'connecting': return 'Connecting...'
      case 'ringing': return 'Ringing...'
      case 'in-progress': return 'In Progress'
      case 'ended': return 'Call Ended'
      default: return ''
    }
  }

  // ── Idle state: just the call button ──────────────────────────────────
  if (phase === 'idle' && !showOutcome) {
    return (
      <div className="inline-flex flex-col items-start">
        {compact ? (
          <button
            onClick={handleCall}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
            title={`Call ${buyerName}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          </button>
        ) : (
          <button
            onClick={handleCall}
            className="inline-flex items-center gap-1.5 rounded-[8px] bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            Call {buyerName.split(' ')[0]}
          </button>
        )}
        {error && (
          <span className="mt-1 text-xs text-red-500">{error}</span>
        )}
      </div>
    )
  }

  // ── Active call / Outcome logging overlay ─────────────────────────────
  return (
    <>
      {/* Trigger button still visible when in compact mode */}
      {compact && phase !== 'idle' && (
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-100 text-red-500 animate-pulse">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
        </span>
      )}

      {/* Floating call panel — bottom-right, doesn't block the UI */}
      <div className="fixed bottom-4 right-4 z-50 w-[360px] rounded-[10px] bg-white shadow-lg border border-gray-200 overflow-hidden">
        {/* Call header */}
        <div className={`px-4 py-3 ${phase === 'in-progress' ? 'bg-blue-50' : phase === 'ended' ? 'bg-gray-50' : 'bg-blue-50'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm text-sm font-bold text-gray-600">
                {buyerName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">{buyerName}</div>
                <div className="text-xs text-gray-500">{formatPhoneDisplay(phone)}</div>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-xs font-medium ${
                phase === 'in-progress' ? 'text-blue-600' :
                phase === 'ringing' ? 'text-blue-600' :
                phase === 'ended' ? 'text-gray-500' :
                'text-gray-500'
              }`}>
                {statusLabel(phase)}
              </div>
              {(phase === 'in-progress' || phase === 'ended') && (
                <div className="text-lg font-mono font-bold text-gray-900 tabular-nums">
                  {formatDuration(duration)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Call controls (during active call) */}
        {(phase === 'connecting' || phase === 'ringing' || phase === 'in-progress') && (
          <div className="flex items-center justify-center gap-4 px-4 py-3 border-t border-gray-100">
            {/* Mute (browser only) */}
            {useBrowser && (
              <button
                onClick={handleMute}
                className={`flex h-10 w-10 items-center justify-center rounded-full border transition-colors ${
                  muted ? 'bg-red-100 border-red-200 text-red-600' : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200'
                }`}
                title={muted ? 'Unmute' : 'Mute'}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {muted ? (
                    <>
                      <line x1="1" y1="1" x2="23" y2="23" />
                      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                      <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .76-.12 1.49-.34 2.18" />
                      <line x1="12" y1="19" x2="12" y2="23" />
                      <line x1="8" y1="23" x2="16" y2="23" />
                    </>
                  ) : (
                    <>
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" y1="19" x2="12" y2="23" />
                      <line x1="8" y1="23" x2="16" y2="23" />
                    </>
                  )}
                </svg>
              </button>
            )}

            {/* End call */}
            <button
              onClick={handleEndCall}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors shadow-md"
              title="End call"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91" />
                <line x1="23" y1="1" x2="1" y2="23" />
              </svg>
            </button>

            {/* Skip to outcome (for tel: fallback — user manually ends their phone call) */}
            {!useBrowser && (
              <button
                onClick={() => { stopTimer(); setPhase('ended'); setShowOutcome(true) }}
                className="flex h-10 items-center rounded-full bg-gray-100 border border-gray-200 px-3 text-xs font-medium text-gray-600 hover:bg-gray-200 transition-colors"
              >
                Log Outcome
              </button>
            )}
          </div>
        )}

        {/* Outcome logging (after call ends) */}
        {showOutcome && (
          <div className="px-4 py-3 border-t border-gray-100 max-h-[400px] overflow-y-auto">
            <div className="text-xs font-medium text-gray-500 mb-2">Call Outcome</div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {OUTCOMES.map(o => (
                <button
                  key={o.value}
                  onClick={() => setSelectedOutcome(o.value)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium border transition-colors ${
                    selectedOutcome === o.value
                      ? o.color + ' ring-2 ring-offset-1 ring-gray-400'
                      : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>

            <div className="text-xs font-medium text-gray-500 mb-1.5">Notes</div>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Call notes..."
              rows={2}
              className="w-full rounded-[8px] border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 resize-none"
            />

            {/* Quick tags */}
            <div className="flex flex-wrap gap-1 mt-1.5 mb-3">
              {QUICK_TAGS.map(tag => (
                <button
                  key={tag}
                  onClick={() => handleAddQuickTag(tag)}
                  className="text-[10px] rounded-full bg-gray-100 px-2 py-0.5 text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                >
                  + {tag}
                </button>
              ))}
            </div>

            <button
              onClick={handleSaveOutcome}
              disabled={saving || !selectedOutcome}
              className="w-full rounded-[8px] bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Saving...' : 'Save & Close'}
            </button>
          </div>
        )}
      </div>
    </>
  )
}
