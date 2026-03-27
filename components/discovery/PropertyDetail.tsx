'use client'

import { useState } from 'react'
import Map, { Marker } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'
import {
  X,
  MapPin,
  Home,
  Building2,
  BedDouble,
  Bath,
  Ruler,
  UserCircle,
  BarChart3,
  Map as MapIcon,
  Loader2,
  Info,
  Check,
  Gavel,
  FileWarning,
  ShieldAlert,
  UserPlus,
} from 'lucide-react'
import type { DiscoveryProperty } from '@/lib/types/discovery'
import ContactReveal from '@/components/discovery/ContactReveal'
import { estimateEquity } from '@/lib/discovery/owner-intelligence'
import { displayType, formatCurrency, formatDate, detectOwnerType } from '@/lib/discovery/helpers'
import type { EquityData, DistressSignals, UnifiedPropertyDetail } from '@/lib/discovery/unified-types'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''

type DetailTab = 'property' | 'owner' | 'history'

export default function PropertyDetail({
  property,
  onClose,
  onViewOnMap,
  onAddToCRM,
  onAddAsSeller,
  isInCRM,
  addingToCRM,
  addingAsSeller,
  features,
  featuresLoading,
  onSelectProperty,
}: {
  property: DiscoveryProperty
  onClose: () => void
  onViewOnMap?: () => void
  onAddToCRM?: () => void
  onAddAsSeller?: () => void
  isInCRM?: boolean
  addingToCRM?: boolean
  addingAsSeller?: boolean
  features?: {
    equityData: EquityData | null
    distressSignals: DistressSignals | null
    mortgage: UnifiedPropertyDetail['mortgage'] | null
    portfolio: { properties: DiscoveryProperty[]; propertyCount: number; totalValue: number } | null
    ownerProfile: { ownerName: string; corporateIndicator: boolean; absenteeOwner: boolean; mailingAddress: string | null; investorScore: number; likelyCashBuyer: boolean } | null
  } | null
  featuresLoading?: boolean
  onSelectProperty?: (p: DiscoveryProperty) => void
}) {
  const [tab, setTab] = useState<DetailTab>('property')
  const [comps, setComps] = useState<{ value: number | null; valueRangeLow: number | null; valueRangeHigh: number | null; comparables: Array<{ address: string; city: string; state: string; price: number | null; sqft: number | null; bedrooms: number | null; bathrooms: number | null; distance: number | null; correlation: number | null }> } | null>(null)
  const [compsLoading, setCompsLoading] = useState(false)
  const pType = displayType(property.propertyType)
  const ownerType = detectOwnerType(property.ownerName)
  const eq = estimateEquity(property)
  const eqData = features?.equityData

  const estValue = eqData?.estimatedValue ?? property.assessedValue
  const mortBal = eqData?.mortgageBalance ?? null
  const equityAmt = eqData?.equity ?? (estValue != null && property.lastSalePrice != null ? estValue - property.lastSalePrice : null)
  const equityPct = eqData?.equityPercent ?? (estValue != null && estValue > 0 && equityAmt != null ? Math.round((equityAmt / estValue) * 100) : null)

  const loadComps = async () => {
    if (comps || compsLoading) return
    setCompsLoading(true)
    try {
      const res = await fetch(`/api/discovery/property/${property.id}/comps`)
      if (res.ok) setComps(await res.json())
    } catch { /* ignore */ } finally { setCompsLoading(false) }
  }

  /* helper: grid row */
  function InfoRow({ label, value }: { label: string; value: string | number | null | undefined }) {
    return (
      <div>
        <div className="text-[11px] font-[600] uppercase text-[rgba(5,14,36,0.4)]" style={{ letterSpacing: '0.05em' }}>{label}</div>
        <div className="text-[14px] font-[400] text-[rgba(5,14,36,0.65)] mt-0.5">{value ?? '—'}</div>
      </div>
    )
  }

  const TABS: { key: DetailTab; label: string }[] = [
    { key: 'property', label: 'Property' },
    { key: 'owner', label: 'Owner' },
    { key: 'history', label: 'History' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full sm:w-[560px] h-full bg-white border-l border-[rgba(5,14,36,0.06)] animate-slideInRight flex flex-col" style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}>
        {/* ── Header ── */}
        <div className="flex-shrink-0 px-5 pt-4 pb-0 border-b border-[rgba(5,14,36,0.06)] bg-white">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-[24px] font-[700] text-[#0B1224] leading-tight truncate" style={{ letterSpacing: '-0.02em' }}>
                {property.addressLine1}
              </h2>
              <p className="text-[14px] font-[400] text-[rgba(5,14,36,0.5)] mt-0.5">
                {property.city}, {property.state} {property.zipCode}
              </p>
            </div>
            <div className="flex items-center gap-2 ml-3 flex-shrink-0">
              <button
                onClick={onAddToCRM}
                disabled={isInCRM || addingToCRM}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[0.78rem] font-semibold border-0 cursor-pointer transition-colors ${
                  isInCRM
                    ? 'bg-[#2563EB] text-white'
                    : 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white'
                }`}
                title="Add as buyer"
              >
                {addingToCRM ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isInCRM ? <Check className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                {addingToCRM ? '...' : isInCRM ? 'In CRM' : 'Buyer'}
              </button>
              <button
                onClick={onAddAsSeller}
                disabled={addingAsSeller}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[0.78rem] font-semibold border-0 cursor-pointer transition-colors bg-[#F97316] hover:bg-[#EA580C] text-white"
                title="Add as seller"
              >
                {addingAsSeller ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Home className="w-3.5 h-3.5" />}
                {addingAsSeller ? '...' : 'Seller'}
              </button>
              <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center cursor-pointer border-0 transition-colors">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-0">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2 text-[14px] border-0 bg-transparent cursor-pointer transition-colors relative ${
                  tab === t.key
                    ? 'text-[#2563EB] font-[600]'
                    : 'text-[rgba(5,14,36,0.45)] font-[400] hover:text-[rgba(5,14,36,0.65)]'
                }`}
              >
                {t.label}
                {tab === t.key && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#2563EB] rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Scrollable content ── */}
        <div className="flex-1 overflow-y-auto">

          {/* ════════ PROPERTY TAB ════════ */}
          {tab === 'property' && (
            <div>
              {/* Enrichment loading indicator */}
              {featuresLoading && (
                <div className="flex items-center gap-2 px-5 py-2 bg-blue-50 border-b border-blue-100 text-[0.76rem] text-blue-600">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Enriching property data...
                </div>
              )}
              {/* Mini map */}
              <div className="h-[160px] relative overflow-hidden bg-gray-100">
                {property.latitude != null && property.longitude != null ? (
                  <Map
                    mapboxAccessToken={MAPBOX_TOKEN}
                    initialViewState={{ longitude: property.longitude, latitude: property.latitude, zoom: 15 }}
                    style={{ width: '100%', height: '100%' }}
                    mapStyle="mapbox://styles/mapbox/streets-v12"
                    interactive={false}
                    attributionControl={false}
                  >
                    <Marker longitude={property.longitude} latitude={property.latitude} anchor="bottom">
                      <svg width="28" height="36" viewBox="0 0 24 32">
                        <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20C24 5.4 18.6 0 12 0z" fill="#14B8A6" />
                        <circle cx="12" cy="11" r="5" fill="#fff" opacity="0.9" />
                      </svg>
                    </Marker>
                  </Map>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">No Image Available</div>
                )}
              </div>

              {/* Hero: status + value + beds/baths/sqft */}
              <div className="px-5 py-4 border-b border-[rgba(5,14,36,0.06)]">
                <div className="flex items-baseline gap-4 mb-3">
                  <span className="text-[12px] font-[400] text-[rgba(5,14,36,0.4)]">Off-Market</span>
                  <span className="text-[24px] font-[700] text-[#0B1224]" style={{ letterSpacing: '-0.02em' }}>{formatCurrency(estValue)}</span>
                  <span className="text-[12px] font-[400] text-[rgba(5,14,36,0.4)]">Estimated Property Value</span>
                </div>
                <div className="flex items-center gap-6 text-[14px] text-[rgba(5,14,36,0.65)] font-[600]">
                  <span className="flex items-center gap-1"><BedDouble className="w-4 h-4 text-[rgba(5,14,36,0.4)]" /> {property.bedrooms ?? '—'} <span className="text-[12px] text-[rgba(5,14,36,0.4)] font-[400]">Beds</span></span>
                  <span className="flex items-center gap-1"><Bath className="w-4 h-4 text-[rgba(5,14,36,0.4)]" /> {property.bathrooms ?? '—'} <span className="text-[12px] text-[rgba(5,14,36,0.4)] font-[400]">Baths</span></span>
                  <span className="flex items-center gap-1"><Ruler className="w-4 h-4 text-[rgba(5,14,36,0.4)]" /> {property.sqft?.toLocaleString() ?? '—'} <span className="text-[12px] text-[rgba(5,14,36,0.4)] font-[400]">SqFt</span></span>
                </div>
                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  <span className="text-[12px] font-[400] px-2.5 py-1 rounded-full border border-[rgba(5,14,36,0.06)] bg-gray-50 text-[rgba(5,14,36,0.65)]">{pType}</span>
                  {property.yearBuilt && <span className="text-[12px] font-[400] px-2.5 py-1 rounded-full border border-[rgba(5,14,36,0.06)] bg-gray-50 text-[rgba(5,14,36,0.65)]">Built in {property.yearBuilt}</span>}
                  {property.ownerOccupied === false && <span className="text-[12px] font-[400] px-2.5 py-1 rounded-full border border-amber-200 bg-amber-50 text-amber-700">Absentee Owner</span>}
                  {eq.equityCategory === 'high' && <span className="text-[12px] font-[400] px-2.5 py-1 rounded-full border border-[#BFDBFE] bg-[rgba(37,99,235,0.08)] text-[#2563EB]">High Equity</span>}
                  {features?.distressSignals?.foreclosure?.active && <span className="text-[12px] font-[400] px-2.5 py-1 rounded-full border border-red-200 bg-red-50 text-red-700">Pre-Foreclosure</span>}
                  {features?.distressSignals?.taxDelinquent?.isDelinquent && <span className="text-[12px] font-[400] px-2.5 py-1 rounded-full border border-orange-200 bg-orange-50 text-orange-700">Tax Delinquent</span>}
                  {property.listingStatus === 'Active' && property.daysOnMarket != null && <span className="text-[12px] font-[400] px-2.5 py-1 rounded-full border border-purple-200 bg-purple-50 text-purple-700">On Market {property.daysOnMarket}d</span>}
                  {property.priceReduced && <span className="text-[12px] font-[400] px-2.5 py-1 rounded-full border border-orange-200 bg-orange-50 text-orange-700">Price Reduced</span>}
                </div>
              </div>

              {/* Equity visualization */}
              <div className="px-5 py-4 border-b border-[rgba(5,14,36,0.06)]">
                <div className="flex items-start gap-6">
                  <div>
                    <div className="text-[15px] font-[600] text-[#0B1224]">{formatCurrency(estValue)}</div>
                    <div className="text-[12px] font-[400] text-[rgba(5,14,36,0.4)]">Estimated Property Value</div>
                  </div>
                  {mortBal != null && (
                    <div>
                      <div className="text-[15px] font-[600] text-[#0B1224]">{formatCurrency(mortBal)}</div>
                      <div className="text-[12px] font-[400] text-[rgba(5,14,36,0.4)]">Est. Mortgage Balance</div>
                    </div>
                  )}
                  {equityAmt != null && (
                    <div>
                      <div className="text-[15px] font-[600] text-[#2563EB]">{formatCurrency(equityAmt)}</div>
                      <div className="text-[12px] font-[400] text-[rgba(5,14,36,0.4)]">Est. Equity</div>
                    </div>
                  )}
                </div>
                {/* Equity bar */}
                {equityPct != null && estValue != null && estValue > 0 && (
                  <div className="mt-3">
                    <div className="h-4 rounded-full overflow-hidden flex bg-gray-200">
                      {mortBal != null && mortBal > 0 && (
                        <div className="h-full bg-gray-400" style={{ width: `${Math.max(0, 100 - equityPct)}%` }} />
                      )}
                      <div className="h-full bg-[#2563EB]" style={{ width: `${Math.min(100, Math.max(0, equityPct))}%` }} />
                    </div>
                    <div className="flex justify-end mt-1">
                      <span className="text-[0.72rem] font-bold text-[#2563EB] bg-[rgba(37,99,235,0.08)] px-2 py-0.5 rounded">{equityPct}%</span>
                    </div>
                  </div>
                )}
                {/* AVM Range */}
                {eqData?.avm && eqData.avm.mid != null && (
                  <div className="mt-3 rounded-[8px] bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 p-3">
                    <div className="text-[11px] font-[600] uppercase text-blue-500 mb-2" style={{ letterSpacing: '0.05em' }}>Automated Valuation (AVM)</div>
                    <div className="flex items-center justify-between text-[0.78rem]">
                      <span className="text-gray-500">{formatCurrency(eqData.avm.low)}</span>
                      <span className="text-[15px] font-[700] text-[#2563EB]">{formatCurrency(eqData.avm.mid)}</span>
                      <span className="text-gray-500">{formatCurrency(eqData.avm.high)}</span>
                    </div>
                    <div className="flex items-center mt-1.5">
                      <div className="flex-1 h-1.5 rounded-full bg-gray-200 relative">
                        {eqData.avm.low != null && eqData.avm.high != null && eqData.avm.high > eqData.avm.low && (
                          <div
                            className="absolute h-full rounded-full bg-gradient-to-r from-blue-400 to-indigo-500"
                            style={{
                              left: '0%',
                              width: `${Math.min(100, ((eqData.avm.mid! - eqData.avm.low) / (eqData.avm.high - eqData.avm.low)) * 100)}%`,
                            }}
                          />
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between text-[0.66rem] text-gray-400 mt-0.5">
                      <span>Low</span>
                      <span>Estimate</span>
                      <span>High</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Public Facts & Zoning */}
              <div className="px-5 py-4 border-b border-[rgba(5,14,36,0.06)]">
                <h3 className="text-[15px] font-[600] text-[#0B1224] mb-3">Public Facts &amp; Zoning</h3>
                <h4 className="text-[0.76rem] font-semibold text-gray-500 mb-2">Property Characteristics</h4>
                <div className="grid grid-cols-4 gap-y-3 gap-x-4 mb-4">
                  <InfoRow label="Living Area" value={property.sqft?.toLocaleString() ?? '—'} />
                  <InfoRow label="Year Built" value={property.yearBuilt} />
                  <InfoRow label="Bedrooms" value={property.bedrooms} />
                  <InfoRow label="Bathrooms" value={property.bathrooms} />
                  <InfoRow label="Lot Size" value={property.lotSize ? property.lotSize.toLocaleString() + ' sqft' : '—'} />
                  <InfoRow label="Property Type" value={pType} />
                  <InfoRow label="County" value={property.county} />
                  <InfoRow label="Zip Code" value={property.zipCode} />
                </div>
              </div>

              {/* Tax Information */}
              <div className="px-5 py-4 border-b border-[rgba(5,14,36,0.06)]">
                <h3 className="text-[15px] font-[600] text-[#0B1224] mb-3">Tax Information</h3>
                <div className="grid grid-cols-3 gap-y-3 gap-x-4">
                  <InfoRow label="Tax Amount" value={property.taxAmount != null ? formatCurrency(property.taxAmount) : '—'} />
                  <InfoRow label="Assessed Value" value={formatCurrency(property.assessedValue)} />
                  <InfoRow label="Last Sale Price" value={formatCurrency(property.lastSalePrice)} />
                  <InfoRow label="Last Sale Date" value={property.lastSaleDate ? formatDate(property.lastSaleDate) : '—'} />
                  {eqData?.ltv != null && <InfoRow label="LTV" value={`${eqData.ltv}%`} />}
                </div>
              </div>

              {/* Listing Data */}
              {property.listingStatus && (
                <div className="px-5 py-4 border-b border-[rgba(5,14,36,0.06)]">
                  <h3 className="text-[15px] font-[600] text-[#0B1224] mb-3">Listing Data</h3>
                  <div className="grid grid-cols-3 gap-y-3 gap-x-4">
                    <InfoRow label="Status" value={property.listingStatus} />
                    <InfoRow label="List Price" value={formatCurrency(property.listPrice ?? null)} />
                    {property.daysOnMarket != null && <InfoRow label="Days on Market" value={String(property.daysOnMarket)} />}
                    {property.priceReduced && property.priceReductionPercent != null && (
                      <InfoRow label="Price Reduced" value={`${property.priceReductionPercent}% off`} />
                    )}
                  </div>
                  {property.listPrice != null && property.assessedValue != null && property.assessedValue > 0 && (
                    <div className={`mt-3 rounded-[8px] p-2.5 text-[0.78rem] font-medium ${
                      property.listPrice < property.assessedValue * 0.9
                        ? 'bg-green-50 border border-green-200 text-green-700'
                        : property.listPrice > property.assessedValue * 1.1
                        ? 'bg-amber-50 border border-amber-200 text-amber-700'
                        : 'bg-blue-50 border border-blue-200 text-blue-600'
                    }`}>
                      List price is {Math.abs(Math.round(((property.listPrice - property.assessedValue) / property.assessedValue) * 100))}%
                      {property.listPrice < property.assessedValue ? ' below' : property.listPrice > property.assessedValue ? ' above' : ' equal to'} assessed value
                      ({formatCurrency(property.assessedValue)})
                    </div>
                  )}
                </div>
              )}

              {/* Mortgage Details */}
              <div className="px-5 py-4 border-b border-[rgba(5,14,36,0.06)]">
                <h3 className="text-[15px] font-[600] text-[#0B1224] mb-3">Mortgage Details</h3>
                {features?.mortgage && features.mortgage.liens.length > 0 ? (
                  <div className="border border-[rgba(5,14,36,0.06)] rounded-[10px] overflow-hidden">
                    <table className="w-full text-[0.76rem]">
                      <thead>
                        <tr className="bg-gray-50 text-left">
                          <th className="px-3 py-2 text-[11px] font-[600] uppercase text-[rgba(5,14,36,0.4)]" style={{ letterSpacing: '0.05em' }}>Position</th>
                          <th className="px-3 py-2 text-[11px] font-[600] uppercase text-[rgba(5,14,36,0.4)]" style={{ letterSpacing: '0.05em' }}>Lender</th>
                          <th className="px-3 py-2 text-[11px] font-[600] uppercase text-[rgba(5,14,36,0.4)]" style={{ letterSpacing: '0.05em' }}>Amount</th>
                          <th className="px-3 py-2 text-[11px] font-[600] uppercase text-[rgba(5,14,36,0.4)]" style={{ letterSpacing: '0.05em' }}>Rate</th>
                          <th className="px-3 py-2 text-[11px] font-[600] uppercase text-[rgba(5,14,36,0.4)]" style={{ letterSpacing: '0.05em' }}>Due Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {features.mortgage.liens.map((lien, i) => (
                          <tr key={i} className="border-t border-gray-100">
                            <td className="px-3 py-2 text-[rgba(5,14,36,0.65)] font-medium">{lien.position === 1 ? '1st' : lien.position === 2 ? '2nd' : `${lien.position}th`}</td>
                            <td className="px-3 py-2 text-[rgba(5,14,36,0.65)]">{lien.lenderName ?? '—'}</td>
                            <td className="px-3 py-2 text-[rgba(5,14,36,0.65)] font-medium">{formatCurrency(lien.amount)}</td>
                            <td className="px-3 py-2 text-[rgba(5,14,36,0.65)]">{lien.interestRate != null ? `${lien.interestRate}%` : '—'}</td>
                            <td className="px-3 py-2 text-[rgba(5,14,36,0.65)]">{lien.dueDate ? formatDate(lien.dueDate) : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-[0.78rem] text-gray-400">No mortgage data available</p>
                )}
              </div>

              {/* Distress Signals */}
              <div className="px-5 py-4">
                <h3 className="text-[15px] font-[600] text-[#0B1224] mb-3">Distress Signals</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-[0.78rem] text-gray-600 flex items-center gap-1.5"><Gavel className="w-3.5 h-3.5 text-gray-400" /> Foreclosure</span>
                    {features?.distressSignals?.foreclosure?.active ? (
                      <span className="text-[0.72rem] font-medium px-2 py-0.5 rounded bg-red-50 text-red-600 border border-red-200">{features.distressSignals.foreclosure.status ?? 'Active'}</span>
                    ) : (
                      <span className="text-[0.72rem] text-gray-400">None</span>
                    )}
                  </div>
                  {features?.distressSignals?.foreclosure?.active && (
                    <div className="ml-6 text-[0.7rem] text-gray-500 space-y-0.5">
                      {features.distressSignals.foreclosure.filingDate && <div>Filed: {formatDate(features.distressSignals.foreclosure.filingDate)}</div>}
                      {features.distressSignals.foreclosure.defaultAmount != null && <div>Default: {formatCurrency(features.distressSignals.foreclosure.defaultAmount)}</div>}
                      {features.distressSignals.foreclosure.auctionDate && <div className="text-red-600 font-medium">Auction: {formatDate(features.distressSignals.foreclosure.auctionDate)}</div>}
                    </div>
                  )}
                  <div className="flex items-center justify-between py-1.5 border-t border-gray-100">
                    <span className="text-[0.78rem] text-gray-600 flex items-center gap-1.5"><FileWarning className="w-3.5 h-3.5 text-gray-400" /> Tax Delinquent</span>
                    {features?.distressSignals?.taxDelinquent?.isDelinquent ? (
                      <span className="text-[0.72rem] font-medium px-2 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-200">{formatCurrency(features.distressSignals.taxDelinquent.delinquentAmount)} owed</span>
                    ) : (
                      <span className="text-[0.72rem] text-gray-400">Current</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-t border-gray-100">
                    <span className="text-[0.78rem] text-gray-600 flex items-center gap-1.5"><ShieldAlert className="w-3.5 h-3.5 text-gray-400" /> Probate</span>
                    <span className="text-[0.72rem] text-gray-400">None</span>
                  </div>
                </div>
              </div>

              {/* Comparable Sales */}
              <div className="px-5 py-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[15px] font-[600] text-[#0B1224]">Comparable Sales</h3>
                  {!comps && (
                    <button
                      onClick={loadComps}
                      disabled={compsLoading}
                      className="flex items-center gap-1.5 text-[0.76rem] font-semibold text-[#2563EB] hover:text-[#1D4ED8] bg-transparent border-0 cursor-pointer"
                    >
                      {compsLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BarChart3 className="w-3.5 h-3.5" />}
                      {compsLoading ? 'Loading...' : 'Load Comps'}
                    </button>
                  )}
                </div>
                {comps ? (
                  <>
                    {comps.value != null && (
                      <div className="rounded-[8px] bg-green-50 border border-green-200 p-3 mb-3">
                        <div className="text-[11px] font-[600] uppercase text-green-600 mb-1" style={{ letterSpacing: '0.05em' }}>RentCast Estimate</div>
                        <div className="flex items-baseline gap-3">
                          <span className="text-[18px] font-[700] text-green-700">{formatCurrency(comps.value)}</span>
                          {comps.valueRangeLow != null && comps.valueRangeHigh != null && (
                            <span className="text-[0.72rem] text-green-600">
                              {formatCurrency(comps.valueRangeLow)} – {formatCurrency(comps.valueRangeHigh)}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    {comps.comparables.length > 0 ? (
                      <div className="space-y-2">
                        {comps.comparables.slice(0, 5).map((c, i) => (
                          <div key={i} className="flex items-center justify-between py-2 px-3 rounded-[8px] bg-gray-50 border border-gray-100">
                            <div className="min-w-0 flex-1">
                              <div className="text-[0.78rem] font-medium text-[#0B1224] truncate">{c.address}</div>
                              <div className="text-[0.68rem] text-gray-400">
                                {c.bedrooms ?? '—'}bd / {c.bathrooms ?? '—'}ba · {c.sqft?.toLocaleString() ?? '—'} sqft
                                {c.distance != null && <> · {c.distance.toFixed(1)} mi</>}
                              </div>
                            </div>
                            <div className="text-right ml-3 flex-shrink-0">
                              <div className="text-[0.82rem] font-semibold text-[#0B1224]">{formatCurrency(c.price)}</div>
                              {c.correlation != null && (
                                <div className="text-[0.66rem] text-gray-400">{Math.round(c.correlation * 100)}% match</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[0.78rem] text-gray-400">No comparable sales found</p>
                    )}
                  </>
                ) : !compsLoading ? (
                  <p className="text-[0.78rem] text-gray-400">Click &quot;Load Comps&quot; to fetch comparable sales and valuation data</p>
                ) : null}
              </div>
            </div>
          )}

          {/* ════════ OWNER TAB ════════ */}
          {tab === 'owner' && (
            <div className="px-5 py-5">
              {/* Enrichment notice */}
              {!property.ownerName && featuresLoading && (
                <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-[8px] bg-blue-50 border border-blue-100 text-[0.76rem] text-blue-600">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Loading owner data...
                </div>
              )}
              {!property.ownerName && !featuresLoading && !features && (
                <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-[8px] bg-gray-50 border border-gray-200 text-[0.76rem] text-gray-500">
                  <Info className="w-3.5 h-3.5" />
                  Owner data loads automatically when you open a property.
                </div>
              )}
              {/* Owner info */}
              <div className="flex items-start justify-between mb-5">
                <div>
                  <div className="flex items-center gap-1.5 text-[0.72rem] text-gray-400 mb-1">
                    <UserCircle className="w-3.5 h-3.5" /> Full Name
                  </div>
                  <div className="text-[0.92rem] font-semibold text-[#2563EB]">{property.ownerName ?? (featuresLoading ? '...' : '—')}</div>
                </div>
                {property.ownerName && (
                  <span className={`text-[0.68rem] font-medium px-2 py-0.5 rounded-full ${ownerType.color}`}>{ownerType.label}</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 mb-5">
                <div>
                  <div className="flex items-center gap-1.5 text-[0.72rem] text-gray-400 mb-1">
                    <Home className="w-3.5 h-3.5" /> Mailing Address
                  </div>
                  <div className="text-[0.82rem] text-[rgba(5,14,36,0.65)]">
                    {features?.ownerProfile?.mailingAddress ?? property.mailingAddress ?? '—'}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-[0.72rem] text-gray-400 mb-1">
                    <MapPin className="w-3.5 h-3.5" /> Occupancy
                  </div>
                  <div className="text-[0.82rem] text-[rgba(5,14,36,0.65)]">
                    {property.ownerOccupied == null ? '—' : property.ownerOccupied ? 'Owner Occupied' : 'Absentee'}
                  </div>
                </div>
              </div>

              {/* Contact Reveal */}
              <div className="-mx-5">
                <ContactReveal propertyId={property.id} ownerName={property.ownerName} />
              </div>

              {features?.ownerProfile && (
                <div className="grid grid-cols-2 gap-4 mb-5 pb-5 border-b border-gray-100">
                  <div>
                    <div className="text-[0.72rem] text-gray-400 mb-1">Investor Score</div>
                    <div className="text-[0.88rem] font-bold text-[#0B1224]">{features.ownerProfile.investorScore}/100</div>
                  </div>
                  <div>
                    <div className="text-[0.72rem] text-gray-400 mb-1">Cash Buyer</div>
                    <div className="text-[0.82rem] text-[rgba(5,14,36,0.65)]">{features.ownerProfile.likelyCashBuyer ? 'Likely' : 'Unknown'}</div>
                  </div>
                </div>
              )}

              {/* Portfolio */}
              <h3 className="text-[15px] font-[600] text-[#0B1224] mb-3">
                {property.ownerName ?? 'Owner'}&apos;s Portfolio
              </h3>

              {featuresLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400 mr-2" />
                  <span className="text-[0.78rem] text-gray-400">Loading portfolio...</span>
                </div>
              ) : features?.portfolio && features.portfolio.properties.length > 0 ? (
                <>
                  <div className="grid grid-cols-4 gap-4 mb-4 px-1">
                    <div>
                      <div className="text-[0.68rem] text-gray-400 font-medium">Properties Owned</div>
                      <div className="text-[15px] font-[600] text-[#0B1224]">{features.portfolio.propertyCount}</div>
                    </div>
                    <div>
                      <div className="text-[0.68rem] text-gray-400 font-medium">Portfolio Value</div>
                      <div className="text-[15px] font-[600] text-[#0B1224]">{formatCurrency(features.portfolio.totalValue)}</div>
                    </div>
                    <div>
                      <div className="text-[0.68rem] text-gray-400 font-medium">Total Mortgage</div>
                      <div className="text-[15px] font-[600] text-[#0B1224]">{formatCurrency(features.mortgage?.totalLienAmount ?? null)}</div>
                    </div>
                    <div>
                      <div className="text-[0.68rem] text-gray-400 font-medium">Total Equity</div>
                      <div className="text-[15px] font-[600] text-[#2563EB]">
                        {formatCurrency(features.portfolio.totalValue - (features.mortgage?.totalLienAmount ?? 0))}
                      </div>
                    </div>
                  </div>
                  <div className="border border-[rgba(5,14,36,0.06)] rounded-[10px] overflow-hidden">
                    <table className="w-full text-[0.72rem]">
                      <thead>
                        <tr className="bg-gray-50 text-left">
                          <th className="px-3 py-2 text-[11px] font-[600] uppercase text-[rgba(5,14,36,0.4)]" style={{ letterSpacing: '0.05em' }}>Address</th>
                          <th className="px-3 py-2 text-[11px] font-[600] uppercase text-[rgba(5,14,36,0.4)]" style={{ letterSpacing: '0.05em' }}>Type</th>
                          <th className="px-3 py-2 text-[11px] font-[600] uppercase text-[rgba(5,14,36,0.4)]" style={{ letterSpacing: '0.05em' }}>Bed</th>
                          <th className="px-3 py-2 text-[11px] font-[600] uppercase text-[rgba(5,14,36,0.4)]" style={{ letterSpacing: '0.05em' }}>Bath</th>
                          <th className="px-3 py-2 text-[11px] font-[600] uppercase text-[rgba(5,14,36,0.4)]" style={{ letterSpacing: '0.05em' }}>SqFt</th>
                          <th className="px-3 py-2 text-[11px] font-[600] uppercase text-[rgba(5,14,36,0.4)]" style={{ letterSpacing: '0.05em' }}>Est. Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {features.portfolio.properties.map((p, i) => (
                          <tr
                            key={p.id}
                            className={`border-t border-gray-100 cursor-pointer hover:bg-blue-50/40 transition-colors ${p.id === property.id ? 'bg-teal-50' : ''}`}
                            onClick={() => onSelectProperty?.(p)}
                          >
                            <td className="px-3 py-2">
                              <div className="text-[#2563EB] font-medium truncate max-w-[140px]">{p.addressLine1}</div>
                              <div className="text-[0.62rem] text-gray-400">{p.city}, {p.state} {p.zipCode}</div>
                            </td>
                            <td className="px-3 py-2 text-[rgba(5,14,36,0.65)]">{displayType(p.propertyType)}</td>
                            <td className="px-3 py-2 text-[rgba(5,14,36,0.65)]">{p.bedrooms ?? '—'}</td>
                            <td className="px-3 py-2 text-[rgba(5,14,36,0.65)]">{p.bathrooms ?? '—'}</td>
                            <td className="px-3 py-2 text-[rgba(5,14,36,0.65)]">{p.sqft?.toLocaleString() ?? '—'}</td>
                            <td className="px-3 py-2 text-[rgba(5,14,36,0.65)] font-medium">{formatCurrency(p.assessedValue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <p className="text-[0.78rem] text-gray-400 py-4">No other properties found for this owner</p>
              )}
            </div>
          )}

          {/* ════════ HISTORY TAB ════════ */}
          {tab === 'history' && (
            <div className="px-5 py-5">
              {/* Last sale summary */}
              <div className="grid grid-cols-3 gap-4 mb-5 pb-5 border-b border-gray-100">
                <div>
                  <div className="text-[0.68rem] text-gray-400 font-medium">Last Sale Date</div>
                  <div className="text-[15px] font-[600] text-[#0B1224]">{property.lastSaleDate ? formatDate(property.lastSaleDate) : '—'}</div>
                </div>
                <div>
                  <div className="text-[0.68rem] text-gray-400 font-medium">Last Sale Price</div>
                  <div className="text-[15px] font-[600] text-[#0B1224]">{formatCurrency(property.lastSalePrice)}</div>
                </div>
                <div>
                  <div className="text-[0.68rem] text-gray-400 font-medium">Years Owned</div>
                  <div className="text-[15px] font-[600] text-[#0B1224]">{eq.yearsOwned != null ? `${Math.floor(eq.yearsOwned)} years` : '—'}</div>
                </div>
              </div>

              {/* Mortgage history */}
              <h3 className="text-[15px] font-[600] text-[#0B1224] mb-3">Mortgage History</h3>
              {features?.mortgage && features.mortgage.liens.length > 0 ? (
                <div className="border border-[rgba(5,14,36,0.06)] rounded-[10px] overflow-hidden mb-5">
                  <table className="w-full text-[0.74rem]">
                    <thead>
                      <tr className="bg-gray-50 text-left">
                        <th className="px-3 py-2 text-[11px] font-[600] uppercase text-[rgba(5,14,36,0.4)]" style={{ letterSpacing: '0.05em' }}>Loan Type</th>
                        <th className="px-3 py-2 text-[11px] font-[600] uppercase text-[rgba(5,14,36,0.4)]" style={{ letterSpacing: '0.05em' }}>Amount</th>
                        <th className="px-3 py-2 text-[11px] font-[600] uppercase text-[rgba(5,14,36,0.4)]" style={{ letterSpacing: '0.05em' }}>Lender</th>
                        <th className="px-3 py-2 text-[11px] font-[600] uppercase text-[rgba(5,14,36,0.4)]" style={{ letterSpacing: '0.05em' }}>Due Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {features.mortgage.liens.map((lien, i) => (
                        <tr key={i} className="border-t border-gray-100">
                          <td className="px-3 py-2 text-[rgba(5,14,36,0.65)]">{lien.interestRateType ?? 'N/A'}</td>
                          <td className="px-3 py-2 text-[rgba(5,14,36,0.65)] font-medium">{formatCurrency(lien.amount)}</td>
                          <td className="px-3 py-2 text-[rgba(5,14,36,0.65)]">{lien.lenderName ?? '—'}</td>
                          <td className="px-3 py-2 text-[#2563EB]">{lien.dueDate ? formatDate(lien.dueDate) : 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-[0.78rem] text-gray-400 mb-5">No mortgage history available</p>
              )}

              {/* Transaction timeline */}
              <h3 className="text-[15px] font-[600] text-[#0B1224] mb-3">Transaction Timeline</h3>
              {property.lastSaleDate ? (
                <div className="relative pl-6">
                  <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-gray-200" />
                  <div className="relative mb-4">
                    <div className="absolute -left-4 top-1 w-3 h-3 rounded-full bg-[#2563EB] border-2 border-white shadow" />
                    <div className="text-[0.62rem] font-medium text-gray-400 mb-0.5 bg-gray-100 inline-block px-1.5 py-0.5 rounded">{formatDate(property.lastSaleDate)}</div>
                    <div className="text-[0.82rem] font-bold text-[#0B1224]">Transfer</div>
                    <div className="text-[0.74rem] text-gray-500">{property.ownerName ?? 'Unknown buyer'}</div>
                    {property.lastSalePrice != null && property.lastSalePrice > 0 && (
                      <div className="text-[0.74rem] text-gray-500">{formatCurrency(property.lastSalePrice)}</div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-[0.78rem] text-gray-400">No transaction history available</p>
              )}
            </div>
          )}
        </div>

        {/* ── Sticky Actions Footer ── */}
        <div className="flex-shrink-0 border-t border-[rgba(5,14,36,0.06)] bg-white px-5 py-3">
          <div className="flex items-center gap-2">
            <button
              onClick={onAddToCRM}
              disabled={isInCRM || addingToCRM}
              className={`flex-1 flex items-center justify-center gap-1.5 font-medium border-0 rounded-[8px] py-2 text-[0.78rem] cursor-pointer transition-colors ${
                isInCRM ? 'bg-[#2563EB] text-white cursor-default' : 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white'
              }`}
            >
              {addingToCRM ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Adding...</> : isInCRM ? <><Check className="w-3.5 h-3.5" /> In CRM</> : <><UserPlus className="w-3.5 h-3.5" /> Add as Buyer</>}
            </button>
            <button
              onClick={onAddAsSeller}
              disabled={addingAsSeller}
              className="flex-1 flex items-center justify-center gap-1.5 font-medium border-0 rounded-[8px] py-2 text-[0.78rem] cursor-pointer transition-colors bg-[#F97316] hover:bg-[#EA580C] text-white"
            >
              {addingAsSeller ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Adding...</> : <><Home className="w-3.5 h-3.5" /> Add as Seller</>}
            </button>
            <a
              href={`/deals/analyze?address=${encodeURIComponent(`${property.addressLine1}, ${property.city}, ${property.state} ${property.zipCode ?? ''}`.trim())}&propertyId=${property.id}`}
              className="flex-1 flex items-center justify-center gap-1.5 bg-white text-[rgba(5,14,36,0.65)] border border-[rgba(5,14,36,0.06)] hover:bg-gray-50 rounded-[8px] py-2 text-[0.78rem] font-medium cursor-pointer transition-colors no-underline"
            >
              <BarChart3 className="w-3.5 h-3.5" /> Analyze Deal
            </a>
            <button
              onClick={onViewOnMap}
              className="flex items-center justify-center gap-1.5 bg-white text-[rgba(5,14,36,0.65)] border border-[rgba(5,14,36,0.06)] hover:bg-gray-50 rounded-[8px] px-3 py-2 text-[0.78rem] font-medium cursor-pointer transition-colors"
            >
              <MapIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

    </div>
  )
}
