'use client'

import { useState, useRef, useCallback } from 'react'
import AudioPlayer from './AudioPlayer'
import TranscriptViewer from './TranscriptViewer'
import type { ParsedTranscript } from '@/lib/outreach/transcript-processor'

// ─── Call Detail Panel ──────────────────────────────────────────────────────
// Combines AudioPlayer, TranscriptViewer, extracted data, and action buttons
// into a single panel for reviewing a call. Used in call detail pages and
// slide-over panels from the call log.

export interface CallData {
  id: string
  campaignId: string
  buyerId: string
  channel: string | null
  blandCallId: string | null
  phoneNumber: string
  outcome: string | null
  durationSecs: number | null
  recordingUrl: string | null
  aiSummary: string | null
  extractedData: Record<string, unknown> | null
  attemptNumber: number
  startedAt: string | null
  endedAt: string | null
  createdAt: string
  messageId?: string | null
  messageSent?: boolean
  messageDelivered?: boolean
  responseText?: string | null
  responseAt?: string | null
}

export interface BuyerData {
  id: string
  displayName: string
  firstName: string | null
  lastName: string | null
  entityName: string | null
  phone: string | null
  email: string | null
  status: string
  buyerScore: number
  strategy: string | null
  preferredTypes: string[]
  minPrice: number | null
  maxPrice: number | null
  closeSpeedDays: number | null
  preferredMarkets: string[]
  lastContactedAt: string | null
}

export interface CampaignData {
  id: string
  name: string
  market: string
  channel: string
  mode: string
  scriptTemplate: string
  companyName: string | null
  agentName: string | null
}

export interface CallDetailPanelProps {
  call: CallData
  transcript: ParsedTranscript | null
  rawTranscript: string | null
  buyer: BuyerData
  campaign: CampaignData
  /** Called when user saves notes or outcome changes */
  onSave?: (data: { outcome?: string; aiSummary?: string; extractedData?: Record<string, unknown> }) => Promise<void>
  /** Called when user clicks to view the buyer profile */
  onViewBuyer?: (buyerId: string) => void
}

const OUTCOME_LABELS: Record<string, { label: string; color: string }> = {
  QUALIFIED: { label: 'Qualified', color: 'bg-emerald-500/20 text-emerald-400' },
  NOT_BUYING: { label: 'Not Buying', color: 'bg-gray-500/20 text-gray-400' },
  NO_ANSWER: { label: 'No Answer', color: 'bg-yellow-500/20 text-yellow-400' },
  VOICEMAIL: { label: 'Voicemail', color: 'bg-blue-500/20 text-blue-400' },
  WRONG_NUMBER: { label: 'Wrong Number', color: 'bg-orange-500/20 text-orange-400' },
  DO_NOT_CALL: { label: 'Do Not Call', color: 'bg-red-500/20 text-red-400' },
  CALLBACK_REQUESTED: { label: 'Callback', color: 'bg-purple-500/20 text-purple-400' },
}

function formatDate(d: string | null): string {
  if (!d) return '--'
  return new Date(d).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function formatDuration(secs: number | null): string {
  if (!secs) return '--'
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function formatPrice(val: number | null): string {
  if (!val) return '--'
  return val >= 1000 ? `$${(val / 1000).toFixed(0)}K` : `$${val}`
}

export default function CallDetailPanel({
  call,
  transcript,
  rawTranscript,
  buyer,
  campaign,
  onSave,
  onViewBuyer,
}: CallDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<'transcript' | 'data' | 'notes' | 'intelligence'>('transcript')
  const [notes, setNotes] = useState(call.aiSummary || '')
  const [saving, setSaving] = useState(false)
  const [intel, setIntel] = useState<any>(null)
  const [intelLoading, setIntelLoading] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)

  // AudioPlayer seek function ref
  const seekRef = useRef<((time: number) => void) | null>(null)

  const handleSeekTo = useCallback((time: number) => {
    seekRef.current?.(time)
  }, [])

  const handleSaveNotes = async () => {
    if (!onSave) return
    setSaving(true)
    try {
      await onSave({ aiSummary: notes })
    } finally {
      setSaving(false)
    }
  }

  const handleOutcomeChange = async (newOutcome: string) => {
    if (!onSave) return
    setSaving(true)
    try {
      await onSave({ outcome: newOutcome })
    } finally {
      setSaving(false)
    }
  }

  const outcomeInfo = OUTCOME_LABELS[call.outcome || ''] || { label: call.outcome || 'Pending', color: 'bg-gray-700 text-gray-300' }
  const isVoiceCall = call.channel === 'voice' || !call.channel
  const hasRecording = isVoiceCall && call.recordingUrl

  const extracted = call.extractedData as Record<string, unknown> | null

  return (
    <div className="flex flex-col h-full bg-gray-950">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="border-b border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${outcomeInfo.color}`}>
              {outcomeInfo.label}
            </span>
            <span className="text-xs text-gray-500">
              {call.channel?.toUpperCase() || 'VOICE'} call
            </span>
            <span className="text-xs text-gray-600">#{call.attemptNumber}</span>
          </div>
          <span className="text-xs text-gray-500">{formatDate(call.startedAt || call.createdAt)}</span>
        </div>

        {/* Buyer info row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-800 text-sm font-medium text-gray-300">
              {buyer.displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <button
                onClick={() => onViewBuyer?.(buyer.id)}
                className="text-sm font-medium text-gray-200 hover:text-brand-blue-400 transition-colors"
              >
                {buyer.displayName}
              </button>
              <div className="text-xs text-gray-500">
                {call.phoneNumber} &middot; Score: {buyer.buyerScore}
              </div>
            </div>
          </div>
          <div className="text-right text-xs text-gray-500">
            <div>{campaign.name}</div>
            <div>{campaign.market}</div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="mt-2 flex gap-4 text-xs text-gray-400">
          <span>Duration: {formatDuration(call.durationSecs)}</span>
          {transcript && (
            <span>{transcript.totalSegments} segments</span>
          )}
          {transcript && transcript.keyMoments.length > 0 && (
            <span>{transcript.keyMoments.length} key moments</span>
          )}
        </div>
      </div>

      {/* ── Audio Player (voice calls only) ─────────────────────────────────── */}
      {hasRecording && (
        <div className="px-4 py-3 border-b border-gray-800">
          <AudioPlayer
            src={`/api/outreach/calls/${call.id}/recording`}
            callId={call.id}
            onTimeUpdate={setCurrentTime}
            seekRef={seekRef}
          />
        </div>
      )}

      {/* ── Tab bar ─────────────────────────────────────────────────────────── */}
      <div className="flex border-b border-gray-800">
        {(['transcript', 'data', 'intelligence', 'notes'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab)
              if (tab === 'intelligence' && !intel && !intelLoading) {
                setIntelLoading(true)
                fetch(`/api/outreach/intelligence/call/${call.id}`)
                  .then(r => r.ok ? r.json() : null)
                  .then(json => setIntel(json?.data?.intelligence || null))
                  .catch(() => {})
                  .finally(() => setIntelLoading(false))
              }
            }}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              activeTab === tab
                ? 'text-brand-blue-400 border-b-2 border-brand-blue-500'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab === 'transcript' ? 'Transcript' : tab === 'data' ? 'Extracted Data' : tab === 'intelligence' ? 'Intelligence' : 'Notes'}
          </button>
        ))}
      </div>

      {/* ── Tab content ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden px-4 py-3">
        {/* Transcript tab */}
        {activeTab === 'transcript' && (
          <div className="h-full">
            {transcript ? (
              <TranscriptViewer
                transcript={transcript}
                currentTime={currentTime}
                onSeekTo={handleSeekTo}
              />
            ) : rawTranscript ? (
              <div className="h-full overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm text-gray-300 font-mono leading-relaxed">
                  {rawTranscript}
                </pre>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-gray-500">
                {isVoiceCall ? 'No transcript available for this call' : `${call.channel?.toUpperCase()} — transcript not applicable`}
              </div>
            )}
          </div>
        )}

        {/* Extracted data tab */}
        {activeTab === 'data' && (
          <div className="h-full overflow-y-auto space-y-3">
            {/* AI Summary */}
            {call.aiSummary && (
              <div className="rounded-lg bg-gray-800/50 p-3">
                <span className="text-xs font-medium text-gray-400 block mb-1">AI Summary</span>
                <p className="text-sm text-gray-200">{call.aiSummary}</p>
              </div>
            )}

            {/* Extracted fields */}
            {extracted && (
              <div className="rounded-lg bg-gray-800/50 p-3">
                <span className="text-xs font-medium text-gray-400 block mb-2">Extracted Preferences</span>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-xs text-gray-500">Still Buying</span>
                    <div className={`text-sm ${extracted.stillBuying === true ? 'text-emerald-400' : extracted.stillBuying === false ? 'text-red-400' : 'text-gray-400'}`}>
                      {extracted.stillBuying === true ? 'Yes' : extracted.stillBuying === false ? 'No' : 'Unknown'}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Strategy</span>
                    <div className="text-gray-200">{(extracted.strategy as string) || '--'}</div>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Price Range</span>
                    <div className="text-gray-200">
                      {extracted.minPrice || extracted.maxPrice
                        ? `${formatPrice(extracted.minPrice as number)} - ${formatPrice(extracted.maxPrice as number)}`
                        : '--'}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Close Speed</span>
                    <div className="text-gray-200">
                      {extracted.closeSpeedDays ? `${extracted.closeSpeedDays} days` : '--'}
                    </div>
                  </div>
                  {Array.isArray(extracted.preferredTypes) && extracted.preferredTypes.length > 0 && (
                    <div className="col-span-2">
                      <span className="text-xs text-gray-500">Property Types</span>
                      <div className="flex gap-1 flex-wrap mt-0.5">
                        {(extracted.preferredTypes as string[]).map(t => (
                          <span key={t} className="rounded bg-gray-700 px-1.5 py-0.5 text-xs text-gray-300">{t}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {Array.isArray(extracted.markets) && extracted.markets.length > 0 && (
                    <div className="col-span-2">
                      <span className="text-xs text-gray-500">Markets</span>
                      <div className="text-gray-200 text-sm">{(extracted.markets as string[]).join(', ')}</div>
                    </div>
                  )}
                  {Array.isArray(extracted.objections) && extracted.objections.length > 0 && (
                    <div className="col-span-2">
                      <span className="text-xs text-gray-500">Objections</span>
                      <ul className="list-disc list-inside text-sm text-red-400/80">
                        {(extracted.objections as string[]).map((o, i) => (
                          <li key={i}>{o}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {typeof extracted.notes === "string" && extracted.notes && (
                    <div className="col-span-2">
                      <span className="text-xs text-gray-500">AI Notes</span>
                      <p className="text-sm text-gray-300">{String(extracted.notes)}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Buyer profile snapshot */}
            <div className="rounded-lg bg-gray-800/50 p-3">
              <span className="text-xs font-medium text-gray-400 block mb-2">Buyer Profile</span>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-xs text-gray-500">Status</span>
                  <div className="text-gray-200">{buyer.status}</div>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Score</span>
                  <div className="text-gray-200">{buyer.buyerScore}/100</div>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Strategy</span>
                  <div className="text-gray-200">{buyer.strategy || '--'}</div>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Close Speed</span>
                  <div className="text-gray-200">{buyer.closeSpeedDays ? `${buyer.closeSpeedDays}d` : '--'}</div>
                </div>
                {buyer.preferredTypes?.length > 0 && (
                  <div className="col-span-2">
                    <span className="text-xs text-gray-500">Types</span>
                    <div className="text-gray-200 text-sm">{buyer.preferredTypes.join(', ')}</div>
                  </div>
                )}
                {buyer.minPrice || buyer.maxPrice ? (
                  <div className="col-span-2">
                    <span className="text-xs text-gray-500">Budget</span>
                    <div className="text-gray-200">{formatPrice(buyer.minPrice)} - {formatPrice(buyer.maxPrice)}</div>
                  </div>
                ) : null}
              </div>
              <button
                onClick={() => onViewBuyer?.(buyer.id)}
                className="mt-2 text-xs text-brand-blue-400 hover:text-brand-blue-300 transition-colors"
              >
                View full profile &rarr;
              </button>
            </div>

            {/* SMS/Email response data */}
            {call.channel !== 'voice' && call.channel && (
              <div className="rounded-lg bg-gray-800/50 p-3">
                <span className="text-xs font-medium text-gray-400 block mb-2">Message Details</span>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-xs text-gray-500">Sent</span>
                    <div className="text-gray-200">{call.messageSent ? 'Yes' : 'No'}</div>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Delivered</span>
                    <div className="text-gray-200">{call.messageDelivered ? 'Yes' : 'No'}</div>
                  </div>
                  {call.responseText && (
                    <div className="col-span-2">
                      <span className="text-xs text-gray-500">Response</span>
                      <p className="text-sm text-gray-200 mt-0.5">&ldquo;{call.responseText}&rdquo;</p>
                      {call.responseAt && (
                        <span className="text-xs text-gray-500">{formatDate(call.responseAt)}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {!extracted && !call.aiSummary && (
              <div className="py-8 text-center text-sm text-gray-500">
                No extracted data available for this call
              </div>
            )}
          </div>
        )}

        {/* Intelligence tab */}
        {activeTab === 'intelligence' && (
          <div className="h-full overflow-y-auto space-y-4">
            {intelLoading && (
              <div className="py-8 text-center text-sm text-gray-500">Loading intelligence...</div>
            )}
            {!intelLoading && !intel && (
              <div className="py-8 text-center text-sm text-gray-500">No intelligence data for this call yet</div>
            )}
            {!intelLoading && intel && (
              <>
                {/* Sentiment & engagement */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-gray-900 rounded-lg p-3 text-center">
                    <div className={`text-lg font-bold ${intel.sentimentScore > 20 ? 'text-emerald-400' : intel.sentimentScore < -20 ? 'text-red-400' : 'text-amber-400'}`}>
                      {intel.sentimentScore > 0 ? '+' : ''}{intel.sentimentScore}
                    </div>
                    <div className="text-[0.65rem] text-gray-500">Sentiment</div>
                  </div>
                  <div className="bg-gray-900 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-gray-200">{intel.engagementScore}</div>
                    <div className="text-[0.65rem] text-gray-500">Engagement</div>
                  </div>
                  <div className="bg-gray-900 rounded-lg p-3 text-center">
                    <div className={`text-lg font-bold ${
                      intel.overallBuyingIntent === 'high' ? 'text-emerald-400' :
                      intel.overallBuyingIntent === 'medium' ? 'text-amber-400' : 'text-gray-400'
                    } capitalize`}>{intel.overallBuyingIntent}</div>
                    <div className="text-[0.65rem] text-gray-500">Intent</div>
                  </div>
                </div>

                {/* Sentiment arc */}
                {intel.sentimentArc?.length > 2 && (
                  <div>
                    <span className="text-[0.68rem] font-medium text-gray-400 block mb-1">Sentiment Over Call</span>
                    <div className="flex items-center gap-0.5 h-8">
                      {(intel.sentimentArc as Array<{ segment: number; score: number }>).map((pt, i) => (
                        <div
                          key={i}
                          className={`flex-1 rounded-sm ${pt.score > 2 ? 'bg-emerald-500' : pt.score < -2 ? 'bg-red-500' : 'bg-gray-600'}`}
                          style={{ height: `${Math.max(10, Math.abs(pt.score) * 10)}%` }}
                          title={`Segment ${pt.segment}: ${pt.score > 0 ? '+' : ''}${pt.score}`}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Talk ratio */}
                <div>
                  <span className="text-[0.68rem] font-medium text-gray-400 block mb-1">Talk Ratio</span>
                  <div className="flex h-4 rounded-full overflow-hidden">
                    <div className="bg-blue-500 flex items-center justify-center" style={{ width: `${intel.aiTalkPercent}%` }}>
                      <span className="text-[0.55rem] text-white font-medium">AI {Math.round(intel.aiTalkPercent)}%</span>
                    </div>
                    <div className="bg-emerald-500 flex items-center justify-center" style={{ width: `${intel.buyerTalkPercent}%` }}>
                      <span className="text-[0.55rem] text-white font-medium">Buyer {Math.round(intel.buyerTalkPercent)}%</span>
                    </div>
                  </div>
                  <div className="flex justify-between text-[0.62rem] text-gray-500 mt-1">
                    <span>{intel.questionCount} questions asked</span>
                    <span className={intel.idealRatio ? 'text-emerald-400' : 'text-amber-400'}>
                      {intel.idealRatio ? 'Ideal ratio' : 'Adjust ratio'}
                    </span>
                  </div>
                </div>

                {/* Buying signals */}
                {intel.buyingSignalCount > 0 && (
                  <div>
                    <span className="text-[0.68rem] font-medium text-gray-400 block mb-1">Buying Signals ({intel.buyingSignalCount})</span>
                    <div className="space-y-1.5">
                      {(intel.buyingSignals as Array<{ signal: string; strength: string; quote: string }>)?.map((sig, i) => (
                        <div key={i} className="bg-gray-900 rounded px-2.5 py-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[0.6rem] font-medium px-1 py-0.5 rounded ${
                              sig.strength === 'strong' ? 'text-emerald-300 bg-emerald-900/50' :
                              sig.strength === 'moderate' ? 'text-amber-300 bg-amber-900/50' : 'text-gray-400 bg-gray-800'
                            }`}>{sig.strength}</span>
                            <span className="text-[0.72rem] text-gray-300">{sig.signal}</span>
                          </div>
                          <p className="text-[0.65rem] text-gray-500 mt-0.5 italic">"{sig.quote}"</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Objections */}
                {intel.objectionCount > 0 && (
                  <div>
                    <span className="text-[0.68rem] font-medium text-gray-400 block mb-1">Objections ({intel.objectionCount})</span>
                    <div className="space-y-1.5">
                      {(intel.objections as Array<{ objection: string; category: string; handled: boolean; response: string }>)?.map((obj, i) => (
                        <div key={i} className="bg-gray-900 rounded px-2.5 py-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[0.6rem] font-medium px-1 py-0.5 rounded ${
                              obj.category === 'price' ? 'text-orange-300 bg-orange-900/50' :
                              obj.category === 'trust' ? 'text-red-300 bg-red-900/50' :
                              obj.category === 'timing' ? 'text-blue-300 bg-blue-900/50' : 'text-gray-400 bg-gray-800'
                            }`}>{obj.category}</span>
                            <span className="text-[0.72rem] text-gray-300">{obj.objection}</span>
                            <span className={`ml-auto text-[0.6rem] font-medium ${obj.handled ? 'text-emerald-400' : 'text-red-400'}`}>
                              {obj.handled ? 'Handled' : 'Not handled'}
                            </span>
                          </div>
                          {obj.response && <p className="text-[0.65rem] text-gray-500 mt-0.5">AI: "{obj.response.slice(0, 120)}{obj.response.length > 120 ? '...' : ''}"</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Highlights from deep analysis */}
                {(intel.highlights as any[])?.length > 0 && (
                  <div>
                    <span className="text-[0.68rem] font-medium text-gray-400 block mb-1">Key Moments</span>
                    <div className="space-y-1.5">
                      {(intel.highlights as Array<{ type: string; summary: string; quote: string }>).map((h, i) => (
                        <div key={i} className="bg-gray-900 rounded px-2.5 py-1.5">
                          <span className="text-[0.6rem] text-violet-400 font-medium">{h.type.replace(/_/g, ' ')}</span>
                          <p className="text-[0.72rem] text-gray-300">{h.summary}</p>
                          {h.quote && <p className="text-[0.65rem] text-gray-500 mt-0.5 italic">"{h.quote}"</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Script suggestions */}
                {(intel.scriptSuggestions as any[])?.length > 0 && (
                  <div>
                    <span className="text-[0.68rem] font-medium text-gray-400 block mb-1">Script Suggestions</span>
                    <div className="space-y-1.5">
                      {(intel.scriptSuggestions as Array<{ suggestion: string; reason: string; priority: string }>).map((s, i) => (
                        <div key={i} className="bg-gray-900 rounded px-2.5 py-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[0.6rem] font-medium px-1 py-0.5 rounded ${
                              s.priority === 'high' ? 'text-red-300 bg-red-900/50' :
                              s.priority === 'medium' ? 'text-amber-300 bg-amber-900/50' : 'text-gray-400 bg-gray-800'
                            }`}>{s.priority}</span>
                            <span className="text-[0.72rem] text-gray-300">{s.suggestion}</span>
                          </div>
                          <p className="text-[0.65rem] text-gray-500 mt-0.5">{s.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Engagement signals */}
                {(intel.engagementSignals as any[])?.length > 0 && (
                  <div>
                    <span className="text-[0.68rem] font-medium text-gray-400 block mb-1">Engagement Signals</span>
                    <div className="flex flex-wrap gap-1.5">
                      {(intel.engagementSignals as Array<{ signal: string; type: string }>).map((s, i) => (
                        <span key={i} className={`text-[0.65rem] px-2 py-0.5 rounded-full ${
                          s.type === 'positive' ? 'text-emerald-300 bg-emerald-900/40' : 'text-red-300 bg-red-900/40'
                        }`}>{s.signal}</span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Notes tab */}
        {activeTab === 'notes' && (
          <div className="h-full flex flex-col gap-3">
            {/* Outcome override */}
            <div>
              <span className="text-xs font-medium text-gray-400 block mb-1.5">Outcome</span>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(OUTCOME_LABELS).map(([key, val]) => (
                  <button
                    key={key}
                    onClick={() => handleOutcomeChange(key)}
                    disabled={saving}
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                      call.outcome === key ? val.color + ' ring-1 ring-white/20' : 'bg-gray-800 text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {val.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes textarea */}
            <div className="flex-1 flex flex-col">
              <span className="text-xs font-medium text-gray-400 block mb-1.5">Notes</span>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Add notes about this call..."
                className="flex-1 resize-none rounded-lg bg-gray-800 p-3 text-sm text-gray-200 placeholder-gray-600 outline-none ring-1 ring-gray-700 focus:ring-brand-blue-500 transition-colors"
              />
            </div>

            <button
              onClick={handleSaveNotes}
              disabled={saving || notes === (call.aiSummary || '')}
              className="rounded-lg bg-brand-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Saving...' : 'Save Notes'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
