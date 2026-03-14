'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Pause, Square, Phone, CheckCircle2, XCircle,
  VoicemailIcon, ChevronDown, ChevronUp, Clock,
  TrendingUp, Mic, UserPlus, Send, CalendarClock, Ban,
} from 'lucide-react'
import type { Campaign, LiveCall, TranscriptLine, CallOutcome } from './types'
import { DEMO_TRANSCRIPT } from './mockData'

interface LiveCampaignMonitorProps {
  campaign: Campaign
  onPause: () => void
  onStop: () => void
  onResume: () => void
}

const OUTCOME_CONFIG: Record<CallOutcome, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  qualified: { label: 'Qualified', color: '#15803d', bg: '#dcfce7', icon: CheckCircle2 },
  not_buying: { label: 'Not Buying', color: '#b91c1c', bg: '#fee2e2', icon: XCircle },
  no_answer: { label: 'No Answer', color: '#6b7280', bg: '#f3f4f6', icon: Phone },
  voicemail: { label: 'Voicemail', color: '#a16207', bg: '#fef9c3', icon: VoicemailIcon },
  callback: { label: 'Callback', color: '#7c3aed', bg: '#ede9fe', icon: CalendarClock },
  do_not_call: { label: 'Do Not Call', color: '#b91c1c', bg: '#fee2e2', icon: Ban },
}

const MOCK_COMPLETED_NAMES = [
  { name: 'ATL Fast Close LLC', outcome: 'qualified' as CallOutcome, duration: 214, summary: 'Active buyer. SFR focus, $50k-$165k. Closes in 7 days cash. Wants deals sent to email.' },
  { name: 'Heritage Capital Holdings LLC', outcome: 'qualified' as CallOutcome, duration: 187, summary: 'Still buying. Looking for SFR and small multi. Max $220k. Asked for monthly deal list.' },
  { name: 'Sandra G. Morales', outcome: 'not_buying' as CallOutcome, duration: 43, summary: 'On pause for 6 months. Relocated to Florida. Remove from Atlanta list.' },
  { name: 'Jerome & Keisha Williams', outcome: 'no_answer' as CallOutcome, duration: 0, summary: 'No answer. Voicemail not set up. Retry in 4 hours.' },
  { name: 'KeyCity Investors LLC', outcome: 'qualified' as CallOutcome, duration: 256, summary: 'Very active. Multi-family focus in SW Atlanta. Up to $200k. Wants deals 2x/week.' },
  { name: 'Darnell L. Johnson', outcome: 'callback' as CallOutcome, duration: 62, summary: 'Interested but in a meeting. Requested callback at 3pm today.' },
]

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function useLiveTimer(started: boolean) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (!started) return
    const interval = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(interval)
  }, [started])
  return elapsed
}

export default function LiveCampaignMonitor({ campaign, onPause, onStop, onResume }: LiveCampaignMonitorProps) {
  const isRunning = campaign.status === 'running'
  const elapsed = useLiveTimer(isRunning)

  // Live state
  const [activeCalls, setActiveCalls] = useState<LiveCall[]>([])
  const [completedCalls, setCompletedCalls] = useState<typeof MOCK_COMPLETED_NAMES>([])
  const [qualified, setQualified] = useState(campaign.callsQualified)
  const [notBuying, setNotBuying] = useState(campaign.callsNotBuying)
  const [noAnswer, setNoAnswer] = useState(campaign.callsNoAnswer)
  const [transcriptIndex, setTranscriptIndex] = useState(0)
  const [liveTranscript, setLiveTranscript] = useState<TranscriptLine[]>([])
  const [expandedCallId, setExpandedCallId] = useState<string | null>('call-1')
  const [expandedResult, setExpandedResult] = useState<number | null>(null)
  const transcriptRef = useRef<HTMLDivElement>(null)

  const buyersCalled = campaign.buyersCalled + completedCalls.length
  const progressPct = Math.min(100, (buyersCalled / campaign.buyersTotal) * 100)
  const qualifyRate = buyersCalled > 0 ? Math.round(((qualified) / buyersCalled) * 100) : 0

  // Simulate active calls
  useEffect(() => {
    if (!isRunning) return
    setActiveCalls([
      { id: 'call-1', buyerName: 'Marcus D. Williams', buyerPhone: '(404) 555-0247', startedAt: Date.now() - 45000, status: 'in_progress', transcript: [] },
      { id: 'call-2', buyerName: 'Momentum REI Group LLC', buyerPhone: '(404) 555-1334', startedAt: Date.now() - 18000, status: 'ringing', transcript: [] },
      { id: 'call-3', buyerName: 'BlueStar Acquisitions Corp', buyerPhone: '(404) 555-0764', startedAt: Date.now() - 67000, status: 'in_progress', transcript: [] },
    ])
  }, [isRunning])

  // Simulate live transcript
  useEffect(() => {
    if (!isRunning || transcriptIndex >= DEMO_TRANSCRIPT.length) return
    const line = DEMO_TRANSCRIPT[transcriptIndex]
    const wordCount = line.text.split(' ').length
    const delay = Math.max(1200, wordCount * 220)
    const timer = setTimeout(() => {
      setLiveTranscript(prev => [...prev, line])
      setTranscriptIndex(i => i + 1)
      if (transcriptRef.current) {
        transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight
      }
    }, delay)
    return () => clearTimeout(timer)
  }, [isRunning, transcriptIndex])

  // Simulate call completions
  useEffect(() => {
    if (!isRunning) return
    const idx = completedCalls.length
    if (idx >= MOCK_COMPLETED_NAMES.length) return
    const delay = 12000 + idx * 8000
    const timer = setTimeout(() => {
      const result = MOCK_COMPLETED_NAMES[idx]
      setCompletedCalls(prev => [result, ...prev])
      if (result.outcome === 'qualified') setQualified(q => q + 1)
      else if (result.outcome === 'not_buying') setNotBuying(q => q + 1)
      else if (result.outcome === 'no_answer' || result.outcome === 'voicemail') setNoAnswer(q => q + 1)
    }, delay)
    return () => clearTimeout(timer)
  }, [isRunning, completedCalls.length])

  return (
    <div style={{ padding: '20px 32px 32px' }}>
      {/* Campaign header */}
      <div style={{
        background: 'var(--white)', border: '1px solid var(--gray-100)',
        borderRadius: 14, padding: '16px 20px', marginBottom: 16,
        boxShadow: 'var(--shadow-sm)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div>
              <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '1rem', color: 'var(--gray-900)' }}>
                {campaign.name}
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--gray-400)' }}>{campaign.marketName}</p>
            </div>
            <StatusBadge status={campaign.status} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--gray-400)', fontVariantNumeric: 'tabular-nums' }}>
              {formatDuration(elapsed + 1840)} elapsed
            </span>
            {isRunning ? (
              <>
                <button onClick={onPause} style={ctrlBtnStyle('#fef9c3', '#a16207', '#fde68a')}>
                  <Pause style={{ width: 13, height: 13 }} /> Pause
                </button>
                <button onClick={onStop} style={ctrlBtnStyle('#fee2e2', '#b91c1c', '#fecaca')}>
                  <Square style={{ width: 13, height: 13 }} /> Stop
                </button>
              </>
            ) : (
              <button onClick={onResume} style={ctrlBtnStyle('#dcfce7', '#15803d', '#bbf7d0')}>
                <Phone style={{ width: 13, height: 13 }} /> Resume
              </button>
            )}
          </div>
        </div>

        {/* Progress */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: '0.75rem', color: 'var(--gray-500)' }}>
            <span>{buyersCalled} of {campaign.buyersTotal} buyers called</span>
            <span>{progressPct.toFixed(0)}%</span>
          </div>
          <div style={{ height: 6, borderRadius: 99, background: 'var(--gray-100)', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 99, width: `${progressPct}%`,
              background: isRunning
                ? 'linear-gradient(90deg, var(--blue-500), var(--blue-400))'
                : campaign.status === 'paused' ? 'var(--amber)' : 'var(--green)',
              transition: 'width 0.5s ease',
            }} />
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        <StatCard icon={Phone} label="Active Calls" value={isRunning ? activeCalls.filter(c => c.status !== 'ringing').length : 0} color="var(--blue-600)" bg="var(--blue-50)" pulse={isRunning} />
        <StatCard icon={CheckCircle2} label="Qualified" value={qualified} color="#15803d" bg="#dcfce7" />
        <StatCard icon={XCircle} label="Not Buying" value={notBuying} color="#b91c1c" bg="#fee2e2" />
        <StatCard icon={Phone} label="No Answer" value={noAnswer} color="var(--gray-500)" bg="var(--gray-50)" />
      </div>

      {/* Live feed + results */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Left: live calls */}
        <div style={{ background: 'var(--white)', border: '1px solid var(--gray-100)', borderRadius: 14, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--gray-100)', display: 'flex', alignItems: 'center', gap: 6 }}>
            {isRunning && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', display: 'inline-block', animation: 'blink 1.5s infinite' }} />}
            <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--gray-800)' }}>
              {isRunning ? `Live Calls (${activeCalls.length})` : 'Calls Paused'}
            </span>
          </div>
          <div style={{ padding: 0 }}>
            {activeCalls.map((call, i) => (
              <LiveCallRow
                key={call.id}
                call={call}
                isExpanded={expandedCallId === call.id}
                transcript={call.id === 'call-1' ? liveTranscript : []}
                onToggle={() => setExpandedCallId(expandedCallId === call.id ? null : call.id)}
                transcriptRef={call.id === 'call-1' ? transcriptRef : undefined}
              />
            ))}
            {activeCalls.length === 0 && (
              <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: '0.82rem', color: 'var(--gray-400)' }}>
                {campaign.status === 'paused' ? 'Campaign paused - calls suspended' : 'No active calls'}
              </div>
            )}
          </div>
        </div>

        {/* Right: completed */}
        <div style={{ background: 'var(--white)', border: '1px solid var(--gray-100)', borderRadius: 14, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--gray-800)' }}>
              Completed ({completedCalls.length})
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--gray-400)' }}>
              {qualifyRate}% qualify rate
            </span>
          </div>
          <div style={{ maxHeight: 380, overflowY: 'auto' }}>
            {completedCalls.map((call, i) => {
              const cfg = OUTCOME_CONFIG[call.outcome]
              const OutcomeIcon = cfg.icon
              return (
                <div key={i}>
                  <div
                    onClick={() => setExpandedResult(expandedResult === i ? null : i)}
                    style={{
                      padding: '12px 16px', borderBottom: '1px solid var(--gray-100)',
                      cursor: 'pointer', transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--gray-50)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--gray-900)' }}>{call.name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {call.duration > 0 && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--gray-400)' }}>{formatDuration(call.duration)}</span>
                        )}
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 7px', borderRadius: 20, background: cfg.bg, color: cfg.color, fontSize: '0.7rem', fontWeight: 700 }}>
                          <OutcomeIcon style={{ width: 10, height: 10 }} />
                          {cfg.label}
                        </div>
                      </div>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)', lineHeight: 1.4 }}>{call.summary}</p>
                  </div>
                  {expandedResult === i && (
                    <div style={{ padding: '10px 16px', background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-100)' }}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <QuickAction icon={UserPlus} label="Add to CRM" color="var(--blue-600)" />
                        <QuickAction icon={Send} label="Send Deal" color="#7c3aed" />
                        <QuickAction icon={CalendarClock} label="Follow Up" color="#a16207" />
                        <QuickAction icon={Ban} label="Do Not Call" color="#b91c1c" />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
            {completedCalls.length === 0 && (
              <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: '0.82rem', color: 'var(--gray-400)' }}>
                Completed calls will appear here in real time
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Campaign stats footer */}
      <div style={{ background: 'var(--white)', border: '1px solid var(--gray-100)', borderRadius: 14, padding: '16px 20px', boxShadow: 'var(--shadow-sm)' }}>
        <h4 style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--gray-700)', marginBottom: 14 }}>Campaign Stats</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
          <FooterStat label="Total Talk Time" value={formatDuration(campaign.totalTalkSeconds + completedCalls.reduce((a, c) => a + c.duration, 0))} />
          <FooterStat label="Avg Call Duration" value={completedCalls.length > 0 ? formatDuration(Math.round(completedCalls.reduce((a, c) => a + c.duration, 0) / completedCalls.length)) : '-'} />
          <FooterStat label="Qualify Rate" value={qualifyRate > 0 ? `${qualifyRate}%` : '-'} highlight />
          <FooterStat label="Top Objection" value={notBuying > 0 ? 'Not Active' : '-'} />
          <FooterStat label="Calls Remaining" value={String(Math.max(0, campaign.buyersTotal - buyersCalled))} />
        </div>
      </div>
    </div>
  )
}

function LiveCallRow({ call, isExpanded, transcript, onToggle, transcriptRef }: {
  call: LiveCall
  isExpanded: boolean
  transcript: TranscriptLine[]
  onToggle: () => void
  transcriptRef?: React.RefObject<HTMLDivElement>
}) {
  const [callDuration, setCallDuration] = useState(Math.floor((Date.now() - call.startedAt) / 1000))
  useEffect(() => {
    const t = setInterval(() => setCallDuration(Math.floor((Date.now() - call.startedAt) / 1000)), 1000)
    return () => clearInterval(t)
  }, [call.startedAt])

  const isActive = call.status === 'in_progress'
  const statusColor = call.status === 'ringing' ? '#a16207' : '#15803d'

  return (
    <div style={{ borderBottom: '1px solid var(--gray-100)' }}>
      <div
        onClick={onToggle}
        style={{
          padding: '12px 16px', cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'space-between',
          background: isExpanded ? 'var(--blue-50)' : 'transparent',
          transition: 'background 0.1s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: isActive ? '#dcfce7' : '#fef9c3',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Phone style={{ width: 14, height: 14, color: statusColor }} />
            </div>
            {isActive && (
              <span style={{
                position: 'absolute', bottom: -1, right: -1, width: 10, height: 10,
                borderRadius: '50%', background: '#22c55e', border: '2px solid white',
                animation: 'blink 1.5s infinite',
              }} />
            )}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--gray-900)' }}>{call.buyerName}</div>
            <div style={{ fontSize: '0.72rem', color: statusColor, fontWeight: 600 }}>
              {call.status === 'ringing' ? 'Ringing...' : `${formatDuration(callDuration)}`}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {isActive && (
            <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 16 }}>
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="cbar-w" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          )}
          {isExpanded ? <ChevronUp style={{ width: 14, height: 14, color: 'var(--gray-400)' }} /> : <ChevronDown style={{ width: 14, height: 14, color: 'var(--gray-400)' }} />}
        </div>
      </div>

      {isExpanded && (
        <div
          ref={transcriptRef}
          style={{
            padding: '12px 16px', background: '#f8faff', maxHeight: 220,
            overflowY: 'auto', borderTop: '1px solid var(--blue-100)',
          }}
        >
          {transcript.length === 0 ? (
            <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', textAlign: 'center', padding: '12px 0' }}>
              {call.status === 'ringing' ? 'Waiting for answer...' : 'Connecting...'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {transcript.map((line, i) => (
                <div key={i} style={{
                  display: 'flex', gap: 6,
                  justifyContent: line.speaker === 'agent' ? 'flex-start' : 'flex-end',
                }}>
                  {line.speaker === 'agent' && (
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--blue-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                      <Mic style={{ width: 9, height: 9, color: 'var(--blue-600)' }} />
                    </div>
                  )}
                  <div style={{
                    maxWidth: '78%', padding: '5px 9px', borderRadius: 8,
                    fontSize: '0.75rem', lineHeight: 1.45,
                    background: line.speaker === 'agent' ? 'var(--blue-600)' : 'var(--white)',
                    color: line.speaker === 'agent' ? 'white' : 'var(--gray-800)',
                    border: line.speaker === 'buyer' ? '1px solid var(--gray-200)' : 'none',
                    animation: i === transcript.length - 1 ? 'fadeUp 0.2s ease' : 'none',
                  }}>
                    {line.text}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color, bg, pulse }: {
  icon: React.ElementType; label: string; value: number; color: string; bg: string; pulse?: boolean
}) {
  return (
    <div style={{ background: 'var(--white)', border: '1px solid var(--gray-100)', borderRadius: 12, padding: '14px 16px', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon style={{ width: 14, height: 14, color }} />
        </div>
        {pulse && value > 0 && <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, display: 'inline-block', animation: 'blink 1.5s infinite' }} />}
      </div>
      <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--gray-900)', fontFamily: "'Bricolage Grotesque', sans-serif", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: 3 }}>{label}</div>
    </div>
  )
}

function FooterStat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: highlight ? 'var(--blue-600)' : 'var(--gray-900)', fontFamily: "'Bricolage Grotesque', sans-serif" }}>{value}</div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const cfg = {
    running: { label: 'Running', color: '#15803d', bg: '#dcfce7' },
    paused: { label: 'Paused', color: '#a16207', bg: '#fef9c3' },
    completed: { label: 'Completed', color: 'var(--gray-500)', bg: 'var(--gray-100)' },
    draft: { label: 'Draft', color: 'var(--gray-500)', bg: 'var(--gray-100)' },
    cancelled: { label: 'Cancelled', color: '#b91c1c', bg: '#fee2e2' },
  }[status] || { label: status, color: 'var(--gray-500)', bg: 'var(--gray-100)' }

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 20, background: cfg.bg }}>
      {status === 'running' && <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color, animation: 'blink 1.5s infinite', display: 'inline-block' }} />}
      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
    </div>
  )
}

function QuickAction({ icon: Icon, label, color }: { icon: React.ElementType; label: string; color: string }) {
  return (
    <button style={{
      display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px',
      border: '1px solid var(--gray-200)', borderRadius: 7, background: 'var(--white)',
      fontSize: '0.72rem', fontWeight: 600, color, cursor: 'pointer', fontFamily: 'inherit',
    }}>
      <Icon style={{ width: 11, height: 11 }} />
      {label}
    </button>
  )
}

function ctrlBtnStyle(bg: string, color: string, border: string): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '6px 12px', border: `1.5px solid ${border}`,
    borderRadius: 8, background: bg, color, fontSize: '0.78rem',
    fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  }
}
