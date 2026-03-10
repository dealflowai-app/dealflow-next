'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, X, RefreshCw, ChevronDown, MapPin, Building2, Hash, Clock } from 'lucide-react'
import type { Market, MarketSuggestion } from './types'
import { MARKET_SUGGESTIONS, PREVIOUS_MARKETS } from './mockData'

interface MarketSelectorProps {
  selectedMarkets: Market[]
  onSelect: (market: Market) => void
  onRemove: (marketId: string) => void
  onRefresh: (marketId: string) => void
  isRefreshing: Set<string>
}

function formatLastSynced(iso: string | null): string {
  if (!iso) return 'Never synced'
  const diff = Date.now() - new Date(iso).getTime()
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(hours / 24)
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  return 'Just now'
}

function typeIcon(type: MarketSuggestion['type']) {
  if (type === 'city') return <MapPin className="w-3.5 h-3.5" />
  if (type === 'county') return <Building2 className="w-3.5 h-3.5" />
  return <Hash className="w-3.5 h-3.5" />
}

function typeLabel(type: MarketSuggestion['type']) {
  if (type === 'city') return 'City'
  if (type === 'county') return 'County'
  return 'ZIP'
}

function densityColor(count: number) {
  if (count >= 800) return { bg: '#dcfce7', text: '#15803d' }
  if (count >= 400) return { bg: '#fef9c3', text: '#a16207' }
  return { bg: '#f3f4f6', text: '#6b7280' }
}

export default function MarketSelector({
  selectedMarkets,
  onSelect,
  onRemove,
  onRefresh,
  isRefreshing,
}: MarketSelectorProps) {
  const [query, setQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [showPrevious, setShowPrevious] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const previousRef = useRef<HTMLDivElement>(null)

  const filteredSuggestions = query.length >= 1
    ? MARKET_SUGGESTIONS.filter(m =>
        m.name.toLowerCase().includes(query.toLowerCase()) ||
        m.state.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8)
    : MARKET_SUGGESTIONS.slice(0, 6)

  const selectedIds = new Set(selectedMarkets.map(m => `${m.name}-${m.state}`))

  function handleSelect(suggestion: MarketSuggestion) {
    const already = selectedMarkets.find(
      m => m.name === suggestion.name && m.state === suggestion.state
    )
    if (already) return
    const market: Market = {
      id: `${suggestion.name}-${suggestion.state}-${Date.now()}`,
      name: suggestion.name,
      type: suggestion.type,
      state: suggestion.state,
      buyerCount: suggestion.estimatedBuyers,
      lastSynced: null,
    }
    onSelect(market)
    setQuery('')
    setShowDropdown(false)
  }

  function handlePreviousSelect(market: Market) {
    const already = selectedMarkets.find(m => m.id === market.id || (m.name === market.name && m.state === market.state))
    if (already) return
    onSelect(market)
    setShowPrevious(false)
  }

  // Close dropdowns on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
      if (previousRef.current && !previousRef.current.contains(e.target as Node)) {
        setShowPrevious(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  return (
    <div style={{
      background: 'var(--white)',
      borderBottom: '1px solid var(--gray-100)',
      padding: '20px 32px',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>

        {/* Search input + dropdown */}
        <div style={{ position: 'relative', flexShrink: 0 }} ref={dropdownRef}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            border: showDropdown ? '1.5px solid var(--blue-500)' : '1.5px solid var(--gray-200)',
            borderRadius: 10,
            padding: '9px 14px',
            background: 'var(--white)',
            width: 280,
            boxShadow: showDropdown ? '0 0 0 3px rgba(59,130,246,0.1)' : 'none',
            transition: 'border-color 0.15s, box-shadow 0.15s',
          }}>
            <Search style={{ width: 15, height: 15, color: 'var(--gray-400)', flexShrink: 0 }} />
            <input
              ref={inputRef}
              type="text"
              placeholder="City, county, or ZIP code..."
              value={query}
              onChange={e => { setQuery(e.target.value); setShowDropdown(true) }}
              onFocus={() => setShowDropdown(true)}
              style={{
                border: 'none',
                outline: 'none',
                fontSize: '0.84rem',
                color: 'var(--gray-900)',
                background: 'transparent',
                width: '100%',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Autocomplete dropdown */}
          {showDropdown && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              width: 320,
              background: 'var(--white)',
              border: '1px solid var(--gray-200)',
              borderRadius: 12,
              boxShadow: 'var(--shadow)',
              zIndex: 100,
              marginTop: 6,
              overflow: 'hidden',
            }}>
              {query.length === 0 && (
                <div style={{ padding: '8px 12px 4px', fontSize: '0.7rem', fontWeight: 600, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Popular Markets
                </div>
              )}
              {filteredSuggestions.length === 0 ? (
                <div style={{ padding: '16px 14px', fontSize: '0.84rem', color: 'var(--gray-400)', textAlign: 'center' }}>
                  No markets found
                </div>
              ) : (
                filteredSuggestions.map(s => {
                  const isSelected = selectedIds.has(`${s.name}-${s.state}`)
                  const density = densityColor(s.estimatedBuyers)
                  return (
                    <button
                      key={`${s.name}-${s.state}`}
                      onClick={() => handleSelect(s)}
                      disabled={isSelected}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        background: isSelected ? 'var(--gray-50)' : 'transparent',
                        border: 'none',
                        cursor: isSelected ? 'default' : 'pointer',
                        textAlign: 'left',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'var(--gray-50)' }}
                      onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ color: 'var(--gray-400)' }}>{typeIcon(s.type)}</div>
                        <div>
                          <div style={{ fontSize: '0.84rem', fontWeight: 600, color: isSelected ? 'var(--gray-400)' : 'var(--gray-900)' }}>
                            {s.name}, {s.state}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)' }}>{typeLabel(s.type)}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '2px 7px',
                          borderRadius: 20,
                          background: density.bg,
                          color: density.text,
                        }}>
                          ~{s.estimatedBuyers.toLocaleString()} buyers
                        </span>
                        {isSelected && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--gray-400)' }}>Added</span>
                        )}
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          )}
        </div>

        {/* Previous markets dropdown */}
        <div style={{ position: 'relative', flexShrink: 0 }} ref={previousRef}>
          <button
            onClick={() => setShowPrevious(!showPrevious)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 14px',
              border: '1.5px solid var(--gray-200)',
              borderRadius: 10,
              background: 'var(--white)',
              cursor: 'pointer',
              fontSize: '0.84rem',
              color: 'var(--gray-600)',
              fontFamily: 'inherit',
              fontWeight: 500,
              transition: 'border-color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--gray-300)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--gray-200)')}
          >
            <Clock style={{ width: 14, height: 14 }} />
            Markets I've worked
            <ChevronDown style={{ width: 13, height: 13, color: 'var(--gray-400)' }} />
          </button>

          {showPrevious && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              width: 280,
              background: 'var(--white)',
              border: '1px solid var(--gray-200)',
              borderRadius: 12,
              boxShadow: 'var(--shadow)',
              zIndex: 100,
              marginTop: 6,
              overflow: 'hidden',
            }}>
              <div style={{ padding: '8px 12px 4px', fontSize: '0.7rem', fontWeight: 600, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Recent Markets
              </div>
              {PREVIOUS_MARKETS.map(m => {
                const isSelected = selectedMarkets.find(sm => sm.name === m.name && sm.state === m.state)
                return (
                  <button
                    key={m.id}
                    onClick={() => handlePreviousSelect(m)}
                    disabled={!!isSelected}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: 'transparent',
                      border: 'none',
                      cursor: isSelected ? 'default' : 'pointer',
                      textAlign: 'left',
                    }}
                    onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'var(--gray-50)' }}
                    onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    <div>
                      <div style={{ fontSize: '0.84rem', fontWeight: 600, color: isSelected ? 'var(--gray-400)' : 'var(--gray-900)' }}>
                        {m.name}, {m.state}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)' }}>
                        {m.buyerCount.toLocaleString()} buyers · synced {formatLastSynced(m.lastSynced)}
                      </div>
                    </div>
                    {isSelected && <span style={{ fontSize: '0.7rem', color: 'var(--gray-400)' }}>Active</span>}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Selected market chips */}
        {selectedMarkets.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', flex: 1 }}>
            {selectedMarkets.map(m => (
              <MarketChip
                key={m.id}
                market={m}
                onRemove={() => onRemove(m.id)}
                onRefresh={() => onRefresh(m.id)}
                isRefreshing={isRefreshing.has(m.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function MarketChip({ market, onRemove, onRefresh, isRefreshing }: {
  market: Market
  onRemove: () => void
  onRefresh: () => void
  isRefreshing: boolean
}) {
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      padding: '7px 10px 7px 12px',
      background: 'var(--blue-50)',
      border: '1.5px solid var(--blue-200)',
      borderRadius: 10,
      fontSize: '0.82rem',
    }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--blue-500)', flexShrink: 0 }} />
      <div>
        <span style={{ fontWeight: 700, color: 'var(--blue-700)' }}>{market.name}, {market.state}</span>
        <span style={{ color: 'var(--blue-500)', marginLeft: 5 }}>·</span>
        <span style={{ color: 'var(--blue-600)', marginLeft: 5, fontWeight: 600 }}>
          {market.buyerCount.toLocaleString()} buyers
        </span>
        {market.lastSynced && (
          <span style={{ color: 'var(--blue-400)', marginLeft: 5, fontSize: '0.75rem' }}>
            · {formatLastSynced(market.lastSynced)}
          </span>
        )}
      </div>
      <button
        onClick={onRefresh}
        disabled={isRefreshing}
        title="Refresh buyers from ATTOM"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 22, height: 22, borderRadius: 6,
          border: 'none', background: 'transparent',
          cursor: isRefreshing ? 'not-allowed' : 'pointer',
          color: 'var(--blue-400)',
          transition: 'background 0.1s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--blue-100)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        <RefreshCw style={{
          width: 12, height: 12,
          animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
        }} />
      </button>
      <button
        onClick={onRemove}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 22, height: 22, borderRadius: 6,
          border: 'none', background: 'transparent',
          cursor: 'pointer',
          color: 'var(--blue-400)',
          transition: 'background 0.1s, color 0.1s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--blue-100)'; e.currentTarget.style.color = 'var(--blue-700)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--blue-400)' }}
      >
        <X style={{ width: 12, height: 12 }} />
      </button>
    </div>
  )
}
