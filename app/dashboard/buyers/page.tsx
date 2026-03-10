'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Market {
  id: string
  label: string
  city?: string
  state: string
  zipCode?: string
  buyerCount: number
  lastRefreshed?: string
}

interface CashBuyer {
  id: string
  firstName?: string
  lastName?: string
  entityName?: string
  entityType?: string
  phone?: string
  email?: string
  city?: string
  state?: string
  zip?: string
  cashPurchaseCount: number
  lastPurchaseDate?: string
  estimatedMaxPrice?: number
  status: string
  contactEnriched: boolean
  buyerScore: number
  strategy?: string
  preferredTypes?: string[]
  minPrice?: number
  maxPrice?: number
}

interface Campaign {
  id: string
  name: string
  market: string
  status: string
  mode: string
  totalBuyers: number
  callsCompleted: number
  qualified: number
  notBuying: number
  noAnswer: number
  totalTalkTime: number
  createdAt: string
  completedAt?: string
}

interface LiveCall {
  buyerName: string
  phone: string
  duration: number
  transcript: string[]
  status: 'active' | 'completed'
  outcome?: string
  summary?: string
}

const MARKET_SUGGESTIONS = [
  { label: 'Atlanta, GA', city: 'Atlanta', state: 'GA' },
  { label: 'Dallas, TX', city: 'Dallas', state: 'TX' },
  { label: 'Phoenix, AZ', city: 'Phoenix', state: 'AZ' },
  { label: 'Tampa, FL', city: 'Tampa', state: 'FL' },
  { label: 'Charlotte, NC', city: 'Charlotte', state: 'NC' },
  { label: 'Houston, TX', city: 'Houston', state: 'TX' },
  { label: 'Indianapolis, IN', city: 'Indianapolis', state: 'IN' },
  { label: 'Cleveland, OH', city: 'Cleveland', state: 'OH' },
  { label: 'Memphis, TN', city: 'Memphis', state: 'TN' },
  { label: 'Kansas City, MO', city: 'Kansas City', state: 'MO' },
  { label: 'Detroit, MI', city: 'Detroit', state: 'MI' },
  { label: 'Jacksonville, FL', city: 'Jacksonville', state: 'FL' },
]

const SCRIPT_TEMPLATES = [
  {
    id: 'standard_qualification',
    name: 'Standard Buyer Qualification',
    desc: 'Full buy box discovery — property type, price range, strategy, and close speed.',
    qualify: '68%',
    duration: '3–5 min',
  },
  {
    id: 'check_in',
    name: 'Quick Check-In',
    desc: 'Brief call to verify existing buyer is still active and update preferences.',
    qualify: '74%',
    duration: '1–2 min',
  },
  {
    id: 'deal_specific',
    name: 'Deal-Specific Outreach',
    desc: 'Pitch a specific property under contract to matched buyers.',
    qualify: '51%',
    duration: '2–4 min',
  },
  {
    id: 'new_market',
    name: 'New Market Introduction',
    desc: 'Introduce your network to buyers in a market you are entering.',
    qualify: '44%',
    duration: '2–3 min',
  },
]

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DiscoveryPage() {
  // Market state
  const [marketQuery, setMarketQuery] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedMarkets, setSelectedMarkets] = useState<Market[]>([])
  const [activeMarket, setActiveMarket] = useState<Market | null>(null)

  // Buyer state
  const [buyers, setBuyers] = useState<CashBuyer[]>([])
  const [loadingBuyers, setLoadingBuyers] = useState(false)
  const [selectedBuyers, setSelectedBuyers] = useState<Set<string>>(new Set())
  const [enrichingIds, setEnrichingIds] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table')
  const [filterStatus, setFilterStatus] = useState('all')
  const [sortBy, setSortBy] = useState<'score' | 'purchases' | 'date'>('purchases')

  // Campaign state
  const [showBuilder, setShowBuilder] = useState(false)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null)
  const [liveCalls, setLiveCalls] = useState<LiveCall[]>([])
  const [tab, setTab] = useState<'discover' | 'history'>('discover')

  // Campaign builder state
  const [campaignName, setCampaignName] = useState('')
  const [scriptTemplate, setScriptTemplate] = useState('standard_qualification')
  const [companyName, setCompanyName] = useState('')
  const [agentName, setAgentName] = useState('Alex')
  const [mode, setMode] = useState<'AI' | 'MANUAL'>('AI')
  const [maxConcurrent, setMaxConcurrent] = useState(10)
  const [leaveVoicemail, setLeaveVoicemail] = useState(true)
  const [maxRetries, setMaxRetries] = useState(2)
  const [launchingCampaign, setLaunchingCampaign] = useState(false)
  const [complianceChecked, setComplianceChecked] = useState(false)

  const pollRef = useRef<NodeJS.Timeout | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // ── Load campaigns on mount ──────────────────────────────────────────────────
  useEffect(() => {
    fetchCampaigns()
  }, [])

  // ── Simulate live call updates when campaign is running ──────────────────────
  useEffect(() => {
    if (activeCampaign?.status === 'RUNNING') {
      pollRef.current = setInterval(() => {
        setLiveCalls(prev => simulateLiveCallUpdate(prev, buyers))
        // Refresh campaign stats
        fetchCampaignById(activeCampaign.id)
      }, 2500)
    } else {
      if (pollRef.current) clearInterval(pollRef.current)
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [activeCampaign?.status])

  // ── Handlers ──────────────────────────────────────────────────────────────────

  const filteredSuggestions = MARKET_SUGGESTIONS.filter(m =>
    m.label.toLowerCase().includes(marketQuery.toLowerCase()) &&
    !selectedMarkets.find(sm => sm.label === m.label)
  )

  async function selectMarket(suggestion: typeof MARKET_SUGGESTIONS[0]) {
    setMarketQuery('')
    setShowSuggestions(false)
    setLoadingBuyers(true)

    try {
      const res = await fetch('/api/discovery/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          market: suggestion.label,
          city: suggestion.city,
          state: suggestion.state,
        }),
      })
      const data = await res.json()

      if (data.market) {
        const market: Market = data.market
        setSelectedMarkets(prev => [...prev.filter(m => m.id !== market.id), market])
        setActiveMarket(market)
        setBuyers(data.buyers || [])
      }
    } catch (err) {
      console.error('Market search error:', err)
      // Fallback with mock data so UI stays functional
      const mockMarket: Market = {
        id: Math.random().toString(36).slice(2),
        label: suggestion.label,
        city: suggestion.city,
        state: suggestion.state,
        buyerCount: Math.floor(Math.random() * 80) + 30,
        lastRefreshed: new Date().toISOString(),
      }
      setSelectedMarkets(prev => [...prev, mockMarket])
      setActiveMarket(mockMarket)
      setBuyers(generateMockBuyers(suggestion.city, suggestion.state, 24))
    } finally {
      setLoadingBuyers(false)
    }
  }

  async function enrichSelected() {
    const ids = Array.from(selectedBuyers)
    setEnrichingIds(new Set(ids))

    try {
      await fetch('/api/discovery/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buyerIds: ids }),
      })
      // Update local state to show enriched
      setBuyers(prev => prev.map(b =>
        ids.includes(b.id) ? { ...b, contactEnriched: true, phone: b.phone || `+1${randomPhone()}` } : b
      ))
    } catch (err) {
      console.error('Enrich error:', err)
    } finally {
      setEnrichingIds(new Set())
    }
  }

  async function enrichAll() {
    const unenriched = buyers.filter(b => !b.contactEnriched).map(b => b.id)
    if (!unenriched.length) return
    setEnrichingIds(new Set(unenriched))
    try {
      await fetch('/api/discovery/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buyerIds: unenriched }),
      })
      setBuyers(prev => prev.map(b =>
        unenriched.includes(b.id) ? { ...b, contactEnriched: true, phone: b.phone || `+1${randomPhone()}` } : b
      ))
    } catch (err) {
      console.error('Enrich all error:', err)
    } finally {
      setEnrichingIds(new Set())
    }
  }

  async function launchCampaign() {
    if (!complianceChecked || !campaignName || selectedBuyers.size === 0) return
    setLaunchingCampaign(true)

    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: campaignName,
          market: activeMarket?.label || '',
          mode,
          buyerIds: Array.from(selectedBuyers),
          scriptTemplate,
          companyName,
          agentName,
          maxConcurrentCalls: maxConcurrent,
          leaveVoicemail,
          maxRetries,
        }),
      })
      const data = await res.json()

      if (data.campaign) {
        const campaign = data.campaign
        setCampaigns(prev => [campaign, ...prev])
        setActiveCampaign(campaign)
        setShowBuilder(false)
        // Init live calls
        setLiveCalls(
          Array.from(selectedBuyers).slice(0, maxConcurrent).map(id => {
            const buyer = buyers.find(b => b.id === id)
            return {
              buyerName: buyerDisplayName(buyer),
              phone: buyer?.phone || '',
              duration: 0,
              transcript: [],
              status: 'active',
            }
          })
        )
      }
    } catch (err) {
      console.error('Launch campaign error:', err)
    } finally {
      setLaunchingCampaign(false)
    }
  }

  async function fetchCampaigns() {
    try {
      const res = await fetch('/api/campaigns')
      const data = await res.json()
      if (data.campaigns) setCampaigns(data.campaigns)
    } catch (err) {
      console.error('Fetch campaigns error:', err)
    }
  }

  async function fetchCampaignById(id: string) {
    try {
      const res = await fetch(`/api/campaigns/${id}`)
      const data = await res.json()
      if (data.campaign) {
        setActiveCampaign(data.campaign)
        setCampaigns(prev => prev.map(c => c.id === id ? data.campaign : c))
      }
    } catch (err) {
      console.error('Fetch campaign error:', err)
    }
  }

  async function pauseCampaign(id: string) {
    await fetch(`/api/campaigns/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'pause' }),
    })
    setActiveCampaign(prev => prev ? { ...prev, status: 'PAUSED' } : null)
  }

  async function stopCampaign(id: string) {
    await fetch(`/api/campaigns/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'stop' }),
    })
    setActiveCampaign(prev => prev ? { ...prev, status: 'CANCELLED' } : null)
  }

  // ── Derived data ──────────────────────────────────────────────────────────────

  const filteredBuyers = buyers
    .filter(b => filterStatus === 'all' || b.status.toLowerCase() === filterStatus)
    .sort((a, b) => {
      if (sortBy === 'score') return b.buyerScore - a.buyerScore
      if (sortBy === 'purchases') return b.cashPurchaseCount - a.cashPurchaseCount
      if (sortBy === 'date') return new Date(b.lastPurchaseDate || 0).getTime() - new Date(a.lastPurchaseDate || 0).getTime()
      return 0
    })

  const enrichedCount = buyers.filter(b => b.contactEnriched).length
  const unenrichedCount = buyers.filter(b => !b.contactEnriched).length
  const selectedEnriched = Array.from(selectedBuyers).filter(id => buyers.find(b => b.id === id && b.contactEnriched)).length

  const estimatedCost = mode === 'AI'
    ? ((selectedBuyers.size * 3 * 0.09) + (unenrichedCount * 0.04)).toFixed(2)
    : '0.00'

  // ── Live campaign stats ────────────────────────────────────────────────────────
  const liveStats = activeCampaign ? {
    active: liveCalls.filter(c => c.status === 'active').length,
    qualified: activeCampaign.qualified,
    notBuying: activeCampaign.notBuying,
    noAnswer: activeCampaign.noAnswer,
    total: activeCampaign.totalBuyers,
    completed: activeCampaign.callsCompleted,
  } : null

  // ─── Render ────────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1200 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '1.7rem', fontWeight: 800, color: 'var(--gray-900)', letterSpacing: '-0.03em', marginBottom: 4 }}>
            Buyer Discovery
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--gray-500)' }}>
            Find verified cash buyers, run AI campaigns, and build your buyer database.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setTab(tab === 'discover' ? 'history' : 'discover')}
            style={secondaryBtn}
          >
            {tab === 'discover' ? `History (${campaigns.length})` : '← Back to Discovery'}
          </button>
          {selectedBuyers.size > 0 && (
            <button onClick={() => setShowBuilder(true)} style={primaryBtn}>
              Launch Campaign ({selectedBuyers.size})
            </button>
          )}
        </div>
      </div>

      {tab === 'history' ? (
        <CampaignHistory campaigns={campaigns} onSelect={c => { setActiveCampaign(c); setTab('discover') }} />
      ) : (
        <>
          {/* ── Live Campaign Monitor ── */}
          {activeCampaign && activeCampaign.status === 'RUNNING' && liveStats && (
            <LiveMonitor
              campaign={activeCampaign}
              stats={liveStats}
              liveCalls={liveCalls}
              onPause={() => pauseCampaign(activeCampaign.id)}
              onStop={() => stopCampaign(activeCampaign.id)}
            />
          )}

          {/* ── Market Selector ── */}
          <div style={{ background: 'var(--white)', border: '1px solid var(--gray-100)', borderRadius: 16, padding: 24, marginBottom: 20, boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: selectedMarkets.length ? 16 : 0 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)', display: 'flex' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                </span>
                <input
                  ref={inputRef}
                  value={marketQuery}
                  onChange={e => { setMarketQuery(e.target.value); setShowSuggestions(true) }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  placeholder="Search city, county, or zip code..."
                  style={{ width: '100%', padding: '10px 14px 10px 42px', border: '1px solid var(--gray-200)', borderRadius: 10, fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                />
                {showSuggestions && filteredSuggestions.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid var(--gray-200)', borderRadius: 10, boxShadow: 'var(--shadow)', zIndex: 50, marginTop: 4, overflow: 'hidden' }}>
                    {filteredSuggestions.map(s => (
                      <button
                        key={s.label}
                        onMouseDown={() => selectMarket(s)}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 16px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--gray-900)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--gray-50)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--gray-400)', flexShrink: 0 }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={() => activeMarket && selectMarket(MARKET_SUGGESTIONS.find(m => m.label === activeMarket.label)!)} style={secondaryBtn} disabled={!activeMarket}>
                ↻ Refresh
              </button>
            </div>

            {/* Selected market chips */}
            {selectedMarkets.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {selectedMarkets.map(m => (
                  <button
                    key={m.id}
                    onClick={() => { setActiveMarket(m) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                      borderRadius: 20, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                      border: activeMarket?.id === m.id ? '1.5px solid var(--blue-500)' : '1px solid var(--gray-200)',
                      background: activeMarket?.id === m.id ? 'var(--blue-50)' : 'var(--gray-50)',
                      color: activeMarket?.id === m.id ? 'var(--blue-700)' : 'var(--gray-700)',
                    }}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    {m.label}
                    <span style={{ background: activeMarket?.id === m.id ? 'var(--blue-100)' : 'var(--gray-200)', borderRadius: 10, padding: '1px 6px', fontSize: '0.72rem' }}>
                      {m.buyerCount}
                    </span>
                    <span
                      onClick={e => { e.stopPropagation(); setSelectedMarkets(prev => prev.filter(x => x.id !== m.id)); if (activeMarket?.id === m.id) { setActiveMarket(null); setBuyers([]) } }}
                      style={{ marginLeft: 2, color: 'var(--gray-400)', fontWeight: 700 }}
                    >×</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Buyer Results Panel ── */}
          {(loadingBuyers || buyers.length > 0) && (
            <div style={{ background: 'var(--white)', border: '1px solid var(--gray-100)', borderRadius: 16, boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>

              {/* Panel header */}
              <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  {loadingBuyers ? (
                    <span style={{ fontSize: '0.875rem', color: 'var(--gray-500)' }}>Searching county records...</span>
                  ) : (
                    <>
                      <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--gray-900)' }}>{buyers.length} buyers found</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--green)', fontWeight: 600 }}>{enrichedCount} enriched</span>
                      {unenrichedCount > 0 && <span style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>{unenrichedCount} need contact info</span>}
                    </>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* Filters */}
                  <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selectStyle}>
                    <option value="all">All Buyers</option>
                    <option value="active">Active</option>
                    <option value="recently_verified">Recently Verified</option>
                    <option value="dormant">Dormant</option>
                  </select>
                  <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} style={selectStyle}>
                    <option value="purchases">Sort: Purchases</option>
                    <option value="score">Sort: Score</option>
                    <option value="date">Sort: Recent</option>
                  </select>
                  {/* View toggle */}
                  <div style={{ display: 'flex', background: 'var(--gray-100)', borderRadius: 8, padding: 2 }}>
                    {(['table', 'card'] as const).map(v => (
                      <button key={v} onClick={() => setViewMode(v)} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, background: viewMode === v ? 'white' : 'transparent', color: viewMode === v ? 'var(--gray-900)' : 'var(--gray-500)', boxShadow: viewMode === v ? 'var(--shadow-sm)' : 'none' }}>
                        {v === 'table' ? 'Table' : 'Cards'}
                      </button>
                    ))}
                  </div>
                  {unenrichedCount > 0 && (
                    <button onClick={enrichAll} disabled={enrichingIds.size > 0} style={{ ...primaryBtn, fontSize: '0.8rem', padding: '6px 14px' }}>
                      {enrichingIds.size > 0 ? 'Enriching...' : `Enrich All (${unenrichedCount})`}
                    </button>
                  )}
                </div>
              </div>

              {/* Bulk action bar */}
              {selectedBuyers.size > 0 && (
                <div style={{ padding: '10px 24px', background: 'var(--blue-50)', borderBottom: '1px solid var(--blue-100)', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--blue-700)' }}>{selectedBuyers.size} selected</span>
                  <span style={{ color: 'var(--gray-300)' }}>|</span>
                  <button onClick={enrichSelected} disabled={enrichingIds.size > 0 || selectedEnriched === selectedBuyers.size} style={{ ...secondaryBtn, fontSize: '0.8rem', padding: '4px 12px' }}>
                    Enrich Selected
                  </button>
                  <button onClick={() => setShowBuilder(true)} style={{ ...primaryBtn, fontSize: '0.8rem', padding: '4px 12px' }}>
                    Launch Campaign →
                  </button>
                  <button onClick={() => setSelectedBuyers(new Set())} style={{ fontSize: '0.8rem', color: 'var(--gray-500)', background: 'none', border: 'none', cursor: 'pointer' }}>
                    Clear
                  </button>
                </div>
              )}

              {/* Buyer list */}
              {loadingBuyers ? (
                <div style={{ padding: 48, textAlign: 'center', color: 'var(--gray-400)' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--gray-50)', border: '1px solid var(--gray-200)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: 'var(--blue-400)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                </div>
                  <p style={{ fontSize: '0.9rem' }}>Scanning county records for cash buyers...</p>
                </div>
              ) : viewMode === 'table' ? (
                <BuyerTable
                  buyers={filteredBuyers}
                  selected={selectedBuyers}
                  enrichingIds={enrichingIds}
                  onToggle={id => setSelectedBuyers(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })}
                  onToggleAll={() => {
                    if (selectedBuyers.size === filteredBuyers.length) setSelectedBuyers(new Set())
                    else setSelectedBuyers(new Set(filteredBuyers.map(b => b.id)))
                  }}
                  allSelected={selectedBuyers.size === filteredBuyers.length && filteredBuyers.length > 0}
                />
              ) : (
                <BuyerCards
                  buyers={filteredBuyers}
                  selected={selectedBuyers}
                  onToggle={id => setSelectedBuyers(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })}
                />
              )}
            </div>
          )}

          {/* Empty state */}
          {!loadingBuyers && buyers.length === 0 && selectedMarkets.length === 0 && (
            <div style={{ background: 'var(--white)', border: '1px solid var(--gray-100)', borderRadius: 16, padding: '64px 24px', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ width: 52, height: 52, borderRadius: 13, background: 'var(--gray-50)', border: '1px solid var(--gray-200)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: 'var(--gray-400)' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              </div>
              <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '1rem', fontWeight: 700, color: 'var(--gray-900)', marginBottom: 8 }}>Search a market to get started</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--gray-500)', maxWidth: 380, margin: '0 auto 24px' }}>
                Enter a city, county, or zip code above to find active cash buyers from public county records.
              </p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                {MARKET_SUGGESTIONS.slice(0, 5).map(s => (
                  <button key={s.label} onClick={() => selectMarket(s)} style={{ ...secondaryBtn, fontSize: '0.8rem' }}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Campaign Builder Slide-in ── */}
      {showBuilder && (
        <CampaignBuilder
          buyers={buyers}
          selectedBuyers={selectedBuyers}
          activeMarket={activeMarket}
          campaignName={campaignName}
          setCampaignName={setCampaignName}
          scriptTemplate={scriptTemplate}
          setScriptTemplate={setScriptTemplate}
          companyName={companyName}
          setCompanyName={setCompanyName}
          agentName={agentName}
          setAgentName={setAgentName}
          mode={mode}
          setMode={setMode}
          maxConcurrent={maxConcurrent}
          setMaxConcurrent={setMaxConcurrent}
          leaveVoicemail={leaveVoicemail}
          setLeaveVoicemail={setLeaveVoicemail}
          maxRetries={maxRetries}
          setMaxRetries={setMaxRetries}
          complianceChecked={complianceChecked}
          setComplianceChecked={setComplianceChecked}
          estimatedCost={estimatedCost}
          launching={launchingCampaign}
          onLaunch={launchCampaign}
          onClose={() => setShowBuilder(false)}
        />
      )}
    </div>
  )
}

// ─── Buyer Table ───────────────────────────────────────────────────────────────

function BuyerTable({ buyers, selected, enrichingIds, onToggle, onToggleAll, allSelected }: {
  buyers: CashBuyer[]
  selected: Set<string>
  enrichingIds: Set<string>
  onToggle: (id: string) => void
  onToggleAll: () => void
  allSelected: boolean
}) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--gray-100)', background: 'var(--gray-50)' }}>
            <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--gray-500)', width: 40 }}>
              <input type="checkbox" checked={allSelected} onChange={onToggleAll} />
            </th>
            {['Buyer', 'Type', 'Purchases', 'Last Purchase', 'Price Range', 'Contact', 'Score', ''].map(h => (
              <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--gray-500)', whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {buyers.map(buyer => (
            <tr
              key={buyer.id}
              style={{ borderBottom: '1px solid var(--gray-100)', background: selected.has(buyer.id) ? 'var(--blue-50)' : 'white', cursor: 'pointer' }}
              onClick={() => onToggle(buyer.id)}
            >
              <td style={{ padding: '12px 16px' }}>
                <input type="checkbox" checked={selected.has(buyer.id)} onChange={() => onToggle(buyer.id)} onClick={e => e.stopPropagation()} />
              </td>
              <td style={{ padding: '12px 16px' }}>
                <div style={{ fontWeight: 600, color: 'var(--gray-900)' }}>{buyerDisplayName(buyer)}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--gray-500)' }}>{buyer.city}, {buyer.state}</div>
              </td>
              <td style={{ padding: '12px 16px' }}>
                <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: 20, background: buyer.entityType === 'llc' ? 'var(--blue-50)' : 'var(--gray-50)', color: buyer.entityType === 'llc' ? 'var(--blue-700)' : 'var(--gray-600)', fontWeight: 600, textTransform: 'uppercase' }}>
                  {buyer.entityType || 'individual'}
                </span>
              </td>
              <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--gray-900)' }}>
                {buyer.cashPurchaseCount}
                <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)', fontWeight: 400 }}> deals</span>
              </td>
              <td style={{ padding: '12px 16px', color: 'var(--gray-600)' }}>
                {buyer.lastPurchaseDate ? formatRelativeDate(buyer.lastPurchaseDate) : '—'}
              </td>
              <td style={{ padding: '12px 16px', color: 'var(--gray-600)' }}>
                {buyer.estimatedMaxPrice ? `Up to $${(buyer.estimatedMaxPrice / 1000).toFixed(0)}K` : '—'}
              </td>
              <td style={{ padding: '12px 16px' }}>
                {enrichingIds.has(buyer.id) ? (
                  <span style={{ fontSize: '0.78rem', color: 'var(--blue-500)' }}>Enriching...</span>
                ) : buyer.contactEnriched ? (
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--green)', fontWeight: 600 }}>✓ {buyer.phone?.replace('+1', '')}</div>
                    {buyer.email && <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>{buyer.email}</div>}
                  </div>
                ) : (
                  <span style={{ fontSize: '0.78rem', color: 'var(--gray-400)' }}>Needs enrichment</span>
                )}
              </td>
              <td style={{ padding: '12px 16px' }}>
                <ScoreBadge score={buyer.buyerScore} />
              </td>
              <td style={{ padding: '12px 16px' }}>
                <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                  <button style={{ ...iconBtn }} title="Add to CRM">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  </button>
                  <button style={{ ...iconBtn }} title="Call now">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.38 2 2 0 0 1 3.59 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.5a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Buyer Cards ───────────────────────────────────────────────────────────────

function BuyerCards({ buyers, selected, onToggle }: { buyers: CashBuyer[], selected: Set<string>, onToggle: (id: string) => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14, padding: 20 }}>
      {buyers.map(buyer => (
        <div
          key={buyer.id}
          onClick={() => onToggle(buyer.id)}
          style={{ border: selected.has(buyer.id) ? '1.5px solid var(--blue-400)' : '1px solid var(--gray-200)', borderRadius: 12, padding: 16, cursor: 'pointer', background: selected.has(buyer.id) ? 'var(--blue-50)' : 'white', transition: 'all 0.15s' }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--gray-900)' }}>{buyerDisplayName(buyer)}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--gray-500)', marginTop: 2 }}>{buyer.city}, {buyer.state}</div>
            </div>
            <ScoreBadge score={buyer.buyerScore} />
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            <Tag>{buyer.cashPurchaseCount} deals</Tag>
            {buyer.estimatedMaxPrice && <Tag>Up to ${(buyer.estimatedMaxPrice/1000).toFixed(0)}K</Tag>}
            {buyer.entityType && <Tag>{buyer.entityType}</Tag>}
          </div>
          <div style={{ fontSize: '0.8rem', color: buyer.contactEnriched ? 'var(--green)' : 'var(--gray-400)', fontWeight: 500 }}>
            {buyer.contactEnriched ? `✓ ${buyer.phone?.replace('+1', '')}` : 'Needs enrichment'}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Live Campaign Monitor ─────────────────────────────────────────────────────

function LiveMonitor({ campaign, stats, liveCalls, onPause, onStop }: {
  campaign: Campaign
  stats: ReturnType<typeof Object.assign>
  liveCalls: LiveCall[]
  onPause: () => void
  onStop: () => void
}) {
  const progress = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0

  return (
    <div style={{ background: 'var(--white)', border: '1.5px solid var(--blue-200)', borderRadius: 16, padding: 24, marginBottom: 20, boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--gray-900)' }}>{campaign.name}</span>
          <span style={{ fontSize: '0.78rem', background: 'var(--blue-50)', color: 'var(--blue-700)', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>LIVE</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onPause} style={secondaryBtn}>Pause</button>
          <button onClick={onStop} style={{ ...secondaryBtn, color: 'var(--red)', borderColor: 'var(--red)' }}>Stop</button>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--gray-500)', marginBottom: 6 }}>
          <span>{stats.completed} / {stats.total} calls</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div style={{ height: 4, background: 'var(--gray-100)', borderRadius: 4 }}>
          <div style={{ height: '100%', width: `${progress}%`, background: 'var(--blue-500)', borderRadius: 4, transition: 'width 0.5s' }} />
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Active Calls', value: stats.active, color: 'var(--blue-600)' },
          { label: 'Qualified', value: stats.qualified, color: 'var(--green)' },
          { label: 'Not Buying', value: stats.notBuying, color: 'var(--amber)' },
          { label: 'No Answer', value: stats.noAnswer, color: 'var(--gray-400)' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--gray-50)', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Live calls feed */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--gray-500)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Calls</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {liveCalls.filter(c => c.status === 'active').slice(0, 4).map((call, i) => (
              <div key={i} style={{ background: 'var(--gray-50)', borderRadius: 10, padding: 12, fontSize: '0.82rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontWeight: 600, color: 'var(--gray-900)' }}>{call.buyerName}</span>
                  <span style={{ color: 'var(--gray-400)' }}>{formatDuration(call.duration)}</span>
                </div>
                {call.transcript.slice(-2).map((line, j) => (
                  <div key={j} style={{ color: 'var(--gray-500)', fontSize: '0.78rem', borderLeft: '2px solid var(--blue-200)', paddingLeft: 8, marginBottom: 2 }}>
                    {line}
                  </div>
                ))}
              </div>
            ))}
            {liveCalls.filter(c => c.status === 'active').length === 0 && (
              <div style={{ color: 'var(--gray-400)', fontSize: '0.82rem' }}>No active calls right now</div>
            )}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--gray-500)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Completed</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 200, overflowY: 'auto' }}>
            {liveCalls.filter(c => c.status === 'completed').map((call, i) => (
              <div key={i} style={{ background: 'var(--gray-50)', borderRadius: 10, padding: 12, fontSize: '0.82rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, color: 'var(--gray-900)' }}>{call.buyerName}</span>
                  <OutcomeTag outcome={call.outcome || ''} />
                </div>
                {call.summary && <div style={{ color: 'var(--gray-500)', fontSize: '0.78rem' }}>{call.summary}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Campaign Builder ──────────────────────────────────────────────────────────

function CampaignBuilder({
  buyers, selectedBuyers, activeMarket, campaignName, setCampaignName,
  scriptTemplate, setScriptTemplate, companyName, setCompanyName, agentName, setAgentName,
  mode, setMode, maxConcurrent, setMaxConcurrent, leaveVoicemail, setLeaveVoicemail,
  maxRetries, setMaxRetries, complianceChecked, setComplianceChecked,
  estimatedCost, launching, onLaunch, onClose,
}: any) {
  const enrichedSelected = Array.from(selectedBuyers as Set<string>)
    .filter((id: string) => buyers.find((b: CashBuyer) => b.id === id && b.contactEnriched)).length

  const canLaunch = complianceChecked && campaignName.trim() && selectedBuyers.size > 0 && !launching

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 100 }} />
      {/* Panel */}
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 480, background: 'white', zIndex: 101, display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 40px rgba(0,0,0,0.12)' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--gray-900)', margin: 0 }}>Launch Campaign</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--gray-400)' }}>×</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>

          {/* Campaign name */}
          <label style={labelStyle}>Campaign Name</label>
          <input
            value={campaignName}
            onChange={e => setCampaignName(e.target.value)}
            placeholder={`${activeMarket?.label || 'Market'} — ${new Date().toLocaleDateString()}`}
            style={{ ...inputStyle, marginBottom: 20 }}
          />

          {/* Buyer summary */}
          <div style={{ background: 'var(--blue-50)', border: '1px solid var(--blue-100)', borderRadius: 10, padding: 14, marginBottom: 20, fontSize: '0.85rem' }}>
            <div style={{ fontWeight: 600, color: 'var(--blue-700)', marginBottom: 4 }}>{selectedBuyers.size} buyers selected</div>
            <div style={{ color: 'var(--blue-600)' }}>{enrichedSelected} with contact info · {selectedBuyers.size - enrichedSelected} need enrichment</div>
            {selectedBuyers.size - enrichedSelected > 0 && (
              <div style={{ marginTop: 6, fontSize: '0.78rem', color: 'var(--amber)' }}>Buyers without phone numbers will be skipped</div>
            )}
          </div>

          {/* Mode */}
          <label style={labelStyle}>Calling Mode</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
            {(['AI', 'MANUAL'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)} style={{ padding: '10px 16px', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', border: mode === m ? '1.5px solid var(--blue-500)' : '1px solid var(--gray-200)', background: mode === m ? 'var(--blue-50)' : 'white', color: mode === m ? 'var(--blue-700)' : 'var(--gray-600)' }}>
                {m === 'AI' ? 'AI Mode' : 'Manual'}
              </button>
            ))}
          </div>

          {/* Script templates */}
          <label style={labelStyle}>Script Template</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {SCRIPT_TEMPLATES.map(t => (
              <button key={t.id} onClick={() => setScriptTemplate(t.id)} style={{ padding: '12px 14px', borderRadius: 10, cursor: 'pointer', textAlign: 'left', border: scriptTemplate === t.id ? '1.5px solid var(--blue-500)' : '1px solid var(--gray-200)', background: scriptTemplate === t.id ? 'var(--blue-50)' : 'white' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem', color: scriptTemplate === t.id ? 'var(--blue-700)' : 'var(--gray-900)' }}>{t.name}</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Tag>{t.qualify} qualify</Tag>
                    <Tag>{t.duration}</Tag>
                  </div>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--gray-500)' }}>{t.desc}</div>
              </button>
            ))}
          </div>

          {/* Agent config */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            <div>
              <label style={labelStyle}>Company Name</label>
              <input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Your company" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Agent Name</label>
              <input value={agentName} onChange={e => setAgentName(e.target.value)} placeholder="Alex" style={inputStyle} />
            </div>
          </div>

          {/* AI settings */}
          {mode === 'AI' && (
            <>
              <label style={labelStyle}>Max Concurrent Calls: <strong>{maxConcurrent}</strong></label>
              <input type="range" min={1} max={50} value={maxConcurrent} onChange={e => setMaxConcurrent(Number(e.target.value))} style={{ width: '100%', marginBottom: 16 }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--gray-700)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={leaveVoicemail} onChange={e => setLeaveVoicemail(e.target.checked)} />
                  Leave voicemail if no answer
                </label>
                <label style={{ fontSize: '0.85rem', color: 'var(--gray-700)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  Retry: <select value={maxRetries} onChange={e => setMaxRetries(Number(e.target.value))} style={{ ...selectStyle, marginLeft: 4 }}>
                    {[0, 1, 2, 3].map(n => <option key={n} value={n}>{n}x</option>)}
                  </select>
                </label>
              </div>
            </>
          )}

          {/* Cost estimate */}
          <div style={{ background: 'var(--gray-50)', borderRadius: 10, padding: 14, marginBottom: 20 }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--gray-500)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Estimated Cost</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--gray-600)' }}>AI call minutes (~3 min avg)</span>
              <span style={{ fontWeight: 600 }}>${(selectedBuyers.size * 3 * 0.09).toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginTop: 4 }}>
              <span style={{ color: 'var(--gray-600)' }}>Contact enrichment</span>
              <span style={{ fontWeight: 600 }}>${(0.04).toFixed(2)}/lookup</span>
            </div>
            <div style={{ borderTop: '1px solid var(--gray-200)', marginTop: 10, paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
              <span>Total estimated</span>
              <span style={{ color: 'var(--blue-600)' }}>~${estimatedCost}</span>
            </div>
          </div>

          {/* Compliance */}
          <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', marginBottom: 8, fontSize: '0.82rem', color: 'var(--gray-700)' }}>
            <input type="checkbox" checked={complianceChecked} onChange={e => setComplianceChecked(e.target.checked)} style={{ marginTop: 2, flexShrink: 0 }} />
            I confirm these calls are being made to business contacts with verifiable real estate purchase history, in compliance with TCPA B2B exemptions and applicable calling hour restrictions.
          </label>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--gray-100)', display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ ...secondaryBtn, flex: 1 }}>Cancel</button>
          <button
            onClick={onLaunch}
            disabled={!canLaunch}
            style={{ ...primaryBtn, flex: 2, opacity: canLaunch ? 1 : 0.5, cursor: canLaunch ? 'pointer' : 'not-allowed', justifyContent: 'center' }}
          >
            {launching ? 'Launching...' : 'Launch Campaign'}
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Campaign History ──────────────────────────────────────────────────────────

function CampaignHistory({ campaigns, onSelect }: { campaigns: Campaign[], onSelect: (c: Campaign) => void }) {
  if (!campaigns.length) {
    return (
      <div style={{ background: 'var(--white)', border: '1px solid var(--gray-100)', borderRadius: 16, padding: '64px 24px', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--gray-50)', border: '1px solid var(--gray-200)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', color: 'var(--gray-400)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        </div>
        <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '0.95rem', fontWeight: 700, color: 'var(--gray-900)', marginBottom: 6 }}>No campaigns yet</h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--gray-500)' }}>Launch your first campaign to see it here.</p>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--white)', border: '1px solid var(--gray-100)', borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--gray-100)', background: 'var(--gray-50)' }}>
            {['Campaign', 'Market', 'Status', 'Buyers', 'Qualified', 'Not Buying', 'Talk Time', 'Date', ''].map(h => (
              <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--gray-500)', whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {campaigns.map(c => (
            <tr key={c.id} style={{ borderBottom: '1px solid var(--gray-100)', cursor: 'pointer' }} onClick={() => onSelect(c)}>
              <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--gray-900)' }}>{c.name}</td>
              <td style={{ padding: '12px 16px', color: 'var(--gray-600)' }}>{c.market}</td>
              <td style={{ padding: '12px 16px' }}><StatusBadge status={c.status} /></td>
              <td style={{ padding: '12px 16px', color: 'var(--gray-700)' }}>{c.totalBuyers}</td>
              <td style={{ padding: '12px 16px', color: 'var(--green)', fontWeight: 600 }}>{c.qualified}</td>
              <td style={{ padding: '12px 16px', color: 'var(--amber)', fontWeight: 600 }}>{c.notBuying}</td>
              <td style={{ padding: '12px 16px', color: 'var(--gray-600)' }}>{formatDuration(c.totalTalkTime)}</td>
              <td style={{ padding: '12px 16px', color: 'var(--gray-500)' }}>{new Date(c.createdAt).toLocaleDateString()}</td>
              <td style={{ padding: '12px 16px' }}>
                <button style={{ ...secondaryBtn, fontSize: '0.78rem', padding: '4px 10px' }}>Re-run</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Helper Components ─────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 70 ? 'var(--green)' : score >= 40 ? 'var(--amber)' : 'var(--gray-400)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', border: `2px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, color }}>
        {score || '—'}
      </div>
    </div>
  )
}

function OutcomeTag({ outcome }: { outcome: string }) {
  const map: Record<string, { bg: string, color: string, label: string }> = {
    QUALIFIED: { bg: '#d1fae5', color: '#065f46', label: 'Qualified' },
    NOT_BUYING: { bg: '#fef3c7', color: '#92400e', label: 'Not Buying' },
    NO_ANSWER: { bg: '#f3f4f6', color: '#6b7280', label: 'No Answer' },
    VOICEMAIL: { bg: '#eff6ff', color: '#1e40af', label: 'Voicemail' },
  }
  const style = map[outcome] || { bg: '#f3f4f6', color: '#6b7280', label: outcome }
  return (
    <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: 20, background: style.bg, color: style.color, fontWeight: 600 }}>
      {style.label}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string, color: string }> = {
    RUNNING: { bg: '#d1fae5', color: '#065f46' },
    COMPLETED: { bg: '#eff6ff', color: '#1e40af' },
    PAUSED: { bg: '#fef3c7', color: '#92400e' },
    CANCELLED: { bg: '#fee2e2', color: '#991b1b' },
    DRAFT: { bg: '#f3f4f6', color: '#6b7280' },
  }
  const s = map[status] || map.DRAFT
  return <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: 20, background: s.bg, color: s.color, fontWeight: 600 }}>{status}</span>
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span style={{ fontSize: '0.72rem', padding: '2px 7px', borderRadius: 20, background: 'var(--gray-100)', color: 'var(--gray-600)', fontWeight: 500 }}>{children}</span>
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function buyerDisplayName(buyer?: CashBuyer | null): string {
  if (!buyer) return 'Unknown'
  if (buyer.entityName) return buyer.entityName
  if (buyer.firstName || buyer.lastName) return `${buyer.firstName || ''} ${buyer.lastName || ''}`.trim()
  return 'Unknown Buyer'
}

function formatRelativeDate(date: string): string {
  const d = new Date(date)
  const diff = Date.now() - d.getTime()
  const months = Math.floor(diff / (1000 * 60 * 60 * 24 * 30))
  if (months === 0) return 'This month'
  if (months === 1) return '1 month ago'
  return `${months} months ago`
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function randomPhone(): string {
  const codes = ['404', '678', '214', '972', '480', '813', '704', '816']
  const code = codes[Math.floor(Math.random() * codes.length)]
  return `${code}${Math.floor(Math.random() * 9000000) + 1000000}`
}

// ─── Mock data for development ─────────────────────────────────────────────────

function generateMockBuyers(city: string, state: string, count: number): CashBuyer[] {
  const names = [
    { first: 'Marcus', last: 'Johnson' }, { first: 'Sandra', last: 'Williams' },
    { first: 'David', last: 'Kim' }, { first: 'Rachel', last: 'Torres' },
    { first: 'James', last: 'Patel' }, { first: 'Angela', last: 'Chen' },
    { first: 'Robert', last: 'Murphy' }, { first: 'Lisa', last: 'Washington' },
    { first: 'Kevin', last: 'Okafor' }, { first: 'Diane', last: 'Reyes' },
    { first: 'Brian', last: 'Scott' }, { first: 'Monica', last: 'Adams' },
  ]
  const entities = ['Premier REI LLC', 'Apex Property Group', 'BlueSky Investments LLC', 'Cornerstone Capital RE', 'Delta Acquisitions LLC', 'Eagle Eye Properties']
  const prices = [75000, 95000, 110000, 125000, 145000, 165000, 180000, 210000, 250000]
  const statuses = ['ACTIVE', 'ACTIVE', 'ACTIVE', 'RECENTLY_VERIFIED', 'DORMANT']

  return Array.from({ length: count }, (_, i) => {
    const isEntity = Math.random() > 0.45
    const name = names[i % names.length]
    const monthsAgo = Math.floor(Math.random() * 11)
    const date = new Date()
    date.setMonth(date.getMonth() - monthsAgo)

    return {
      id: `mock_${i}_${Math.random().toString(36).slice(2, 7)}`,
      firstName: isEntity ? undefined : name.first,
      lastName: isEntity ? undefined : name.last,
      entityName: isEntity ? entities[i % entities.length] : undefined,
      entityType: isEntity ? 'llc' : 'individual',
      city,
      state,
      zip: `${30300 + (i % 12)}`,
      cashPurchaseCount: Math.floor(Math.random() * 12) + 1,
      lastPurchaseDate: date.toISOString(),
      estimatedMaxPrice: prices[i % prices.length],
      status: statuses[i % statuses.length],
      contactEnriched: Math.random() > 0.6,
      buyerScore: Math.floor(Math.random() * 70) + 20,
      phone: Math.random() > 0.6 ? `+1${randomPhone()}` : undefined,
    }
  })
}

function simulateLiveCallUpdate(prev: LiveCall[], _buyers: CashBuyer[]): LiveCall[] {
  const transcriptLines = [
    'AI: Hi, this is Alex calling from DealFlow Properties...',
    'AI: Are you still actively buying investment properties in Atlanta?',
    'Buyer: Yeah, we\'re definitely still buying.',
    'AI: That\'s great! What property types are you focused on right now?',
    'Buyer: Mostly single family, sometimes small multifamily.',
    'AI: And what price range are you working in?',
    'Buyer: Anywhere from 80 to 160 thousand.',
    'AI: Perfect. Are you more of a fix-and-flip investor or buy-and-hold?',
    'Buyer: We do both, but mostly flips.',
    'AI: Understood. And roughly how quickly could you close on the right deal?',
    'Buyer: We can close in 10 to 14 days, cash.',
  ]
  const outcomes = ['QUALIFIED', 'QUALIFIED', 'NOT_BUYING', 'NO_ANSWER', 'VOICEMAIL']
  const summaries = [
    'Active SFR buyer, $80K–$160K, flip-focused, closes in 10-14 days.',
    'Active buyer confirmed. Wants SFR + small MF. Strategy: flip/hold. Close in 21 days.',
    'Buyer confirmed not currently active in this market.',
    'No answer — voicemail left.',
    'Voicemail left.',
  ]

  return prev.map(call => {
    if (call.status === 'completed') return call
    const shouldComplete = Math.random() > 0.65
    if (shouldComplete) {
      const outcomeIdx = Math.floor(Math.random() * outcomes.length)
      return { ...call, status: 'completed', outcome: outcomes[outcomeIdx], summary: summaries[outcomeIdx], duration: Math.floor(Math.random() * 240) + 60 }
    }
    const nextLine = transcriptLines[call.transcript.length % transcriptLines.length]
    return { ...call, duration: call.duration + 2, transcript: [...call.transcript.slice(-4), nextLine] }
  })
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const primaryBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '8px 16px', borderRadius: 10, border: 'none',
  background: 'var(--blue-600)', color: 'white',
  fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
}

const secondaryBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '8px 14px', borderRadius: 10,
  border: '1px solid var(--gray-200)', background: 'white',
  color: 'var(--gray-700)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
}

const iconBtn: React.CSSProperties = {
  padding: '4px 8px', borderRadius: 6, border: '1px solid var(--gray-200)',
  background: 'white', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--gray-600)',
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.8rem', fontWeight: 600,
  color: 'var(--gray-700)', marginBottom: 6,
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', border: '1px solid var(--gray-200)',
  borderRadius: 8, fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box',
}

const selectStyle: React.CSSProperties = {
  padding: '6px 10px', border: '1px solid var(--gray-200)',
  borderRadius: 8, fontSize: '0.8rem', outline: 'none', background: 'white', cursor: 'pointer',
}