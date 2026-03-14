'use client'

import { useState } from 'react'
import {
  ChevronDown, ChevronUp, Copy, Play, Eye, BarChart2,
  CheckCircle2, Pause, XCircle, Clock, TrendingUp,
} from 'lucide-react'
import type { Campaign, CampaignStatus } from './types'

interface CampaignHistoryProps {
  campaigns: Campaign[]
  onView: (id: string) => void
  onRerun: (campaign: Campaign) => void
  onDuplicate: (campaign: Campaign) => void
  activeCampaignId?: string
}

type SortKey = 'createdAt' | 'buyersCalled' | 'callsQualified' | 'name'
type SortDir = 'asc' | 'desc'

const STATUS_CONFIG: Record<CampaignStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  running: { label: 'Running', color: '#15803d', bg: '#dcfce7', icon: Play },
  paused: { label: 'Paused', color: '#a16207', bg: '#fef9c3', icon: Pause },
  completed: { label: 'Completed', color: 'var(--gray-600)', bg: 'var(--gray-100)', icon: CheckCircle2 },
  draft: { label: 'Draft', color: 'var(--gray-500)', bg: 'var(--gray-50)', icon: Clock },
  cancelled: { label: 'Cancelled', color: '#b91c1c', bg: '#fee2e2', icon: XCircle },
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDuration(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export default function CampaignHistory({ campaigns, onView, onRerun, onDuplicate, activeCampaignId }: CampaignHistoryProps) {
  const [sortKey, setSortKey] = useState<SortKey>('createdAt')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const filtered = campaigns.filter(c => filterStatus === 'all' || c.status === filterStatus)

  const sorted = [...filtered].sort((a, b) => {
    let av: string | number, bv: string | number
    if (sortKey === 'name') { av = a.name; bv = b.name }
    else if (sortKey === 'createdAt') { av = a.createdAt; bv = b.createdAt }
    else { av = a[sortKey] as number; bv = b[sortKey] as number }
    if (av < bv) return sortDir === 'asc' ? -1 : 1
    if (av > bv) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  return (
    <div style={{ padding: '0 0 32px' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 32px', borderBottom: '1px solid var(--gray-100)',
      }}>
        <div>
          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--gray-900)' }}>
            {filtered.length} Campaign{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--gray-500)' }}>Filter:</span>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            style={{
              padding: '6px 10px', border: '1px solid var(--gray-200)', borderRadius: 7,
              fontSize: '0.8rem', color: 'var(--gray-700)', background: 'var(--white)',
              fontFamily: 'inherit', outline: 'none', cursor: 'pointer',
            }}
          >
            <option value="all">All Status</option>
            <option value="running">Running</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
            <option value="draft">Draft</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {sorted.length === 0 ? (
        <div style={{ padding: '60px 32px', textAlign: 'center', fontSize: '0.9rem', color: 'var(--gray-400)' }}>
          No campaigns yet. Launch your first campaign from the Discovery tab.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--gray-100)' }}>
                <th style={{ padding: '12px 16px 12px 32px', textAlign: 'left' }}>
                  <SortHeader label="Campaign" sortKey="name" current={sortKey} dir={sortDir} onSort={toggleSort} />
                </th>
                <th style={{ padding: '12px 12px', textAlign: 'left' }}>
                  <ColHeader label="Market" />
                </th>
                <th style={{ padding: '12px 12px', textAlign: 'left' }}>
                  <SortHeader label="Date" sortKey="createdAt" current={sortKey} dir={sortDir} onSort={toggleSort} />
                </th>
                <th style={{ padding: '12px 12px', textAlign: 'center' }}>
                  <SortHeader label="Buyers Called" sortKey="buyersCalled" current={sortKey} dir={sortDir} onSort={toggleSort} />
                </th>
                <th style={{ padding: '12px 12px', textAlign: 'center' }}>
                  <SortHeader label="Qualified" sortKey="callsQualified" current={sortKey} dir={sortDir} onSort={toggleSort} />
                </th>
                <th style={{ padding: '12px 12px', textAlign: 'center' }}>
                  <ColHeader label="Qualify Rate" />
                </th>
                <th style={{ padding: '12px 12px', textAlign: 'center' }}>
                  <ColHeader label="Talk Time" />
                </th>
                <th style={{ padding: '12px 12px', textAlign: 'left' }}>
                  <ColHeader label="Status" />
                </th>
                <th style={{ padding: '12px 32px 12px 12px', textAlign: 'right' }}>
                  <ColHeader label="Actions" />
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(campaign => {
                const isExpanded = expandedId === campaign.id
                const isActive = campaign.id === activeCampaignId
                const status = STATUS_CONFIG[campaign.status]
                const StatusIcon = status.icon
                const qualifyRate = campaign.buyersCalled > 0
                  ? Math.round((campaign.callsQualified / campaign.buyersCalled) * 100)
                  : 0

                return (
                  <>
                    <tr
                      key={campaign.id}
                      style={{
                        borderBottom: isExpanded ? 'none' : '1px solid var(--gray-100)',
                        background: isActive ? '#eff6ff' : 'transparent',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--gray-50)' }}
                      onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                    >
                      <td style={{ padding: '14px 16px 14px 32px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : campaign.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', padding: 0, display: 'flex' }}
                          >
                            {isExpanded ? <ChevronUp style={{ width: 14, height: 14 }} /> : <ChevronDown style={{ width: 14, height: 14 }} />}
                          </button>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--gray-900)', fontSize: '0.84rem' }}>
                              {campaign.name}
                              {isActive && <span style={{ marginLeft: 6, fontSize: '0.65rem', fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: '#dcfce7', color: '#15803d' }}>LIVE</span>}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)', marginTop: 1 }}>
                              {campaign.mode === 'ai' ? 'AI Mode' : 'Manual'} · {campaign.scriptTemplate} script · {campaign.agentName}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        <span style={{ fontSize: '0.82rem', color: 'var(--gray-600)' }}>{campaign.marketName}</span>
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        <span style={{ fontSize: '0.82rem', color: 'var(--gray-600)' }}>{formatDate(campaign.createdAt)}</span>
                      </td>
                      <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                        <div>
                          <span style={{ fontWeight: 800, color: 'var(--gray-900)' }}>{campaign.buyersCalled}</span>
                          <span style={{ color: 'var(--gray-400)', fontSize: '0.78rem' }}>/{campaign.buyersTotal}</span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                        <span style={{ fontWeight: 700, color: '#15803d' }}>{campaign.callsQualified}</span>
                      </td>
                      <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 20, background: qualifyRate >= 30 ? '#dcfce7' : qualifyRate >= 20 ? '#fef9c3' : 'var(--gray-100)', color: qualifyRate >= 30 ? '#15803d' : qualifyRate >= 20 ? '#a16207' : 'var(--gray-500)' }}>
                          <TrendingUp style={{ width: 10, height: 10 }} />
                          <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>{qualifyRate}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                        <span style={{ fontSize: '0.82rem', color: 'var(--gray-600)' }}>
                          {campaign.totalTalkSeconds > 0 ? formatDuration(campaign.totalTalkSeconds) : '-'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 20, background: status.bg }}>
                          {campaign.status === 'running' && (
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: status.color, display: 'inline-block', animation: 'blink 1.5s infinite' }} />
                          )}
                          <StatusIcon style={{ width: 10, height: 10, color: status.color }} />
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: status.color }}>{status.label}</span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 32px 14px 12px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                          <TableAction onClick={() => onView(campaign.id)} title="View report" icon={Eye} />
                          <TableAction onClick={() => onDuplicate(campaign)} title="Duplicate" icon={Copy} />
                          {campaign.status === 'completed' && (
                            <TableAction onClick={() => onRerun(campaign)} title="Re-run" icon={Play} />
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Expanded breakdown */}
                    {isExpanded && (
                      <tr key={`${campaign.id}-expand`} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                        <td colSpan={9} style={{ padding: '0 32px 16px', background: 'var(--gray-50)' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, paddingTop: 14 }}>
                            <ExpandStat label="Not Buying" value={String(campaign.callsNotBuying)} color="#b91c1c" />
                            <ExpandStat label="No Answer" value={String(campaign.callsNoAnswer)} color="var(--gray-500)" />
                            <ExpandStat label="Avg Call" value={campaign.buyersCalled > 0 ? formatDuration(Math.round(campaign.totalTalkSeconds / campaign.buyersCalled)) : '-'} color="var(--gray-700)" />
                            <ExpandStat label="Script" value={campaign.scriptTemplate.replace('_', ' ')} color="var(--gray-700)" />
                            <ExpandStat label="Company" value={campaign.companyName} color="var(--gray-700)" />
                          </div>
                          <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                            <button
                              onClick={() => onView(campaign.id)}
                              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 7, border: '1px solid var(--gray-200)', background: 'var(--white)', fontSize: '0.78rem', fontWeight: 600, color: 'var(--gray-700)', cursor: 'pointer', fontFamily: 'inherit' }}
                            >
                              <BarChart2 style={{ width: 13, height: 13 }} /> Full Report
                            </button>
                            <button
                              onClick={() => onDuplicate(campaign)}
                              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 7, border: '1px solid var(--gray-200)', background: 'var(--white)', fontSize: '0.78rem', fontWeight: 600, color: 'var(--gray-700)', cursor: 'pointer', fontFamily: 'inherit' }}
                            >
                              <Copy style={{ width: 13, height: 13 }} /> Duplicate Campaign
                            </button>
                            {campaign.status === 'completed' && (
                              <button
                                onClick={() => onRerun(campaign)}
                                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 7, border: '1px solid var(--blue-200)', background: 'var(--blue-50)', fontSize: '0.78rem', fontWeight: 600, color: 'var(--blue-700)', cursor: 'pointer', fontFamily: 'inherit' }}
                              >
                                <Play style={{ width: 13, height: 13 }} /> Re-run in This Market
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function SortHeader({ label, sortKey, current, dir, onSort }: {
  label: string; sortKey: SortKey; current: SortKey; dir: SortDir; onSort: (k: SortKey) => void
}) {
  const active = current === sortKey
  return (
    <button
      onClick={() => onSort(sortKey)}
      style={{
        display: 'flex', alignItems: 'center', gap: 3, background: 'none',
        border: 'none', cursor: 'pointer', padding: 0,
        fontSize: '0.75rem', fontWeight: 700, color: active ? 'var(--blue-600)' : 'var(--gray-500)',
        textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'inherit',
      }}
    >
      {label}
      {active
        ? dir === 'asc' ? <ChevronUp style={{ width: 12, height: 12 }} /> : <ChevronDown style={{ width: 12, height: 12 }} />
        : <ChevronDown style={{ width: 12, height: 12, opacity: 0.3 }} />
      }
    </button>
  )
}

function ColHeader({ label }: { label: string }) {
  return (
    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
      {label}
    </span>
  )
}

function TableAction({ onClick, title, icon: Icon }: { onClick: () => void; title: string; icon: React.ElementType }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 28, height: 28, borderRadius: 7, border: '1px solid var(--gray-200)',
        background: 'var(--white)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', color: 'var(--gray-500)', transition: 'all 0.1s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--gray-50)'; e.currentTarget.style.color = 'var(--gray-900)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'var(--white)'; e.currentTarget.style.color = 'var(--gray-500)' }}
    >
      <Icon style={{ width: 13, height: 13 }} />
    </button>
  )
}

function ExpandStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <div style={{ fontSize: '0.68rem', color: 'var(--gray-400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: '0.88rem', fontWeight: 700, color, textTransform: 'capitalize' }}>{value}</div>
    </div>
  )
}
