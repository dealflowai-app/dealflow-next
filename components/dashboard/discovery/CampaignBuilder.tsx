'use client'

import { useState, useEffect } from 'react'
import {
  X, ChevronRight, Bot, Phone, Clock, RefreshCw,
  Calendar, DollarSign, Info, ChevronDown, ChevronUp,
  Mic, Users, Database, Check,
} from 'lucide-react'
import type { CampaignConfig, CashBuyer } from './types'
import { SCRIPT_TEMPLATES } from './mockData'

interface CampaignBuilderProps {
  isOpen: boolean
  onClose: () => void
  onLaunch: (config: CampaignConfig) => void
  buyers: CashBuyer[]
  selectedBuyerIds: string[]
  marketName: string
}

const TIERS_MAX_CONCURRENT = 10 // would come from user's plan

export default function CampaignBuilder({
  isOpen, onClose, onLaunch, buyers, selectedBuyerIds, marketName,
}: CampaignBuilderProps) {
  const [name, setName] = useState(`Campaign - ${marketName} - ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`)
  const [buyerSource, setBuyerSource] = useState<'discovery' | 'crm' | 'both'>('discovery')
  const [scriptTemplate, setScriptTemplate] = useState('standard')
  const [showScriptRaw, setShowScriptRaw] = useState(false)
  const [companyName, setCompanyName] = useState('Pinnacle Home Buyers')
  const [agentName, setAgentName] = useState('Sarah')
  const [tone, setTone] = useState<'professional' | 'conversational'>('professional')
  const [mode, setMode] = useState<'ai' | 'manual'>('ai')
  const [maxConcurrent, setMaxConcurrent] = useState(5)
  const [callHoursStart, setCallHoursStart] = useState('09:00')
  const [callHoursEnd, setCallHoursEnd] = useState('19:00')
  const [voicemailAction, setVoicemailAction] = useState<'leave_message' | 'hang_up'>('leave_message')
  const [retryCount, setRetryCount] = useState(2)
  const [retryHours, setRetryHours] = useState(4)
  const [scheduleType, setScheduleType] = useState<'now' | 'later' | 'recurring'>('now')
  const [scheduledAt, setScheduledAt] = useState('')
  const [complianceAgreed, setComplianceAgreed] = useState(false)

  const enrichedBuyers = buyers.filter(b => b.contactStatus === 'enriched')
  const selectedEnriched = selectedBuyerIds.length > 0
    ? buyers.filter(b => selectedBuyerIds.includes(b.id) && b.contactStatus === 'enriched')
    : enrichedBuyers

  const buyerCount = buyerSource === 'discovery'
    ? (selectedBuyerIds.length > 0 ? selectedBuyerIds.length : enrichedBuyers.length)
    : buyerSource === 'crm'
      ? 47 // mock CRM count
      : (selectedBuyerIds.length > 0 ? selectedBuyerIds.length : enrichedBuyers.length) + 47

  // Cost estimation
  const unenriched = buyers.filter(b => b.contactStatus === 'needs_enrichment').length
  const enrichCost = unenriched * 0.035
  const avgCallMin = 3
  const callCost = buyerCount * avgCallMin * 0.09
  const totalCost = enrichCost + callCost

  const selectedScript = SCRIPT_TEMPLATES.find(t => t.id === scriptTemplate) || SCRIPT_TEMPLATES[0]

  // Update name when market changes
  useEffect(() => {
    setName(`Campaign - ${marketName} - ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`)
  }, [marketName])

  function handleLaunch() {
    if (!complianceAgreed) return
    onLaunch({
      name,
      marketName,
      buyerSource,
      buyerCount,
      scriptTemplate,
      companyName,
      agentName,
      tone,
      mode,
      maxConcurrent,
      callHoursStart,
      callHoursEnd,
      voicemailAction,
      retryCount,
      retryHours,
      scheduleType,
      scheduledAt: scheduleType === 'later' ? scheduledAt : undefined,
      complianceAgreed,
    })
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
          zIndex: 200, backdropFilter: 'blur(2px)',
        }}
      />
      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 520, background: 'var(--white)',
        boxShadow: '-8px 0 40px rgba(0,0,0,0.15)',
        zIndex: 201, display: 'flex', flexDirection: 'column',
        animation: 'slideInRight 0.25s ease',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid var(--gray-100)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div>
            <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '1.05rem', fontWeight: 800, color: 'var(--gray-900)', marginBottom: 2 }}>
              New Campaign
            </h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--gray-400)' }}>
              Configure and launch your AI outreach campaign
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--gray-200)', background: 'var(--white)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--gray-500)' }}
          >
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

          {/* Campaign name */}
          <Section title="Campaign Name">
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              style={inputStyle}
              placeholder="e.g. Atlanta Q1 Outreach"
            />
          </Section>

          {/* Buyer source */}
          <Section title="Buyer Source">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {[
                { val: 'discovery' as const, label: 'Discovery Results', icon: Users, count: selectedBuyerIds.length > 0 ? selectedBuyerIds.length : enrichedBuyers.length },
                { val: 'crm' as const, label: 'My CRM', icon: Database, count: 47 },
                { val: 'both' as const, label: 'Both', icon: Users, count: (selectedBuyerIds.length > 0 ? selectedBuyerIds.length : enrichedBuyers.length) + 47 },
              ].map(opt => (
                <button
                  key={opt.val}
                  onClick={() => setBuyerSource(opt.val)}
                  style={{
                    padding: '10px 8px', border: `2px solid ${buyerSource === opt.val ? 'var(--blue-400)' : 'var(--gray-200)'}`,
                    borderRadius: 10, background: buyerSource === opt.val ? 'var(--blue-50)' : 'var(--white)',
                    cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s',
                  }}
                >
                  <opt.icon style={{ width: 16, height: 16, color: buyerSource === opt.val ? 'var(--blue-600)' : 'var(--gray-400)', margin: '0 auto 4px' }} />
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: buyerSource === opt.val ? 'var(--blue-700)' : 'var(--gray-700)' }}>{opt.label}</div>
                  <div style={{ fontSize: '0.7rem', color: buyerSource === opt.val ? 'var(--blue-500)' : 'var(--gray-400)', fontWeight: 700 }}>{opt.count} buyers</div>
                </button>
              ))}
            </div>
            {buyerSource === 'discovery' && selectedBuyerIds.length > 0 && (
              <p style={{ fontSize: '0.75rem', color: 'var(--blue-600)', marginTop: 6 }}>
                {selectedBuyerIds.length} buyers selected from discovery results
              </p>
            )}
          </Section>

          {/* Script template */}
          <Section title="Script Template">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {SCRIPT_TEMPLATES.map(tmpl => (
                <button
                  key={tmpl.id}
                  onClick={() => setScriptTemplate(tmpl.id)}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '12px 14px', border: `2px solid ${scriptTemplate === tmpl.id ? 'var(--blue-400)' : 'var(--gray-200)'}`,
                    borderRadius: 10, background: scriptTemplate === tmpl.id ? 'var(--blue-50)' : 'var(--white)',
                    cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                  }}
                >
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                    border: `2px solid ${scriptTemplate === tmpl.id ? 'var(--blue-500)' : 'var(--gray-300)'}`,
                    background: scriptTemplate === tmpl.id ? 'var(--blue-500)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {scriptTemplate === tmpl.id && <Check style={{ width: 10, height: 10, color: 'white' }} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{ fontWeight: 700, fontSize: '0.84rem', color: scriptTemplate === tmpl.id ? 'var(--blue-700)' : 'var(--gray-900)' }}>
                        {tmpl.name}
                      </span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <span style={{ fontSize: '0.68rem', color: 'var(--gray-400)' }}>{tmpl.avgDuration}</span>
                        <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#15803d', background: '#dcfce7', padding: '1px 5px', borderRadius: 4 }}>
                          {tmpl.qualifyRate} qualify
                        </span>
                      </div>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: scriptTemplate === tmpl.id ? 8 : 0 }}>
                      {tmpl.description}
                    </p>
                    {scriptTemplate === tmpl.id && (
                      <div style={{
                        fontSize: '0.73rem', color: 'var(--blue-700)', background: 'rgba(219,234,254,0.5)',
                        borderLeft: '3px solid var(--blue-300)', padding: '6px 10px', borderRadius: '0 6px 6px 0',
                        fontStyle: 'italic', lineHeight: 1.5,
                      }}>
                        {tmpl.preview}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Advanced script edit */}
            <button
              onClick={() => setShowScriptRaw(!showScriptRaw)}
              style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 10, background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: 'var(--gray-500)', fontFamily: 'inherit' }}
            >
              {showScriptRaw ? <ChevronUp style={{ width: 13, height: 13 }} /> : <ChevronDown style={{ width: 13, height: 13 }} />}
              Advanced: Edit raw script
            </button>
            {showScriptRaw && (
              <textarea
                style={{ ...inputStyle, height: 120, resize: 'vertical', marginTop: 6, fontFamily: 'monospace', fontSize: '0.78rem' }}
                placeholder="Edit the full script here. Use [Name], [Agent], [Company], [Market] as variables."
                defaultValue={selectedScript.preview.replace(/"/g, '')}
              />
            )}
          </Section>

          {/* Agent config */}
          <Section title="Agent Configuration">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={labelStyle}>Company Name</label>
                <input value={companyName} onChange={e => setCompanyName(e.target.value)} style={inputStyle} placeholder="Your company name" />
              </div>
              <div>
                <label style={labelStyle}>Agent Name</label>
                <input value={agentName} onChange={e => setAgentName(e.target.value)} style={inputStyle} placeholder="e.g. Sarah" />
              </div>
            </div>
            <div style={{ marginTop: 10 }}>
              <label style={labelStyle}>Tone</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[['professional', 'Professional'], ['conversational', 'Conversational']].map(([val, lbl]) => (
                  <button
                    key={val}
                    onClick={() => setTone(val as 'professional' | 'conversational')}
                    style={{
                      flex: 1, padding: '8px', borderRadius: 8,
                      border: `2px solid ${tone === val ? 'var(--blue-400)' : 'var(--gray-200)'}`,
                      background: tone === val ? 'var(--blue-50)' : 'var(--white)',
                      fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
                      color: tone === val ? 'var(--blue-700)' : 'var(--gray-600)',
                      fontFamily: 'inherit', transition: 'all 0.15s',
                    }}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </div>
          </Section>

          {/* Calling mode */}
          <Section title="Calling Mode">
            <div style={{ display: 'flex', gap: 10 }}>
              {[
                { val: 'ai' as const, icon: Bot, label: 'AI Mode', desc: 'Fully automated AI agent handles all calls' },
                { val: 'manual' as const, icon: Phone, label: 'Manual Mode', desc: 'Generates call lists for your team' },
              ].map(opt => (
                <button
                  key={opt.val}
                  onClick={() => setMode(opt.val)}
                  style={{
                    flex: 1, padding: '12px', border: `2px solid ${mode === opt.val ? 'var(--blue-400)' : 'var(--gray-200)'}`,
                    borderRadius: 10, background: mode === opt.val ? 'var(--blue-50)' : 'var(--white)',
                    cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                  }}
                >
                  <opt.icon style={{ width: 18, height: 18, color: mode === opt.val ? 'var(--blue-600)' : 'var(--gray-400)', marginBottom: 6 }} />
                  <div style={{ fontWeight: 700, fontSize: '0.84rem', color: mode === opt.val ? 'var(--blue-700)' : 'var(--gray-900)' }}>{opt.label}</div>
                  <div style={{ fontSize: '0.73rem', color: 'var(--gray-400)', marginTop: 2 }}>{opt.desc}</div>
                </button>
              ))}
            </div>

            {mode === 'ai' && (
              <div style={{ marginTop: 14 }}>
                <label style={labelStyle}>Max Simultaneous Calls: <strong style={{ color: 'var(--blue-600)' }}>{maxConcurrent}</strong></label>
                <input
                  type="range" min={1} max={TIERS_MAX_CONCURRENT} value={maxConcurrent}
                  onChange={e => setMaxConcurrent(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--blue-500)', marginTop: 4 }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--gray-400)' }}>
                  <span>1</span><span>{TIERS_MAX_CONCURRENT} (plan limit)</span>
                </div>
              </div>
            )}
          </Section>

          {/* Call settings */}
          <Section title="Call Settings">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={labelStyle}>Call Hours Start</label>
                <input type="time" value={callHoursStart} onChange={e => setCallHoursStart(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Call Hours End</label>
                <input type="time" value={callHoursEnd} onChange={e => setCallHoursEnd(e.target.value)} style={inputStyle} />
              </div>
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--gray-400)', marginTop: 4 }}>
              All times in the buyer's local timezone
            </p>
            <div style={{ marginTop: 10 }}>
              <label style={labelStyle}>Voicemail</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[['leave_message', 'Leave Message'], ['hang_up', 'Hang Up']].map(([val, lbl]) => (
                  <button
                    key={val}
                    onClick={() => setVoicemailAction(val as 'leave_message' | 'hang_up')}
                    style={{
                      flex: 1, padding: '7px', borderRadius: 8,
                      border: `2px solid ${voicemailAction === val ? 'var(--blue-400)' : 'var(--gray-200)'}`,
                      background: voicemailAction === val ? 'var(--blue-50)' : 'var(--white)',
                      fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                      color: voicemailAction === val ? 'var(--blue-700)' : 'var(--gray-600)',
                      fontFamily: 'inherit', transition: 'all 0.15s',
                    }}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
              <div>
                <label style={labelStyle}>Retry Count</label>
                <select value={retryCount} onChange={e => setRetryCount(Number(e.target.value))} style={inputStyle}>
                  {[0, 1, 2, 3].map(n => <option key={n} value={n}>{n}x</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Retry After</label>
                <select value={retryHours} onChange={e => setRetryHours(Number(e.target.value))} style={inputStyle}>
                  {[2, 4, 6, 12, 24].map(n => <option key={n} value={n}>{n}h</option>)}
                </select>
              </div>
            </div>
          </Section>

          {/* Schedule */}
          <Section title="Schedule">
            <div style={{ display: 'flex', gap: 8 }}>
              {[['now', 'Launch Now'], ['later', 'Schedule Later'], ['recurring', 'Recurring']].map(([val, lbl]) => (
                <button
                  key={val}
                  onClick={() => setScheduleType(val as 'now' | 'later' | 'recurring')}
                  style={{
                    flex: 1, padding: '8px', borderRadius: 8,
                    border: `2px solid ${scheduleType === val ? 'var(--blue-400)' : 'var(--gray-200)'}`,
                    background: scheduleType === val ? 'var(--blue-50)' : 'var(--white)',
                    fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                    color: scheduleType === val ? 'var(--blue-700)' : 'var(--gray-600)',
                    fontFamily: 'inherit', transition: 'all 0.15s',
                  }}
                >
                  {lbl}
                </button>
              ))}
            </div>
            {scheduleType === 'later' && (
              <div style={{ marginTop: 10 }}>
                <label style={labelStyle}>Launch Date & Time</label>
                <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} style={inputStyle} />
              </div>
            )}
            {scheduleType === 'recurring' && (
              <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: 8 }}>
                Recurring campaigns re-run daily or weekly against new buyers in the market who haven't been contacted yet.
              </p>
            )}
          </Section>

          {/* Cost estimator */}
          <div style={{
            background: 'var(--gray-50)', border: '1px solid var(--gray-200)',
            borderRadius: 12, padding: '14px 16px', marginBottom: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <DollarSign style={{ width: 14, height: 14, color: 'var(--gray-500)' }} />
              <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--gray-700)' }}>Cost Estimate</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <CostRow label={`AI calls (${buyerCount} buyers × ~${avgCallMin} min × $0.09/min)`} value={`$${callCost.toFixed(2)}`} />
              {unenriched > 0 && <CostRow label={`Enrichment (${unenriched} buyers × $0.035)`} value={`$${enrichCost.toFixed(2)}`} />}
              <div style={{ borderTop: '1px solid var(--gray-200)', paddingTop: 6, marginTop: 2, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--gray-900)' }}>Estimated Total</span>
                <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--blue-700)' }}>${totalCost.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Compliance */}
          <div style={{
            background: complianceAgreed ? '#f0fdf4' : '#fffbeb',
            border: `1px solid ${complianceAgreed ? '#bbf7d0' : '#fde68a'}`,
            borderRadius: 12, padding: '14px 16px', marginBottom: 8,
          }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={complianceAgreed}
                onChange={e => setComplianceAgreed(e.target.checked)}
                style={{ marginTop: 3, width: 15, height: 15, accentColor: 'var(--blue-500)', flexShrink: 0 }}
              />
              <span style={{ fontSize: '0.78rem', color: complianceAgreed ? '#15803d' : '#92400e', lineHeight: 1.5 }}>
                I confirm these are verified business contacts with real estate purchase history. Calls will be made in compliance with TCPA regulations during permitted hours.
              </span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px', borderTop: '1px solid var(--gray-100)',
          display: 'flex', gap: 10, flexShrink: 0,
        }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '11px', border: '1.5px solid var(--gray-200)',
              borderRadius: 10, background: 'var(--white)', cursor: 'pointer',
              fontSize: '0.88rem', fontWeight: 600, color: 'var(--gray-600)', fontFamily: 'inherit',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleLaunch}
            disabled={!complianceAgreed || !name.trim()}
            style={{
              flex: 2, padding: '11px', border: 'none',
              borderRadius: 10, cursor: !complianceAgreed || !name.trim() ? 'not-allowed' : 'pointer',
              fontSize: '0.88rem', fontWeight: 700, fontFamily: 'inherit',
              background: !complianceAgreed || !name.trim() ? 'var(--gray-200)' : 'var(--blue-600)',
              color: !complianceAgreed || !name.trim() ? 'var(--gray-400)' : 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              transition: 'background 0.15s',
            }}
          >
            <Bot style={{ width: 15, height: 15 }} />
            {scheduleType === 'now' ? `Launch ${buyerCount} Calls` : scheduleType === 'later' ? 'Schedule Campaign' : 'Set Up Recurring'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h3 style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
        {title}
      </h3>
      {children}
    </div>
  )
}

function CostRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
      <span style={{ color: 'var(--gray-500)' }}>{label}</span>
      <span style={{ fontWeight: 600, color: 'var(--gray-800)' }}>{value}</span>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px',
  border: '1.5px solid var(--gray-200)', borderRadius: 8,
  fontSize: '0.84rem', color: 'var(--gray-900)',
  fontFamily: 'inherit', outline: 'none', background: 'var(--white)',
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.75rem', fontWeight: 600,
  color: 'var(--gray-600)', marginBottom: 5,
}
