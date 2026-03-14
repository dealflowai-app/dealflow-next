'use client'

import { useState, useMemo } from 'react'
import {
  LayoutList, LayoutGrid, Filter, Sparkles, UserPlus,
  ChevronUp, ChevronDown, Phone, Mail, Star, Building2,
  User, Landmark, ShieldCheck, AlertCircle, Ban, CheckSquare,
  Square, ArrowUpRight,
} from 'lucide-react'
import type { CashBuyer } from './types'

interface BuyerResultsPanelProps {
  buyers: CashBuyer[]
  isLoading: boolean
  selectedBuyerIds: string[]
  onSelectionChange: (ids: string[]) => void
  onNewCampaign: () => void
  onEnrich: (ids: string[]) => void
  marketName: string
}

type SortKey = 'activityScore' | 'cashPurchases12mo' | 'lastPurchaseDate' | 'priceRangeMax' | 'name'
type SortDir = 'asc' | 'desc'
type ViewMode = 'table' | 'card'

const ENTITY_LABELS: Record<string, string> = {
  individual: 'Individual',
  llc: 'LLC',
  corporation: 'Corp',
  trust: 'Trust',
}

const ENTITY_COLORS: Record<string, { bg: string; text: string }> = {
  individual: { bg: '#f3f4f6', text: '#374151' },
  llc: { bg: '#dbeafe', text: '#1d4ed8' },
  corporation: { bg: '#ede9fe', text: '#7c3aed' },
  trust: { bg: '#fef3c7', text: '#92400e' },
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; icon: React.ElementType }> = {
  enriched: { label: 'Enriched', bg: '#dcfce7', text: '#15803d', icon: ShieldCheck },
  needs_enrichment: { label: 'Needs Enrichment', bg: '#fef9c3', text: '#a16207', icon: AlertCircle },
  do_not_call: { label: 'Do Not Call', bg: '#fee2e2', text: '#b91c1c', icon: Ban },
  opted_out: { label: 'Opted Out', bg: '#f3f4f6', text: '#6b7280', icon: Ban },
}

function formatPrice(n: number): string {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`
  return `$${Math.round(n / 1000)}k`
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function ActivityScore({ score }: { score: number }) {
  const color = score >= 85 ? '#15803d' : score >= 60 ? '#a16207' : '#b91c1c'
  const bg = score >= 85 ? '#dcfce7' : score >= 60 ? '#fef9c3' : '#fee2e2'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: bg, display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexShrink: 0,
      }}>
        <span style={{ fontSize: '0.78rem', fontWeight: 800, color }}>{score}</span>
      </div>
    </div>
  )
}

function PropertyTypePill({ type }: { type: string }) {
  const labels: Record<string, string> = { sfr: 'SFR', multi: 'Multi', commercial: 'Comm.', land: 'Land' }
  return (
    <span style={{
      fontSize: '0.68rem', fontWeight: 600, padding: '2px 7px',
      background: 'var(--gray-100)', color: 'var(--gray-700)',
      borderRadius: 20, whiteSpace: 'nowrap',
    }}>
      {labels[type] || type}
    </span>
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

export default function BuyerResultsPanel({
  buyers,
  isLoading,
  selectedBuyerIds,
  onSelectionChange,
  onNewCampaign,
  onEnrich,
  marketName,
}: BuyerResultsPanelProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [sortKey, setSortKey] = useState<SortKey>('activityScore')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [filterPropertyType, setFilterPropertyType] = useState<string>('all')
  const [filterEntityType, setFilterEntityType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterMinPurchases, setFilterMinPurchases] = useState<number>(0)
  const [showFilters, setShowFilters] = useState(false)

  const needsEnrichment = buyers.filter(b => b.contactStatus === 'needs_enrichment')
  const inCRM = buyers.filter(b => b.inCRM)
  const newBuyers = buyers.filter(b => !b.inCRM)

  const filtered = useMemo(() => {
    return buyers.filter(b => {
      if (filterPropertyType !== 'all' && !b.propertyTypes.includes(filterPropertyType)) return false
      if (filterEntityType !== 'all' && b.entityType !== filterEntityType) return false
      if (filterStatus !== 'all' && b.contactStatus !== filterStatus) return false
      if (b.cashPurchases12mo < filterMinPurchases) return false
      return true
    })
  }, [buyers, filterPropertyType, filterEntityType, filterStatus, filterMinPurchases])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av: string | number, bv: string | number
      if (sortKey === 'name') { av = a.name; bv = b.name }
      else if (sortKey === 'lastPurchaseDate') { av = a.lastPurchaseDate; bv = b.lastPurchaseDate }
      else { av = a[sortKey] as number; bv = b[sortKey] as number }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [filtered, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  function toggleSelectAll() {
    if (selectedBuyerIds.length === sorted.length) onSelectionChange([])
    else onSelectionChange(sorted.map(b => b.id))
  }

  function toggleSelect(id: string) {
    onSelectionChange(
      selectedBuyerIds.includes(id)
        ? selectedBuyerIds.filter(x => x !== id)
        : [...selectedBuyerIds, id]
    )
  }

  const allSelected = sorted.length > 0 && selectedBuyerIds.length === sorted.length

  if (isLoading) {
    return (
      <div style={{ padding: '60px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 8, height: 8, borderRadius: '50%', background: 'var(--blue-500)',
              animation: `blink 1.2s ease-in-out ${i * 0.2}s infinite`,
            }} />
          ))}
        </div>
        <div style={{ fontSize: '0.9rem', color: 'var(--gray-500)', fontWeight: 500 }}>
          Pulling cash buyers from public records...
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>
          Searching ATTOM Data for {marketName}
        </div>
      </div>
    )
  }

  if (buyers.length === 0) {
    return (
      <div style={{ padding: '60px 32px', textAlign: 'center' }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14, background: 'var(--gray-50)',
          border: '1px solid var(--gray-200)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', margin: '0 auto 16px', color: 'var(--gray-400)',
        }}>
          <User style={{ width: 22, height: 22 }} />
        </div>
        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--gray-800)', marginBottom: 6, fontFamily: "'Bricolage Grotesque', sans-serif" }}>
          Select a market to find buyers
        </div>
        <div style={{ fontSize: '0.84rem', color: 'var(--gray-400)', maxWidth: 360, margin: '0 auto' }}>
          Search for a city, county, or ZIP code above and we'll pull verified cash buyers from public records.
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '0 0 32px' }}>
      {/* Summary bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 32px', borderBottom: '1px solid var(--gray-100)', gap: 16, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div>
            <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--gray-900)', fontFamily: "'Bricolage Grotesque', sans-serif" }}>
              {buyers.length.toLocaleString()}
            </span>
            <span style={{ fontSize: '0.9rem', color: 'var(--gray-500)', marginLeft: 6 }}>buyers found</span>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <StatPill label="In CRM" value={inCRM.length} color="var(--blue-600)" bg="var(--blue-50)" />
            <StatPill label="New" value={newBuyers.length} color="#15803d" bg="#dcfce7" />
            <StatPill label="Need Enrichment" value={needsEnrichment.length} color="#a16207" bg="#fef9c3" />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {needsEnrichment.length > 0 && (
            <button
              onClick={() => onEnrich(needsEnrichment.map(b => b.id))}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 8,
                border: '1.5px solid var(--amber)',
                background: '#fffbeb', color: '#92400e',
                fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <Sparkles style={{ width: 13, height: 13 }} />
              Enrich All ({needsEnrichment.length})
            </button>
          )}
          {selectedBuyerIds.length > 0 && (
            <button
              onClick={onNewCampaign}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 8,
                border: 'none', background: 'var(--blue-600)', color: 'white',
                fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              New Campaign ({selectedBuyerIds.length} selected)
            </button>
          )}
          {/* View toggle */}
          <div style={{ display: 'flex', border: '1px solid var(--gray-200)', borderRadius: 8, overflow: 'hidden' }}>
            {(['table', 'card'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                style={{
                  padding: '7px 10px', border: 'none', cursor: 'pointer',
                  background: viewMode === mode ? 'var(--gray-100)' : 'transparent',
                  color: viewMode === mode ? 'var(--gray-900)' : 'var(--gray-400)',
                  display: 'flex', alignItems: 'center',
                }}
              >
                {mode === 'table' ? <LayoutList style={{ width: 15, height: 15 }} /> : <LayoutGrid style={{ width: 15, height: 15 }} />}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '7px 12px', borderRadius: 8,
              border: `1px solid ${showFilters ? 'var(--blue-300)' : 'var(--gray-200)'}`,
              background: showFilters ? 'var(--blue-50)' : 'transparent',
              color: showFilters ? 'var(--blue-600)' : 'var(--gray-500)',
              fontSize: '0.82rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <Filter style={{ width: 13, height: 13 }} />
            Filter
          </button>
        </div>
      </div>

      {/* Filter bar */}
      {showFilters && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '12px 32px',
          background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-100)', flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Filter:
          </span>
          <FilterSelect label="Property Type" value={filterPropertyType} onChange={setFilterPropertyType}
            options={[['all', 'All Types'], ['sfr', 'SFR'], ['multi', 'Multi'], ['commercial', 'Commercial']]} />
          <FilterSelect label="Entity Type" value={filterEntityType} onChange={setFilterEntityType}
            options={[['all', 'All Entities'], ['individual', 'Individual'], ['llc', 'LLC'], ['corporation', 'Corp'], ['trust', 'Trust']]} />
          <FilterSelect label="Contact Status" value={filterStatus} onChange={setFilterStatus}
            options={[['all', 'All Status'], ['enriched', 'Enriched'], ['needs_enrichment', 'Needs Enrichment'], ['do_not_call', 'Do Not Call']]} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--gray-500)' }}>Min purchases:</span>
            <input
              type="number" min={0} max={50} value={filterMinPurchases}
              onChange={e => setFilterMinPurchases(Number(e.target.value))}
              style={{
                width: 56, padding: '4px 8px', border: '1px solid var(--gray-200)', borderRadius: 6,
                fontSize: '0.82rem', fontFamily: 'inherit', outline: 'none',
              }}
            />
          </div>
          <button
            onClick={() => { setFilterPropertyType('all'); setFilterEntityType('all'); setFilterStatus('all'); setFilterMinPurchases(0) }}
            style={{ fontSize: '0.78rem', color: 'var(--blue-600)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Clear all
          </button>
          <span style={{ fontSize: '0.78rem', color: 'var(--gray-400)' }}>
            {sorted.length} of {buyers.length} showing
          </span>
        </div>
      )}

      {viewMode === 'table' ? (
        <BuyerTable
          buyers={sorted}
          selectedBuyerIds={selectedBuyerIds}
          allSelected={allSelected}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={toggleSort}
          onToggleAll={toggleSelectAll}
          onToggle={toggleSelect}
          onEnrich={id => onEnrich([id])}
          onAddToCRM={() => {}}
        />
      ) : (
        <BuyerGrid
          buyers={sorted}
          selectedBuyerIds={selectedBuyerIds}
          onToggle={toggleSelect}
          onEnrich={id => onEnrich([id])}
        />
      )}
    </div>
  )
}

function StatPill({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <span style={{ fontSize: '0.9rem', fontWeight: 700, color }}>{value}</span>
      <span style={{ fontSize: '0.78rem', color: 'var(--gray-500)' }}>{label}</span>
    </div>
  )
}

function FilterSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: [string, string][]
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        padding: '5px 10px', border: '1px solid var(--gray-200)', borderRadius: 7,
        fontSize: '0.8rem', color: 'var(--gray-700)', background: 'var(--white)',
        fontFamily: 'inherit', outline: 'none', cursor: 'pointer',
      }}
    >
      {options.map(([val, lbl]) => <option key={val} value={val}>{lbl}</option>)}
    </select>
  )
}

function BuyerTable({ buyers, selectedBuyerIds, allSelected, sortKey, sortDir, onSort, onToggleAll, onToggle, onEnrich, onAddToCRM }: {
  buyers: CashBuyer[]
  selectedBuyerIds: string[]
  allSelected: boolean
  sortKey: SortKey
  sortDir: SortDir
  onSort: (k: SortKey) => void
  onToggleAll: () => void
  onToggle: (id: string) => void
  onEnrich: (id: string) => void
  onAddToCRM: (id: string) => void
}) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--gray-100)' }}>
            <th style={{ padding: '12px 16px 12px 32px', textAlign: 'left', width: 40 }}>
              <button onClick={onToggleAll} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', display: 'flex', alignItems: 'center' }}>
                {allSelected ? <CheckSquare style={{ width: 16, height: 16, color: 'var(--blue-600)' }} /> : <Square style={{ width: 16, height: 16 }} />}
              </button>
            </th>
            <th style={{ padding: '12px 12px', textAlign: 'left' }}>
              <SortHeader label="Buyer" sortKey="name" current={sortKey} dir={sortDir} onSort={onSort} />
            </th>
            <th style={{ padding: '12px 12px', textAlign: 'center' }}>
              <SortHeader label="Purchases (12mo)" sortKey="cashPurchases12mo" current={sortKey} dir={sortDir} onSort={onSort} />
            </th>
            <th style={{ padding: '12px 12px', textAlign: 'left' }}>
              <SortHeader label="Last Purchase" sortKey="lastPurchaseDate" current={sortKey} dir={sortDir} onSort={onSort} />
            </th>
            <th style={{ padding: '12px 12px', textAlign: 'left' }}>
              <SortHeader label="Price Range" sortKey="priceRangeMax" current={sortKey} dir={sortDir} onSort={onSort} />
            </th>
            <th style={{ padding: '12px 12px', textAlign: 'left' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Buys
              </span>
            </th>
            <th style={{ padding: '12px 12px', textAlign: 'left' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Contact
              </span>
            </th>
            <th style={{ padding: '12px 12px', textAlign: 'center' }}>
              <SortHeader label="Score" sortKey="activityScore" current={sortKey} dir={sortDir} onSort={onSort} />
            </th>
            <th style={{ padding: '12px 32px 12px 12px', textAlign: 'right' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Actions
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {buyers.map(buyer => {
            const isSelected = selectedBuyerIds.includes(buyer.id)
            const entity = ENTITY_COLORS[buyer.entityType]
            const status = STATUS_CONFIG[buyer.contactStatus]
            const StatusIcon = status.icon
            return (
              <tr
                key={buyer.id}
                style={{
                  borderBottom: '1px solid var(--gray-100)',
                  background: isSelected ? '#eff6ff' : 'transparent',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'var(--gray-50)' }}
                onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                <td style={{ padding: '12px 16px 12px 32px' }}>
                  <button onClick={() => onToggle(buyer.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', display: 'flex', alignItems: 'center' }}>
                    {isSelected ? <CheckSquare style={{ width: 16, height: 16, color: 'var(--blue-600)' }} /> : <Square style={{ width: 16, height: 16 }} />}
                  </button>
                </td>
                <td style={{ padding: '12px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                      background: entity.bg, display: 'flex', alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {buyer.entityType === 'individual'
                        ? <User style={{ width: 14, height: 14, color: entity.text }} />
                        : buyer.entityType === 'trust'
                          ? <Landmark style={{ width: 14, height: 14, color: entity.text }} />
                          : <Building2 style={{ width: 14, height: 14, color: entity.text }} />
                      }
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--gray-900)', fontSize: '0.84rem' }}>
                        {buyer.name}
                        {buyer.inCRM && (
                          <span style={{
                            marginLeft: 6, fontSize: '0.65rem', fontWeight: 700,
                            padding: '1px 5px', borderRadius: 4, background: 'var(--blue-50)', color: 'var(--blue-600)',
                          }}>CRM</span>
                        )}
                      </div>
                      <span style={{
                        display: 'inline-block', fontSize: '0.68rem', fontWeight: 600,
                        padding: '1px 6px', borderRadius: 4, marginTop: 2,
                        background: entity.bg, color: entity.text,
                      }}>
                        {ENTITY_LABELS[buyer.entityType]}
                      </span>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '12px 12px', textAlign: 'center' }}>
                  <span style={{ fontWeight: 800, color: 'var(--gray-900)', fontSize: '1rem' }}>{buyer.cashPurchases12mo}</span>
                </td>
                <td style={{ padding: '12px 12px' }}>
                  <span style={{ color: 'var(--gray-600)', fontSize: '0.82rem' }}>{formatDate(buyer.lastPurchaseDate)}</span>
                </td>
                <td style={{ padding: '12px 12px' }}>
                  <span style={{ fontWeight: 600, color: 'var(--gray-800)', fontSize: '0.82rem' }}>
                    {formatPrice(buyer.priceRangeMin)} - {formatPrice(buyer.priceRangeMax)}
                  </span>
                </td>
                <td style={{ padding: '12px 12px' }}>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {buyer.propertyTypes.map(t => <PropertyTypePill key={t} type={t} />)}
                  </div>
                </td>
                <td style={{ padding: '12px 12px' }}>
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '3px 8px', borderRadius: 20,
                    background: status.bg, color: status.text, fontSize: '0.72rem', fontWeight: 600,
                  }}>
                    <StatusIcon style={{ width: 10, height: 10 }} />
                    {buyer.contactStatus === 'needs_enrichment' ? 'Needs Enrich.' : status.label}
                  </div>
                </td>
                <td style={{ padding: '12px 12px', textAlign: 'center' }}>
                  <ActivityScore score={buyer.activityScore} />
                </td>
                <td style={{ padding: '12px 32px 12px 12px', textAlign: 'right' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                    {buyer.contactStatus === 'needs_enrichment' && (
                      <ActionBtn onClick={() => onEnrich(buyer.id)} title="Enrich contact info">
                        <Sparkles style={{ width: 13, height: 13 }} />
                      </ActionBtn>
                    )}
                    {buyer.phone && (
                      <ActionBtn onClick={() => {}} title={buyer.phone}>
                        <Phone style={{ width: 13, height: 13 }} />
                      </ActionBtn>
                    )}
                    {buyer.email && (
                      <ActionBtn onClick={() => {}} title={buyer.email}>
                        <Mail style={{ width: 13, height: 13 }} />
                      </ActionBtn>
                    )}
                    {!buyer.inCRM && (
                      <ActionBtn onClick={() => onAddToCRM(buyer.id)} title="Add to CRM">
                        <UserPlus style={{ width: 13, height: 13 }} />
                      </ActionBtn>
                    )}
                    <ActionBtn onClick={() => {}} title="View profile">
                      <ArrowUpRight style={{ width: 13, height: 13 }} />
                    </ActionBtn>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function ActionBtn({ onClick, title, children }: { onClick: () => void; title?: string; children: React.ReactNode }) {
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
      {children}
    </button>
  )
}

function BuyerGrid({ buyers, selectedBuyerIds, onToggle, onEnrich }: {
  buyers: CashBuyer[]
  selectedBuyerIds: string[]
  onToggle: (id: string) => void
  onEnrich: (id: string) => void
}) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
      gap: 16, padding: '20px 32px',
    }}>
      {buyers.map(buyer => {
        const isSelected = selectedBuyerIds.includes(buyer.id)
        const entity = ENTITY_COLORS[buyer.entityType]
        const status = STATUS_CONFIG[buyer.contactStatus]
        return (
          <div
            key={buyer.id}
            onClick={() => onToggle(buyer.id)}
            style={{
              background: 'var(--white)',
              border: `2px solid ${isSelected ? 'var(--blue-400)' : 'var(--gray-100)'}`,
              borderRadius: 14, padding: 16, cursor: 'pointer',
              boxShadow: isSelected ? '0 0 0 3px rgba(59,130,246,0.15)' : 'var(--shadow-sm)',
              transition: 'all 0.15s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: entity.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {buyer.entityType === 'individual' ? <User style={{ width: 16, height: 16, color: entity.text }} /> : <Building2 style={{ width: 16, height: 16, color: entity.text }} />}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--gray-900)' }}>{buyer.name}</div>
                  <span style={{ fontSize: '0.68rem', fontWeight: 600, padding: '1px 6px', borderRadius: 4, background: entity.bg, color: entity.text }}>
                    {ENTITY_LABELS[buyer.entityType]}
                  </span>
                </div>
              </div>
              <ActivityScore score={buyer.activityScore} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              <CardStat label="Purchases (12mo)" value={String(buyer.cashPurchases12mo)} />
              <CardStat label="Last Purchase" value={formatDate(buyer.lastPurchaseDate)} />
              <CardStat label="Price Range" value={`${formatPrice(buyer.priceRangeMin)}-${formatPrice(buyer.priceRangeMax)}`} />
              <div>
                <div style={{ fontSize: '0.68rem', color: 'var(--gray-400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>Buys</div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {buyer.propertyTypes.map(t => <PropertyTypePill key={t} type={t} />)}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 20, background: status.bg, color: status.text, fontSize: '0.7rem', fontWeight: 600 }}>
                {buyer.contactStatus === 'needs_enrichment' ? 'Needs Enrichment' : status.label}
              </div>
              {buyer.phone && <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{buyer.phone}</span>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function CardStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: '0.68rem', color: 'var(--gray-400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--gray-800)' }}>{value}</div>
    </div>
  )
}
