'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Deal = {
  id: string
  address: string
  city: string
  state: string
  zip: string
  propertyType: string
  askingPrice: number
  status: string
  createdAt: string
  matches: { id: string; matchScore: number }[]
}

const statusColors: Record<string, { bg: string; text: string }> = {
  DRAFT: { bg: 'rgba(156,163,175,0.1)', text: '#6b7280' },
  ACTIVE: { bg: 'rgba(22,163,74,0.08)', text: '#16a34a' },
  UNDER_OFFER: { bg: 'rgba(37,99,235,0.08)', text: '#2563eb' },
  CLOSED: { bg: 'rgba(124,58,237,0.08)', text: '#7c3aed' },
  CANCELLED: { bg: 'rgba(239,68,68,0.08)', text: '#ef4444' },
  EXPIRED: { bg: 'rgba(156,163,175,0.08)', text: '#9ca3af' },
}

const typeLabels: Record<string, string> = {
  SFR: 'SFR',
  MULTI_FAMILY: 'Multi-Family',
  CONDO: 'Condo',
  LAND: 'Land',
  COMMERCIAL: 'Commercial',
  MOBILE_HOME: 'Mobile Home',
}

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/deals')
      .then(r => r.json())
      .then(data => setDeals(data.deals || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-9 max-w-[1080px]">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1
            style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            className="text-[1.5rem] font-normal text-[var(--navy-heading,#0B1224)] tracking-[-0.022em] mb-1"
          >
            My Deals
          </h1>
          <p className="text-[0.86rem] text-[var(--body-text,#4B5563)]">Manage and track submitted properties.</p>
        </div>
        <Link
          href="/deals/new"
          className="inline-flex items-center gap-1.5 bg-gray-900 text-white rounded-md px-3.5 py-2 text-[0.84rem] no-underline hover:bg-gray-800 transition-colors flex-shrink-0"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New deal
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {/* Table header */}
        <div className="grid px-5 py-3 border-b border-gray-100 bg-gray-50 deal-table-header" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 80px' }}>
          {['Property', 'Price', 'Matches', 'Status', ''].map(h => (
            <div key={h} className="text-[0.68rem] text-gray-400 tracking-wide uppercase">{h}</div>
          ))}
        </div>

        {loading ? (
          <div className="py-16 px-6 text-center">
            <div className="text-[0.84rem] text-[#9ca3af]">Loading deals...</div>
          </div>
        ) : deals.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <div className="text-[0.86rem] text-[var(--body-text,#4B5563)] mb-5 max-w-[340px] mx-auto">
              No deals yet. Submit a property and the AI will start finding matched cash buyers.
            </div>
            <Link
              href="/deals/new"
              className="inline-flex items-center gap-1.5 border border-gray-300 text-gray-700 rounded-md px-4 py-2 text-[0.84rem] no-underline hover:bg-gray-50 transition-colors"
            >
              Submit your first deal
            </Link>
          </div>
        ) : (
          <div>
            {deals.map(deal => {
              const sc = statusColors[deal.status] || statusColors.DRAFT
              return (
                <div
                  key={deal.id}
                  className="grid px-5 py-3.5 border-b border-gray-100 items-center hover:bg-gray-50/50 transition-colors deal-table-row"
                  style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 80px' }}
                >
                  <div>
                    <div className="text-[0.84rem] font-medium text-[var(--navy-heading,#0B1224)]">
                      {deal.address}
                    </div>
                    <div className="text-[0.74rem] text-[#9ca3af]">
                      {deal.city}, {deal.state} {deal.zip} · {typeLabels[deal.propertyType] || deal.propertyType}
                    </div>
                  </div>
                  <div className="text-[0.84rem] text-[var(--body-text,#4B5563)]">
                    ${deal.askingPrice.toLocaleString()}
                  </div>
                  <div className="text-[0.84rem] text-[var(--body-text,#4B5563)]">
                    {deal.matches.length > 0 ? `${deal.matches.length} buyer${deal.matches.length !== 1 ? 's' : ''}` : '—'}
                  </div>
                  <div>
                    <span
                      className="inline-block px-2 py-0.5 rounded-full text-[0.68rem] font-semibold tracking-wide uppercase"
                      style={{ background: sc.bg, color: sc.text }}
                    >
                      {deal.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="text-right">
                    <Link
                      href={`/deals/${deal.id}`}
                      className="text-[0.76rem] text-[#2563eb] no-underline hover:underline"
                    >
                      View
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 680px) {
          .deal-table-header { display: none !important; }
          .deal-table-row { grid-template-columns: 1fr !important; gap: 4px; }
        }
      `}</style>
    </div>
  )
}
