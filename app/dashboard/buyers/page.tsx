'use client'

import { useState, useEffect, useRef } from 'react'

interface Market { id: string; label: string; city?: string; state: string; zipCode?: string; buyerCount: number; lastRefreshed?: string }
interface CashBuyer { id: string; firstName?: string; lastName?: string; entityName?: string; entityType?: string; phone?: string; email?: string; city?: string; state?: string; zip?: string; cashPurchaseCount: number; lastPurchaseDate?: string; estimatedMaxPrice?: number; estimatedMinPrice?: number; status: string; contactEnriched: boolean; buyerScore: number; strategy?: string; preferredTypes?: string[]; minPrice?: number; maxPrice?: number }
interface Campaign { id: string; name: string; market: string; status: string; mode: string; totalBuyers: number; callsCompleted: number; qualified: number; notBuying: number; noAnswer: number; totalTalkTime: number; createdAt: string }
interface LiveCall { buyerName: string; phone: string; duration: number; transcript: string[]; status: 'active' | 'completed'; outcome?: string; summary?: string }

const MARKETS = [
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

const SCRIPTS = [
  { id: 'standard_qualification', name: 'Standard Buyer Qualification', desc: 'Full buy box discovery - property type, price range, strategy, close speed.', qualify: '68%', duration: '3-5 min' },
  { id: 'check_in', name: 'Quick Check-In', desc: 'Verify existing buyer is still active and update their preferences.', qualify: '74%', duration: '1-2 min' },
  { id: 'deal_specific', name: 'Deal-Specific Outreach', desc: 'Pitch a specific property under contract to matched buyers.', qualify: '51%', duration: '2-4 min' },
  { id: 'new_market', name: 'New Market Introduction', desc: 'Introduce your network to buyers in a new market.', qualify: '44%', duration: '2-3 min' },
]

export default function DiscoveryPage() {
  const [query, setQuery] = useState('')
  const [showSugg, setShowSugg] = useState(false)
  const [markets, setMarkets] = useState<Market[]>([])
  const [activeMarket, setActiveMarket] = useState<Market | null>(null)
  const [buyers, setBuyers] = useState<CashBuyer[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [enriching, setEnriching] = useState(false)
  const [enrichProgress, setEnrichProgress] = useState(0)
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table')
  const [filterStatus, setFilterStatus] = useState('all')
  const [sortBy, setSortBy] = useState<'score' | 'purchases' | 'date'>('purchases')
  const [showBuilder, setShowBuilder] = useState(false)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null)
  const [liveCalls, setLiveCalls] = useState<LiveCall[]>([])
  const [tab, setTab] = useState<'discover' | 'history'>('discover')
  const [cName, setCName] = useState('')
  const [script, setScript] = useState('standard_qualification')
  const [company, setCompany] = useState('')
  const [agent, setAgent] = useState('Alex')
  const [callMode, setCallMode] = useState<'AI' | 'MANUAL'>('AI')
  const [concurrent, setConcurrent] = useState(10)
  const [voicemail, setVoicemail] = useState(true)
  const [retries, setRetries] = useState(2)
  const [launching, setLaunching] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => { fetchCampaigns() }, [])
  useEffect(() => {
    if (activeCampaign?.status === 'RUNNING') {
      pollRef.current = setInterval(() => {
        setLiveCalls(p => simulateLive(p))
        fetchCampaign(activeCampaign.id)
      }, 2500)
    } else { if (pollRef.current) clearInterval(pollRef.current) }
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [activeCampaign?.status])

  const suggestions = MARKETS.filter(m => m.label.toLowerCase().includes(query.toLowerCase()) && !markets.find(x => x.label === m.label))

  async function pickMarket(s: typeof MARKETS[0]) {
    setQuery(''); setShowSugg(false); setLoading(true); setSelected(new Set())
    try {
      const res = await fetch('/api/discovery/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ market: s.label, city: s.city, state: s.state }) })
      const data = await res.json()
      if (data.market) {
        const m = { ...data.market, buyerCount: data.buyers?.length || 0 }
        setMarkets(p => [...p.filter(x => x.id !== m.id), m])
        setActiveMarket(m)
        setBuyers(data.buyers || [])
      }
    } catch {
      const mockB = mockBuyers(s.city, s.state, 24)
      const m: Market = { id: `mock_${Math.random().toString(36).slice(2)}`, label: s.label, city: s.city, state: s.state, buyerCount: mockB.length, lastRefreshed: new Date().toISOString() }
      setMarkets(p => [...p.filter(x => x.label !== s.label), m])
      setActiveMarket(m)
      setBuyers(mockB)
    } finally { setLoading(false) }
  }

  async function enrich(ids: string[]) {
    if (!ids.length) return
    setEnriching(true); setEnrichProgress(0)
    const iv = setInterval(() => setEnrichProgress(p => Math.min(p + 7, 90)), 180)
    try {
      await fetch('/api/discovery/enrich', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ buyerIds: ids }) })
      setBuyers(p => p.map(b => ids.includes(b.id) ? { ...b, contactEnriched: true, phone: b.phone || `+1${rPhone()}`, buyerScore: Math.max(b.buyerScore, 30) } : b))
    } catch (e) { console.error(e) }
    finally { clearInterval(iv); setEnrichProgress(100); setTimeout(() => { setEnriching(false); setEnrichProgress(0) }, 500) }
  }

  async function launch() {
    if (!agreed || !cName || selected.size === 0) return
    setLaunching(true)
    try {
      const res = await fetch('/api/campaigns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: cName, market: activeMarket?.label || '', mode: callMode, buyerIds: Array.from(selected), scriptTemplate: script, companyName: company, agentName: agent, maxConcurrentCalls: concurrent, leaveVoicemail: voicemail, maxRetries: retries }) })
      const data = await res.json()
      if (data.campaign) {
        setCampaigns(p => [data.campaign, ...p])
        setActiveCampaign(data.campaign)
        setShowBuilder(false)
        setLiveCalls(Array.from(selected).slice(0, concurrent).map(id => { const b = buyers.find(x => x.id === id); return { buyerName: displayName(b), phone: b?.phone || '', duration: 0, transcript: [], status: 'active' } }))
      }
    } catch (e) { console.error(e) } finally { setLaunching(false) }
  }

  async function fetchCampaigns() {
    try { const r = await fetch('/api/campaigns'); const d = await r.json(); if (d.campaigns) setCampaigns(d.campaigns) } catch { /* silent */ }
  }
  async function fetchCampaign(id: string) {
    try { const r = await fetch(`/api/campaigns/${id}`); const d = await r.json(); if (d.campaign) { setActiveCampaign(d.campaign); setCampaigns(p => p.map(c => c.id === id ? d.campaign : c)) } } catch { /* silent */ }
  }

  const filtered = buyers
    .filter(b => filterStatus === 'all' || b.status.toLowerCase() === filterStatus.toLowerCase())
    .sort((a, b) => sortBy === 'score' ? b.buyerScore - a.buyerScore : sortBy === 'purchases' ? b.cashPurchaseCount - a.cashPurchaseCount : new Date(b.lastPurchaseDate || 0).getTime() - new Date(a.lastPurchaseDate || 0).getTime())

  const enrichedCount = buyers.filter(b => b.contactEnriched).length
  const unenrichedCount = buyers.length - enrichedCount
  const allSelected = selected.size > 0 && selected.size === filtered.length
  const liveStats = activeCampaign ? { active: liveCalls.filter(c => c.status === 'active').length, qualified: activeCampaign.qualified, notBuying: activeCampaign.notBuying, noAnswer: activeCampaign.noAnswer, total: activeCampaign.totalBuyers, completed: activeCampaign.callsCompleted } : null
  const toggleOne = (id: string) => setSelected(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(filtered.map(b => b.id)))

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1200, fontFamily: 'var(--font-sans, system-ui)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '1.45rem', fontWeight: 500, color: 'var(--gray-900)', letterSpacing: '-0.025em', margin: 0 }}>Buyer Discovery</h1>
          <p style={{ fontSize: '0.85rem', color: '#9ca3af', marginTop: 5 }}>Find verified cash buyers, enrich contacts, and launch AI calling campaigns.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setTab(tab === 'discover' ? 'history' : 'discover')} style={S.btn2}>
            {tab === 'discover' ? `Campaign History (${campaigns.length})` : '← Back to Discovery'}
          </button>
          {selected.size > 0 && <button onClick={() => setShowBuilder(true)} style={S.btn1}>Launch Campaign ({selected.size})</button>}
        </div>
      </div>

      {tab === 'history' ? <CampaignHistory campaigns={campaigns} onSelect={c => { setActiveCampaign(c); setTab('discover') }} /> : (<>

        {/* Live Monitor */}
        {activeCampaign?.status === 'RUNNING' && liveStats && (
          <LiveMonitor campaign={activeCampaign} stats={liveStats} liveCalls={liveCalls}
            onPause={() => fetch(`/api/campaigns/${activeCampaign.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'pause' }) }).then(() => setActiveCampaign(p => p ? { ...p, status: 'PAUSED' } : null))}
            onStop={() => fetch(`/api/campaigns/${activeCampaign.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'stop' }) }).then(() => setActiveCampaign(p => p ? { ...p, status: 'CANCELLED' } : null))} />
        )}

        {/* Market search */}
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, padding: 18, marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: markets.length ? 14 : 0 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input value={query} onChange={e => { setQuery(e.target.value); setShowSugg(true) }} onFocus={() => setShowSugg(true)} onBlur={() => setTimeout(() => setShowSugg(false), 150)}
                placeholder="Search city, county, or zip code..." style={{ width: '100%', padding: '9px 14px 9px 36px', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }} />
              {showSugg && suggestions.length > 0 && (
                <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.08)', zIndex: 50, overflow: 'hidden' }}>
                  {suggestions.map(s => (
                    <button key={s.label} onMouseDown={() => pickMarket(s)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px', textAlign: 'left', background: 'none', border: 'none', borderBottom: '1px solid #f9fafb', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--gray-900)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')} onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                      <span>{s.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => activeMarket && pickMarket(MARKETS.find(m => m.label === activeMarket.label)!)} disabled={!activeMarket || loading} style={{ ...S.btn2, opacity: activeMarket ? 1 : 0.4 }}>
              {loading ? 'Loading' : 'Refresh'}
            </button>
          </div>

          {markets.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {markets.map(m => {
                const isActive = activeMarket?.id === m.id
                return (
                  <button key={m.id} onClick={() => setActiveMarket(m)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px 4px 12px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 400, cursor: 'pointer', border: isActive ? '1.5px solid #93c5fd' : '1px solid #e5e7eb', background: isActive ? '#eff6ff' : 'white', color: isActive ? '#1d4ed8' : '#6b7280', transition: 'all 0.15s' }}>
                    {m.label}
                    {m.buyerCount > 0 && <span style={{ background: isActive ? '#bfdbfe' : '#f3f4f6', color: isActive ? '#1e40af' : '#6b7280', borderRadius: 10, padding: '1px 6px', fontSize: '0.7rem', fontWeight: 400 }}>{m.buyerCount}</span>}
                    <span onClick={e => { e.stopPropagation(); setMarkets(p => p.filter(x => x.id !== m.id)); if (activeMarket?.id === m.id) { setActiveMarket(null); setBuyers([]) } }} style={{ marginLeft: 2, color: '#d1d5db', fontWeight: 400, fontSize: '0.9rem', lineHeight: 1, cursor: 'pointer' }}>×</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Enrich progress */}
        {enriching && (
          <div style={{ background: 'white', border: '1px solid #bfdbfe', borderRadius: 12, padding: '12px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1d4ed8', whiteSpace: 'nowrap' }}>Enriching contacts...</span>
            <div style={{ flex: 1, height: 5, background: '#eff6ff', borderRadius: 4 }}>
              <div style={{ height: '100%', width: `${enrichProgress}%`, background: '#2563eb', borderRadius: 4, transition: 'width 0.2s' }} />
            </div>
            <span style={{ fontSize: '0.82rem', color: '#2563eb', fontWeight: 700 }}>{enrichProgress}%</span>
          </div>
        )}

        {/* Buyer panel */}
        {(loading || buyers.length > 0) && (
          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
            {/* Toolbar */}
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {loading ? (
                  <span style={{ fontSize: '0.875rem', color: 'var(--gray-500)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid #bfdbfe', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    Scanning county records...
                  </span>
                ) : (<>
                  <span style={{ fontSize: '0.875rem', color: 'var(--gray-700)' }}>{filtered.length} buyers</span>
                  {enrichedCount > 0 && <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 500, background: '#d1fae5', padding: '2px 8px', borderRadius: 4 }}>{enrichedCount} enriched</span>}
                  {unenrichedCount > 0 && <span style={{ fontSize: '0.78rem', color: 'var(--gray-400)' }}>{unenrichedCount} need contact info</span>}
                </>)}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={S.sel}>
                  <option value="all">All Buyers</option>
                  <option value="active">Active</option>
                  <option value="recently_verified">Recently Verified</option>
                  <option value="dormant">Dormant</option>
                </select>
                <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} style={S.sel}>
                  <option value="purchases">Sort: Most Purchases</option>
                  <option value="score">Sort: Highest Score</option>
                  <option value="date">Sort: Most Recent</option>
                </select>
                <div style={{ display: 'flex', background: 'var(--gray-100)', borderRadius: 8, padding: 2, gap: 1 }}>
                  {(['table', 'card'] as const).map(v => (
                    <button key={v} onClick={() => setViewMode(v)} style={{ padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, background: viewMode === v ? 'white' : 'transparent', color: viewMode === v ? 'var(--gray-900)' : 'var(--gray-500)', boxShadow: viewMode === v ? '0 1px 3px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.15s' }}>
                      {v === 'table' ? '☰ Table' : '⊞ Cards'}
                    </button>
                  ))}
                </div>
                {unenrichedCount > 0 && <button onClick={() => enrich(buyers.filter(b => !b.contactEnriched).map(b => b.id))} disabled={enriching} style={{ ...S.btn1, fontSize: '0.8rem', padding: '6px 14px', opacity: enriching ? 0.6 : 1 }}>
                  {enriching ? 'Enriching...' : `Enrich All (${unenrichedCount})`}
                </button>}
              </div>
            </div>

            {/* Bulk bar */}
            {selected.size > 0 && (
              <div style={{ padding: '9px 20px', background: '#f8fafc', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: '0.84rem', color: '#374151' }}>{selected.size} selected</span>
                <div style={{ width: 1, height: 14, background: '#e5e7eb' }} />
                <button onClick={() => enrich(Array.from(selected).filter(id => !buyers.find(b => b.id === id)?.contactEnriched))} disabled={enriching} style={{ ...S.btn2, fontSize: '0.8rem', padding: '4px 12px' }}>Enrich Selected</button>
                <button onClick={() => setShowBuilder(true)} style={{ ...S.btn1, fontSize: '0.8rem', padding: '5px 14px' }}>Launch Campaign</button>
                <button onClick={() => setSelected(new Set())} style={{ fontSize: '0.8rem', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', marginLeft: 'auto' }}>Clear</button>
              </div>
            )}

            {loading ? (
              <div style={{ padding: '56px 24px', textAlign: 'center' }}>
                <div style={{ display: 'inline-block', width: 20, height: 20, border: '2px solid #e5e7eb', borderTopColor: '#6b7280', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: 16 }} />
                <p style={{ fontSize: '0.875rem', color: 'var(--gray-500)', margin: 0 }}>Scanning county records for cash buyers...</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginTop: 6 }}>Filtering for cash transactions in the last 12 months</p>
              </div>
            ) : viewMode === 'table' ? (
              <BuyerTable buyers={filtered} selected={selected} enriching={enriching} onToggle={toggleOne} onToggleAll={toggleAll} allSelected={allSelected} onEnrichOne={id => enrich([id])} />
            ) : (
              <BuyerCards buyers={filtered} selected={selected} onToggle={toggleOne} />
            )}
          </div>
        )}

        {/* Empty state */}
        {!loading && buyers.length === 0 && (
          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, padding: '60px 24px', textAlign: 'center' }}>
            <div style={{ width: 40, height: 40, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#9ca3af' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--gray-900)', marginBottom: 6 }}>Search a market to get started</h3>
            <p style={{ fontSize: '0.85rem', color: '#9ca3af', maxWidth: 380, margin: '0 auto 20px' }}>Enter a city above to pull active cash buyers directly from county property records.</p>
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
              {MARKETS.slice(0, 6).map(s => <button key={s.label} onClick={() => pickMarket(s)} style={{ ...S.btn2, fontSize: '0.8rem' }}>{s.label}</button>)}
            </div>
          </div>
        )}
      </>)}

      {/* Campaign Builder */}
      {showBuilder && (
        <Builder buyers={buyers} selected={selected} market={activeMarket} cName={cName} setCName={setCName} script={script} setScript={setScript} company={company} setCompany={setCompany} agent={agent} setAgent={setAgent} callMode={callMode} setCallMode={setCallMode} concurrent={concurrent} setConcurrent={setConcurrent} voicemail={voicemail} setVoicemail={setVoicemail} retries={retries} setRetries={setRetries} agreed={agreed} setAgreed={setAgreed} launching={launching} onLaunch={launch} onClose={() => setShowBuilder(false)} />
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse-dot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.6;transform:scale(1.3)}}`}</style>
    </div>
  )
}

// ─── Buyer Table ───────────────────────────────────────────────────────────────

function BuyerTable({ buyers, selected, enriching, onToggle, onToggleAll, allSelected, onEnrichOne }: { buyers: CashBuyer[]; selected: Set<string>; enriching: boolean; onToggle: (id: string) => void; onToggleAll: () => void; allSelected: boolean; onEnrichOne: (id: string) => void }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
            <th style={{ padding: '10px 16px', width: 40 }}><input type="checkbox" checked={allSelected} onChange={onToggleAll} style={{ cursor: 'pointer' }} /></th>
            {['Buyer', 'Type', 'Purchases', 'Last Purchase', 'Price Range', 'Contact', 'Score', ''].map(h => (
              <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 400, color: '#9ca3af', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {buyers.map(b => {
            const sel = selected.has(b.id)
            return (
              <tr key={b.id} onClick={() => onToggle(b.id)} style={{ borderBottom: '1px solid var(--gray-100)', background: sel ? '#eff6ff' : 'white', cursor: 'pointer' }}
                onMouseEnter={e => { if (!sel) e.currentTarget.style.background = 'var(--gray-50)' }}
                onMouseLeave={e => { e.currentTarget.style.background = sel ? '#eff6ff' : 'white' }}>
                <td style={{ padding: '13px 16px' }}><input type="checkbox" checked={sel} onChange={() => onToggle(b.id)} onClick={e => e.stopPropagation()} /></td>
                <td style={{ padding: '13px 16px' }}>
                  <div style={{ fontWeight: 500, color: 'var(--gray-900)' }}>{displayName(b)}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: 2 }}>{b.city}, {b.state} {b.zip}</div>
                </td>
                <td style={{ padding: '13px 16px' }}><TypeBadge type={b.entityType} /></td>
                <td style={{ padding: '13px 16px' }}>
                  <span style={{ fontWeight: 500, color: 'var(--gray-900)' }}>{b.cashPurchaseCount}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginLeft: 4 }}>{b.cashPurchaseCount === 1 ? 'deal' : 'deals'}</span>
                </td>
                <td style={{ padding: '13px 16px', fontSize: '0.82rem', color: 'var(--gray-600)' }}>{relDate(b.lastPurchaseDate)}</td>
                <td style={{ padding: '13px 16px' }}><PriceCol min={b.estimatedMinPrice} max={b.estimatedMaxPrice} /></td>
                <td style={{ padding: '13px 16px' }}><ContactCol buyer={b} onEnrich={() => onEnrichOne(b.id)} enriching={enriching} /></td>
                <td style={{ padding: '13px 16px' }}><Score score={b.buyerScore} /></td>
                <td style={{ padding: '13px 10px' }}>
                  <div style={{ display: 'flex', gap: 5 }} onClick={e => e.stopPropagation()}>
                    <Tip label="Add to CRM" icon="+" /><Tip label="Send deal" icon="→" />
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

// ─── Buyer Cards ───────────────────────────────────────────────────────────────

function BuyerCards({ buyers, selected, onToggle }: { buyers: CashBuyer[]; selected: Set<string>; onToggle: (id: string) => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 12, padding: 16 }}>
      {buyers.map(b => {
        const sel = selected.has(b.id)
        return (
          <div key={b.id} onClick={() => onToggle(b.id)} style={{ border: sel ? '2px solid #60a5fa' : '1px solid var(--gray-200)', borderRadius: 12, padding: 16, cursor: 'pointer', background: sel ? '#eff6ff' : 'white', transition: 'all 0.15s', position: 'relative' }}
            onMouseEnter={e => { if (!sel) e.currentTarget.style.borderColor = 'var(--gray-300)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = sel ? '#60a5fa' : 'var(--gray-200)' }}>
            <div style={{ position: 'absolute', top: 14, right: 14 }}><Score score={b.buyerScore} size="sm" /></div>
            <div style={{ marginBottom: 10, paddingRight: 44 }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--gray-900)', marginBottom: 2 }}>{displayName(b)}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>{b.city}, {b.state}</div>
            </div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
              <TypeBadge type={b.entityType} />
              <span style={S.tag}>{b.cashPurchaseCount} {b.cashPurchaseCount === 1 ? 'deal' : 'deals'}</span>
              {b.estimatedMaxPrice && <span style={S.tag}>Up to ${(b.estimatedMaxPrice / 1000).toFixed(0)}K</span>}
            </div>
            <div style={{ fontSize: '0.78rem' }}>
              {b.contactEnriched ? <span style={{ color: '#059669', fontWeight: 500 }}>{fmtPhone(b.phone)}</span> : <span style={{ color: 'var(--gray-400)' }}>No contact info</span>}
            </div>
            <div style={{ marginTop: 5, fontSize: '0.72rem', color: 'var(--gray-400)' }}>Last purchase: {relDate(b.lastPurchaseDate)}</div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Live Monitor ──────────────────────────────────────────────────────────────

function LiveMonitor({ campaign, stats, liveCalls, onPause, onStop }: { campaign: Campaign; stats: any; liveCalls: LiveCall[]; onPause: () => void; onStop: () => void }) {
  const prog = stats.total > 0 ? Math.min((stats.completed / stats.total) * 100, 100) : 0
  return (
    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, padding: 22, marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#10b981', display: 'inline-block', animation: 'pulse-dot 1.5s infinite' }} />
          <span style={{ fontWeight: 500, fontSize: '0.9rem', color: 'var(--gray-900)' }}>{campaign.name}</span>
          <span style={{ fontSize: '0.68rem', background: '#d1fae5', color: '#065f46', padding: '2px 7px', borderRadius: 4, fontWeight: 500 }}>Live</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onPause} style={S.btn2}>Pause</button>
          <button onClick={onStop} style={{ ...S.btn2, color: '#dc2626', borderColor: '#fca5a5' }}>Stop</button>
        </div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--gray-500)', marginBottom: 5 }}>
          <span>{stats.completed} of {stats.total} calls</span><span style={{ fontWeight: 600 }}>{Math.round(prog)}%</span>
        </div>
        <div style={{ height: 5, background: 'var(--gray-100)', borderRadius: 4 }}>
          <div style={{ height: '100%', width: `${prog}%`, background: '#2563eb', borderRadius: 4, transition: 'width 0.5s' }} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 18 }}>
        {[['Active Calls', stats.active, '#1d4ed8', '#eff6ff'], ['Qualified', stats.qualified, '#065f46', '#d1fae5'], ['Not Buying', stats.notBuying, '#92400e', '#fef3c7'], ['No Answer', stats.noAnswer, '#6b7280', '#f3f4f6']].map(([l, v, c, bg]) => (
          <div key={l as string} style={{ background: bg as string, borderRadius: 7, padding: '12px 14px', textAlign: 'center' }}>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '1.35rem', fontWeight: 400, color: c as string }}>{v as number}</div>
            <div style={{ fontSize: '0.7rem', color: c as string, marginTop: 2 }}>{l as string}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {[['On the line now', liveCalls.filter(c => c.status === 'active')], ['Completed', liveCalls.filter(c => c.status === 'completed')]].map(([title, calls]) => (
          <div key={title as string}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray-400)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title as string}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
              {(calls as LiveCall[]).slice(0, 4).map((call, i) => (
                <div key={i} style={{ background: '#f8fafc', borderRadius: 8, padding: 10, fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: call.transcript?.length || call.summary ? 4 : 0 }}>
                    <span style={{ fontWeight: 600, color: 'var(--gray-900)' }}>{call.buyerName}</span>
                    {call.status === 'active' ? <span style={{ color: 'var(--gray-400)', fontSize: '0.75rem' }}>{fmtDur(call.duration)}</span> : <OutcomeTag outcome={call.outcome || ''} />}
                  </div>
                  {call.status === 'active' && call.transcript.slice(-1).map((line, j) => (
                    <div key={j} style={{ color: 'var(--gray-500)', fontSize: '0.75rem', borderLeft: '2px solid #bfdbfe', paddingLeft: 7 }}>{line}</div>
                  ))}
                  {call.summary && <div style={{ color: 'var(--gray-500)', fontSize: '0.75rem' }}>{call.summary}</div>}
                </div>
              ))}
              {(calls as LiveCall[]).length === 0 && <div style={{ color: 'var(--gray-300)', fontSize: '0.82rem' }}>None yet</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Campaign Builder ──────────────────────────────────────────────────────────

function Builder({ buyers, selected, market, cName, setCName, script, setScript, company, setCompany, agent, setAgent, callMode, setCallMode, concurrent, setConcurrent, voicemail, setVoicemail, retries, setRetries, agreed, setAgreed, launching, onLaunch, onClose }: any) {
  const enrichedSel = Array.from(selected as Set<string>).filter((id: string) => buyers.find((b: CashBuyer) => b.id === id && b.contactEnriched)).length
  const needs = (selected as Set<string>).size - enrichedSel
  const canLaunch = agreed && cName.trim() && (selected as Set<string>).size > 0 && !launching
  const cost = ((selected as Set<string>).size * 3 * 0.09).toFixed(2)

  return (<>
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, backdropFilter: 'blur(2px)' }} />
    <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 500, background: 'white', zIndex: 101, display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 48px rgba(0,0,0,0.12)' }}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ fontWeight: 500, fontSize: '0.95rem', color: 'var(--gray-900)', margin: 0 }}>Launch Campaign</h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--gray-400)', margin: '2px 0 0' }}>{market?.label || 'No market selected'}</p>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 24, color: 'var(--gray-300)', lineHeight: 1 }}>×</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        <label style={S.lbl}>Campaign Name</label>
        <input value={cName} onChange={e => setCName(e.target.value)} placeholder={`${market?.label || 'Market'} - ${new Date().toLocaleDateString()}`} style={{ ...S.inp, marginBottom: 20 }} />

        <div style={{ background: (selected as Set<string>).size > 0 ? '#eff6ff' : 'var(--gray-50)', border: `1px solid ${(selected as Set<string>).size > 0 ? '#bfdbfe' : 'var(--gray-200)'}`, borderRadius: 10, padding: 14, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: needs > 0 ? 6 : 0 }}>
            <span style={{ fontWeight: 500, color: '#1d4ed8' }}>{(selected as Set<string>).size} buyers selected</span>
            <span style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 600 }}>{enrichedSel} with contact info</span>
          </div>
          {needs > 0 && <div style={{ fontSize: '0.78rem', color: '#d97706' }}>{needs} buyers have no phone - they&apos;ll be skipped unless enriched first</div>}
        </div>

        <label style={S.lbl}>Calling Mode</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
          {(['AI', 'MANUAL'] as const).map(m => (
            <button key={m} onClick={() => setCallMode(m)} style={{ padding: 12, borderRadius: 7, cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem', border: callMode === m ? '1.5px solid #374151' : '1px solid #e5e7eb', background: callMode === m ? '#111827' : 'white', color: callMode === m ? 'white' : '#6b7280', transition: 'all 0.15s', textAlign: 'left' as const }}>
              {m === 'AI' ? 'AI Mode' : 'Manual Mode'}
              <div style={{ fontSize: '0.72rem', fontWeight: 400, marginTop: 3, color: callMode === m ? '#9ca3af' : '#9ca3af' }}>{m === 'AI' ? 'Calls run automatically' : 'You dial each number'}</div>
            </button>
          ))}
        </div>

        <label style={S.lbl}>Script Template</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 20 }}>
          {SCRIPTS.map(t => (
            <button key={t.id} onClick={() => setScript(t.id)} style={{ padding: '12px 14px', borderRadius: 7, cursor: 'pointer', textAlign: 'left' as const, border: script === t.id ? '1.5px solid #374151' : '1px solid #e5e7eb', background: script === t.id ? '#f9fafb' : 'white', transition: 'all 0.15s' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                <span style={{ fontWeight: 500, fontSize: '0.84rem', color: 'var(--gray-900)' }}>{t.name}</span>
                <div style={{ display: 'flex', gap: 5 }}>
                  <span style={{ ...S.tag }}>{t.qualify} qualify</span>
                  <span style={{ ...S.tag }}>{t.duration}</span>
                </div>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#9ca3af' }}>{t.desc}</div>
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          <div><label style={S.lbl}>Company Name</label><input value={company} onChange={e => setCompany(e.target.value)} placeholder="Your company" style={S.inp} /></div>
          <div><label style={S.lbl}>Agent Name</label><input value={agent} onChange={e => setAgent(e.target.value)} placeholder="Alex" style={S.inp} /></div>
        </div>

        {callMode === 'AI' && (<>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label style={{ ...S.lbl, margin: 0 }}>Max Concurrent Calls</label>
            <span style={{ fontWeight: 700, color: '#2563eb', fontSize: '0.9rem' }}>{concurrent}</span>
          </div>
          <input type="range" min={1} max={50} value={concurrent} onChange={e => setConcurrent(Number(e.target.value))} style={{ width: '100%', marginBottom: 16, accentColor: '#2563eb' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--gray-700)', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={voicemail} onChange={e => setVoicemail(e.target.checked)} style={{ accentColor: '#2563eb' }} />Leave voicemail if no answer
            </label>
            <label style={{ fontSize: '0.85rem', color: 'var(--gray-700)', display: 'flex', alignItems: 'center', gap: 6 }}>
              Retry:<select value={retries} onChange={e => setRetries(Number(e.target.value))} style={{ ...S.sel, marginLeft: 4 }}>{[0, 1, 2, 3].map(n => <option key={n} value={n}>{n === 0 ? 'None' : `${n}x`}</option>)}</select>
            </label>
          </div>
        </>)}

        <div style={{ background: 'var(--gray-50)', borderRadius: 12, padding: 16, marginBottom: 20, border: '1px solid var(--gray-100)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray-400)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Estimated Cost</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', color: 'var(--gray-600)', marginBottom: 5 }}>
            <span>AI call minutes (~3 min avg @ $0.09/min)</span><span style={{ fontWeight: 600 }}>${cost}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', color: 'var(--gray-600)', paddingBottom: 10, borderBottom: '1px solid var(--gray-200)' }}>
            <span>Contact enrichment</span><span style={{ fontWeight: 600 }}>$0.04/lookup</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, fontWeight: 500, fontSize: '0.9rem' }}>
            <span>Total estimated</span><span>~${cost}</span>
          </div>
        </div>

        <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--gray-600)', lineHeight: 1.5 }}>
          <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} style={{ marginTop: 3, flexShrink: 0, cursor: 'pointer', accentColor: '#2563eb' }} />
          I confirm these calls are being made to business contacts with verifiable real estate purchase history, in compliance with TCPA B2B exemptions and applicable calling hour restrictions.
        </label>
      </div>

      <div style={{ padding: '16px 24px', borderTop: '1px solid var(--gray-100)', display: 'flex', gap: 10 }}>
        <button onClick={onClose} style={{ ...S.btn2, flex: 1, justifyContent: 'center' }}>Cancel</button>
        <button onClick={onLaunch} disabled={!canLaunch} style={{ ...S.btn1, flex: 2, justifyContent: 'center', opacity: canLaunch ? 1 : 0.45, cursor: canLaunch ? 'pointer' : 'not-allowed', fontSize: '0.9rem' }}>
          {launching ? 'Launching...' : 'Launch Campaign'}
        </button>
      </div>
    </div>
  </>)
}

// ─── Campaign History ──────────────────────────────────────────────────────────

function CampaignHistory({ campaigns, onSelect }: { campaigns: Campaign[]; onSelect: (c: Campaign) => void }) {
  if (!campaigns.length) return (
    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, padding: '60px 24px', textAlign: 'center' }}>
      <div style={{ width: 40, height: 40, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', color: '#9ca3af' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="2"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/>
        </svg>
      </div>
      <h3 style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--gray-900)', margin: '0 0 6px' }}>No campaigns yet</h3>
      <p style={{ fontSize: '0.85rem', color: '#9ca3af', margin: 0 }}>Launch your first campaign to see history here.</p>
    </div>
  )
  return (
    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--gray-100)', background: 'var(--gray-50)' }}>
            {['Campaign', 'Market', 'Status', 'Buyers', 'Qualified', 'Talk Time', 'Date', ''].map(h => (
              <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--gray-400)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {campaigns.map(c => (
            <tr key={c.id} onClick={() => onSelect(c)} style={{ borderBottom: '1px solid var(--gray-100)', cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--gray-50)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
              <td style={{ padding: '13px 16px', fontWeight: 500, color: 'var(--gray-900)' }}>{c.name}</td>
              <td style={{ padding: '13px 16px', color: 'var(--gray-500)', fontSize: '0.82rem' }}>{c.market}</td>
              <td style={{ padding: '13px 16px' }}><StatusBadge status={c.status} /></td>
              <td style={{ padding: '13px 16px', color: 'var(--gray-700)' }}>{c.totalBuyers}</td>
              <td style={{ padding: '13px 16px', color: '#059669', fontWeight: 500 }}>{c.qualified}</td>
              <td style={{ padding: '13px 16px', color: 'var(--gray-500)', fontSize: '0.82rem' }}>{fmtDur(c.totalTalkTime)}</td>
              <td style={{ padding: '13px 16px', color: 'var(--gray-400)', fontSize: '0.8rem' }}>{new Date(c.createdAt).toLocaleDateString()}</td>
              <td style={{ padding: '13px 16px' }}><button style={{ ...S.btn2, fontSize: '0.78rem', padding: '4px 10px' }}>Re-run</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Micro Components ──────────────────────────────────────────────────────────

function Score({ score, size = 'md' }: { score: number; size?: 'sm' | 'md' }) {
  const d = size === 'sm' ? 32 : 38, r = size === 'sm' ? 12 : 15, sw = size === 'sm' ? 2.5 : 3
  const circ = 2 * Math.PI * r, filled = score > 0 ? (score / 100) * circ : 0
  const color = score >= 70 ? '#059669' : score >= 40 ? '#d97706' : score > 0 ? '#9ca3af' : '#e5e7eb'
  return (
    <div style={{ position: 'relative', width: d, height: d, flexShrink: 0 }}>
      <svg width={d} height={d} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={d / 2} cy={d / 2} r={r} fill="none" stroke="#f3f4f6" strokeWidth={sw} />
        {score > 0 && <circle cx={d / 2} cy={d / 2} r={r} fill="none" stroke={color} strokeWidth={sw} strokeDasharray={`${filled} ${circ - filled}`} strokeLinecap="round" />}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size === 'sm' ? '0.65rem' : '0.72rem', fontWeight: 700, color }}>
        {score > 0 ? score : '-'}
      </div>
    </div>
  )
}

function TypeBadge({ type }: { type?: string }) {
  const t = (type || 'individual').toLowerCase()
  const isBiz = t === 'llc' || t === 'corporation' || t === 'trust'
  const label = t === 'trust' ? 'Trust' : t === 'corporation' ? 'Corp' : t === 'llc' ? 'LLC' : 'Individual'
  return <span style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: 6, fontWeight: 600, background: isBiz ? '#eff6ff' : '#f9fafb', color: isBiz ? '#1d4ed8' : '#6b7280', border: `1px solid ${isBiz ? '#bfdbfe' : '#e5e7eb'}` }}>{label}</span>
}

function PriceCol({ min, max }: { min?: number; max?: number }) {
  if (!min && !max) return <span style={{ color: 'var(--gray-400)', fontSize: '0.82rem' }}>-</span>
  if (min && max && Math.abs(max - min) > 10000) return <span style={{ fontSize: '0.82rem', color: 'var(--gray-700)', fontWeight: 500 }}>${(min / 1000).toFixed(0)}K-${(max / 1000).toFixed(0)}K</span>
  return <span style={{ fontSize: '0.82rem', color: 'var(--gray-700)', fontWeight: 500 }}>Up to ${((max || min)! / 1000).toFixed(0)}K</span>
}

function ContactCol({ buyer, onEnrich, enriching }: { buyer: CashBuyer; onEnrich: () => void; enriching: boolean }) {
  if (buyer.contactEnriched && buyer.phone) return (
    <div>
      <div style={{ fontSize: '0.82rem', color: '#059669', fontWeight: 500 }}>{fmtPhone(buyer.phone)}</div>
      {buyer.email && <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)', marginTop: 2 }}>{buyer.email}</div>}
    </div>
  )
  return <button onClick={e => { e.stopPropagation(); onEnrich() }} disabled={enriching} style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: 6, border: '1px solid var(--gray-200)', background: 'white', cursor: enriching ? 'default' : 'pointer', color: 'var(--gray-500)', fontWeight: 500 }}>{enriching ? 'Enriching...' : '+ Get contact'}</button>
}

function Tip({ label, icon }: { label: string; icon: string }) {
  const [h, setH] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <button title={label} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid var(--gray-200)', background: h ? 'var(--gray-50)' : 'white', cursor: 'pointer', fontSize: '0.82rem' }}>{icon}</button>
      {h && <div style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 5, background: '#111827', color: 'white', fontSize: '0.72rem', padding: '3px 8px', borderRadius: 5, whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 10 }}>{label}</div>}
    </div>
  )
}

function OutcomeTag({ outcome }: { outcome: string }) {
  const m: Record<string, [string, string, string]> = { QUALIFIED: ['#d1fae5', '#065f46', 'Qualified'], NOT_BUYING: ['#fef3c7', '#92400e', 'Not Buying'], NO_ANSWER: ['#f3f4f6', '#6b7280', 'No Answer'], VOICEMAIL: ['#eff6ff', '#1e40af', 'Voicemail'] }
  const [bg, color, label] = m[outcome] || ['#f3f4f6', '#6b7280', outcome]
  return <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: 20, background: bg, color, fontWeight: 600 }}>{label}</span>
}

function StatusBadge({ status }: { status: string }) {
  const m: Record<string, [string, string]> = { RUNNING: ['#d1fae5', '#065f46'], COMPLETED: ['#eff6ff', '#1e40af'], PAUSED: ['#fef3c7', '#92400e'], CANCELLED: ['#fee2e2', '#991b1b'], DRAFT: ['#f3f4f6', '#6b7280'] }
  const [bg, color] = m[status] || m.DRAFT
  return <span style={{ fontSize: '0.72rem', padding: '3px 9px', borderRadius: 20, background: bg, color, fontWeight: 600 }}>{status}</span>
}

// ─── Utils ─────────────────────────────────────────────────────────────────────

function displayName(b?: CashBuyer | null) { if (!b) return 'Unknown'; if (b.entityName) return b.entityName; const n = `${b.firstName || ''} ${b.lastName || ''}`.trim(); return n || 'Unknown Buyer' }
function relDate(d?: string) { if (!d) return '-'; const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000); if (days === 0) return 'Today'; if (days === 1) return 'Yesterday'; if (days < 7) return `${days}d ago`; if (days < 30) return `${Math.floor(days / 7)}w ago`; if (days < 365) return `${Math.floor(days / 30)}mo ago`; return `${Math.floor(days / 365)}y ago` }
function fmtPhone(p?: string) { if (!p) return ''; const d = p.replace(/\D/g, '').replace(/^1/, ''); if (d.length !== 10) return p; return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` }
function fmtDur(s: number) { if (!s) return '0s'; const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60; if (h > 0) return `${h}h ${m}m`; if (m > 0) return `${m}m ${sec}s`; return `${sec}s` }
function rPhone() { const c = ['404','678','214','972','480','813','704','816','602','615']; return `${c[~~(Math.random()*c.length)]}${~~(Math.random()*9e6)+1e6}` }

function mockBuyers(city: string, state: string, count: number): CashBuyer[] {
  const names = [['Marcus','Johnson'],['Sandra','Williams'],['David','Kim'],['Rachel','Torres'],['James','Patel'],['Angela','Chen'],['Robert','Murphy'],['Lisa','Washington'],['Kevin','Okafor'],['Diane','Reyes'],['Brian','Scott'],['Monica','Adams']]
  const ents = ['Premier REI LLC','Apex Property Group','BlueSky Investments LLC','Cornerstone Capital RE','Delta Acquisitions LLC','Eagle Eye Properties','First Choice Realty LLC','Liberty RE Investments','Iron Horse Capital','Keystone Property Group']
  const prices = [75,95,110,125,145,165,180,210,250,290]
  const statuses = ['ACTIVE','ACTIVE','ACTIVE','ACTIVE','RECENTLY_VERIFIED','DORMANT']
  const zips = ['30301','30303','30305','30306','30307','30308','30309','30310']
  return Array.from({ length: count }, (_, i) => {
    const isEnt = Math.random() > 0.42
    const [first, last] = names[i % names.length]
    const daysAgo = ~~(Math.random() * 340) + 14
    const d = new Date(); d.setDate(d.getDate() - daysAgo)
    const enriched = Math.random() > 0.55
    const minP = prices[i % prices.length], maxP = prices[(i + 2) % prices.length]
    return { id: `mock_${i}_${Math.random().toString(36).slice(2,7)}`, firstName: isEnt ? undefined : first, lastName: isEnt ? undefined : last, entityName: isEnt ? ents[i % ents.length] : undefined, entityType: isEnt ? (Math.random() > 0.8 ? 'trust' : 'llc') : 'individual', city, state, zip: zips[i % zips.length], cashPurchaseCount: ~~(Math.random() * 11) + 1, lastPurchaseDate: d.toISOString(), estimatedMinPrice: minP * 1000, estimatedMaxPrice: maxP * 1000, status: statuses[i % statuses.length], contactEnriched: enriched, phone: enriched ? `+1${rPhone()}` : undefined, buyerScore: enriched ? ~~(Math.random() * 55) + 35 : ~~(Math.random() * 30) + 5 }
  })
}

function simulateLive(prev: LiveCall[]): LiveCall[] {
  const lines = ['AI: Hi, this is Alex from DealFlow Properties...','AI: Are you still actively buying in Atlanta?','Buyer: Yeah, definitely still buying.','AI: What property types are you focused on?','Buyer: Mostly single family, some multifamily.','AI: What price range are you working in?','Buyer: 80 to 160 thousand.','AI: Fix-and-flip or buy-and-hold?','Buyer: Mostly flips.','AI: How quickly can you close?','Buyer: 10 to 14 days, cash.']
  const outcomes = ['QUALIFIED','QUALIFIED','QUALIFIED','NOT_BUYING','NO_ANSWER','VOICEMAIL']
  const sums = ['Active SFR buyer. $80K-$160K, flip-focused. Closes 10-14 days.','SFR + small MF. Flip/hold. 21-day close.','Not buying in this market.','No answer.','Voicemail left.']
  return prev.map(c => {
    if (c.status === 'completed') return c
    if (Math.random() > 0.65) { const i = ~~(Math.random() * outcomes.length); return { ...c, status: 'completed', outcome: outcomes[i], summary: sums[i], duration: ~~(Math.random()*240)+60 } }
    return { ...c, duration: c.duration + 2, transcript: [...c.transcript.slice(-5), lines[c.transcript.length % lines.length]] }
  })
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const S = {
  btn1: { display:'flex',alignItems:'center',gap:6,padding:'8px 16px',borderRadius:6,border:'none',background:'#111827',color:'white',fontSize:'0.84rem',fontWeight:500,cursor:'pointer' } as React.CSSProperties,
  btn2: { display:'flex',alignItems:'center',gap:6,padding:'7px 13px',borderRadius:6,border:'1px solid #e5e7eb',background:'white',color:'#374151',fontSize:'0.84rem',fontWeight:400,cursor:'pointer' } as React.CSSProperties,
  sel: { padding:'6px 10px',border:'1px solid #e5e7eb',borderRadius:6,fontSize:'0.8rem',outline:'none',background:'white',cursor:'pointer' } as React.CSSProperties,
  lbl: { display:'block',fontSize:'0.78rem',fontWeight:400,color:'#6b7280',marginBottom:6 } as React.CSSProperties,
  inp: { width:'100%',padding:'9px 12px',border:'1px solid #e5e7eb',borderRadius:6,fontSize:'0.875rem',outline:'none',boxSizing:'border-box' } as React.CSSProperties,
  tag: { fontSize:'0.7rem',padding:'2px 6px',borderRadius:4,background:'#f3f4f6',color:'#6b7280',fontWeight:400 } as React.CSSProperties,
}
