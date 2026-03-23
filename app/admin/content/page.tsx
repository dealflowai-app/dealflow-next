'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  FolderOpen,
  Store,
  FileSignature,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Eye,
  Flag,
} from 'lucide-react'

const fontFamily = "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"

interface ContentData {
  kpis: {
    totalDeals: number
    dealStatus: Record<string, number>
    totalListings: number
    activeListings: number
    totalContracts: number
    contractStatus: Record<string, number>
  }
  items: any[]
  total: number
  page: number
  totalPages: number
}

type Tab = 'deals' | 'listings' | 'contracts'

function fmt(n: number | null | undefined) {
  if (n == null) return 'N/A'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n)
}

function statusColor(status: string) {
  const map: Record<string, { bg: string; color: string }> = {
    DRAFT: { bg: '#F3F4F6', color: '#6B7280' },
    ACTIVE: { bg: '#DBEAFE', color: '#2563EB' },
    UNDER_OFFER: { bg: '#EDE9FE', color: '#7C3AED' },
    CLOSED: { bg: '#D1FAE5', color: '#10B981' },
    CANCELLED: { bg: '#FEE2E2', color: '#DC2626' },
    EXPIRED: { bg: '#FEF3C7', color: '#D97706' },
    SENT: { bg: '#DBEAFE', color: '#2563EB' },
    EXECUTED: { bg: '#D1FAE5', color: '#10B981' },
    VOIDED: { bg: '#FEE2E2', color: '#DC2626' },
    PAUSED: { bg: '#FEF3C7', color: '#D97706' },
    SOLD: { bg: '#D1FAE5', color: '#10B981' },
  }
  const c = map[status] || map.DRAFT
  return c
}

function StatusBadge({ status }: { status: string }) {
  const c = statusColor(status)
  return (
    <span style={{ display: 'inline-flex', fontSize: '0.68rem', fontWeight: 600, textTransform: 'capitalize', color: c.color, background: c.bg, borderRadius: 20, padding: '2px 8px' }}>
      {status.replace('_', ' ').toLowerCase()}
    </span>
  )
}

export default function AdminContentPage() {
  const [tab, setTab] = useState<Tab>('deals')
  const [data, setData] = useState<ContentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/content?tab=${tab}&page=${page}&limit=30`)
      if (res.ok) setData(await res.json())
    } catch (e) {
      console.error('Failed to load content:', e)
    } finally {
      setLoading(false)
    }
  }, [tab, page])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    setPage(1)
  }, [tab])

  const kpis = data?.kpis

  return (
    <div style={{ padding: 32, fontFamily, maxWidth: 1280 }}>
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: '0.85rem', color: 'rgba(5,14,36,0.5)', margin: 0 }}>Deals, marketplace listings, and contracts overview</p>
      </div>

      {/* KPI cards */}
      {kpis && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          <KpiCard
            label="TOTAL DEALS"
            value={kpis.totalDeals.toString()}
            detail={`${kpis.dealStatus.ACTIVE || 0} active, ${kpis.dealStatus.CLOSED || 0} closed, ${kpis.dealStatus.CANCELLED || 0} cancelled`}
            icon={FolderOpen}
            iconBg="#EFF6FF"
            iconColor="#2563EB"
          />
          <KpiCard
            label="MARKETPLACE LISTINGS"
            value={kpis.activeListings.toString()}
            detail={`${kpis.totalListings} total listings`}
            icon={Store}
            iconBg="#ECFDF5"
            iconColor="#10B981"
          />
          <KpiCard
            label="CONTRACTS"
            value={kpis.totalContracts.toString()}
            detail={`${kpis.contractStatus.EXECUTED || 0} executed, ${kpis.contractStatus.DRAFT || 0} draft`}
            icon={FileSignature}
            iconBg="#EDE9FE"
            iconColor="#8B5CF6"
          />
          <KpiCard
            label="FLAGGED ITEMS"
            value="0"
            detail="Daisy chain detection coming soon"
            icon={AlertTriangle}
            iconBg="#FEF3C7"
            iconColor="#F59E0B"
          />
        </div>
      )}

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: '1px solid rgba(5,14,36,0.06)' }}>
        {([
          { key: 'deals', label: 'Deals' },
          { key: 'listings', label: 'Marketplace Listings' },
          { key: 'contracts', label: 'Contracts' },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '10px 18px',
              background: 'none',
              border: 'none',
              borderBottom: tab === t.key ? '2px solid #2563EB' : '2px solid transparent',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: tab === t.key ? 600 : 400,
              color: tab === t.key ? '#2563EB' : 'rgba(5,14,36,0.5)',
              fontFamily,
              transition: 'all 0.15s ease',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content table */}
      <div style={{ background: '#ffffff', border: '1px solid rgba(5,14,36,0.06)', borderRadius: 10, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'rgba(5,14,36,0.4)', fontSize: '0.85rem' }}>Loading...</div>
        ) : (
          <>
            {tab === 'deals' && <DealsTable items={data?.items || []} />}
            {tab === 'listings' && <ListingsTable items={data?.items || []} />}
            {tab === 'contracts' && <ContractsTable items={data?.items || []} />}

            {/* Pagination */}
            {data && data.totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid rgba(5,14,36,0.06)' }}>
                <span style={{ fontSize: '0.78rem', color: 'rgba(5,14,36,0.5)', fontFamily }}>
                  Page {data.page} of {data.totalPages} ({data.total} items)
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <PageBtn disabled={page <= 1} onClick={() => setPage(page - 1)}>
                    <ChevronLeft style={{ width: 14, height: 14 }} />
                  </PageBtn>
                  <PageBtn disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>
                    <ChevronRight style={{ width: 14, height: 14 }} />
                  </PageBtn>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Daisy chain placeholder */}
      <div style={{ background: '#ffffff', border: '1px solid rgba(5,14,36,0.06)', borderRadius: 10, padding: 20, marginTop: 24 }}>
        <h3 style={{ fontSize: '0.88rem', fontWeight: 600, color: '#0B1224', margin: '0 0 8px' }}>Daisy Chain Detection</h3>
        <p style={{ fontSize: '0.82rem', color: 'rgba(5,14,36,0.5)', margin: 0 }}>
          Daisy chain detection will be available at launch. This feature will automatically flag properties that are listed by multiple wholesalers, helping prevent deal conflicts and maintain marketplace quality.
        </p>
      </div>
    </div>
  )
}

// --- Tables ---

const thStyle: React.CSSProperties = {
  padding: '10px 14px', fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(5,14,36,0.4)', textAlign: 'left', fontFamily,
}
const tdStyle: React.CSSProperties = {
  padding: '10px 14px', fontSize: '0.82rem', fontFamily,
}

function DealsTable({ items }: { items: any[] }) {
  if (items.length === 0) return <div style={{ padding: 32, textAlign: 'center', color: 'rgba(5,14,36,0.4)' }}>No deals found</div>
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ borderBottom: '1px solid rgba(5,14,36,0.06)' }}>
          {['Property', 'Wholesaler', 'Status', 'ARV', 'Assign Fee', 'Created'].map((h) => (
            <th key={h} style={thStyle}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {items.map((d: any) => (
          <tr key={d.id} style={{ borderBottom: '1px solid rgba(5,14,36,0.05)' }}>
            <td style={{ ...tdStyle, fontWeight: 500, color: '#0B1224', maxWidth: 260 }}>
              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.address}</div>
            </td>
            <td style={tdStyle}>
              <div style={{ color: '#0B1224', fontWeight: 500 }}>{d.wholesaler}</div>
              <div style={{ fontSize: '0.68rem', color: 'rgba(5,14,36,0.4)' }}>{d.wholesalerEmail}</div>
            </td>
            <td style={tdStyle}><StatusBadge status={d.status} /></td>
            <td style={{ ...tdStyle, color: '#0B1224' }}>{fmt(d.arv)}</td>
            <td style={{ ...tdStyle, color: '#0B1224' }}>{fmt(d.assignFee)}</td>
            <td style={{ ...tdStyle, color: 'rgba(5,14,36,0.5)', fontSize: '0.78rem' }}>{new Date(d.createdAt).toLocaleDateString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function ListingsTable({ items }: { items: any[] }) {
  if (items.length === 0) return <div style={{ padding: 32, textAlign: 'center', color: 'rgba(5,14,36,0.4)' }}>No listings found</div>
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ borderBottom: '1px solid rgba(5,14,36,0.06)' }}>
          {['Property', 'Listed By', 'Price', 'ARV', 'Status', 'Views', 'Listed'].map((h) => (
            <th key={h} style={thStyle}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {items.map((l: any) => (
          <tr key={l.id} style={{ borderBottom: '1px solid rgba(5,14,36,0.05)' }}>
            <td style={{ ...tdStyle, fontWeight: 500, color: '#0B1224', maxWidth: 220 }}>
              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.address}</div>
            </td>
            <td style={tdStyle}>
              <div style={{ color: '#0B1224', fontWeight: 500 }}>{l.listedBy}</div>
              <div style={{ fontSize: '0.68rem', color: 'rgba(5,14,36,0.4)' }}>{l.listedByEmail}</div>
            </td>
            <td style={{ ...tdStyle, color: '#0B1224' }}>{fmt(l.askingPrice)}</td>
            <td style={{ ...tdStyle, color: '#0B1224' }}>{fmt(l.arv)}</td>
            <td style={tdStyle}><StatusBadge status={l.status} /></td>
            <td style={{ ...tdStyle, color: 'rgba(5,14,36,0.5)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Eye style={{ width: 12, height: 12 }} /> {l.viewCount}
              </div>
            </td>
            <td style={{ ...tdStyle, color: 'rgba(5,14,36,0.5)', fontSize: '0.78rem' }}>{new Date(l.createdAt).toLocaleDateString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function ContractsTable({ items }: { items: any[] }) {
  if (items.length === 0) return <div style={{ padding: 32, textAlign: 'center', color: 'rgba(5,14,36,0.4)' }}>No contracts found</div>
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ borderBottom: '1px solid rgba(5,14,36,0.06)' }}>
          {['Property', 'Assignor', 'Template', 'Fee', 'Status', 'Created'].map((h) => (
            <th key={h} style={thStyle}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {items.map((c: any) => (
          <tr key={c.id} style={{ borderBottom: '1px solid rgba(5,14,36,0.05)' }}>
            <td style={{ ...tdStyle, fontWeight: 500, color: '#0B1224', maxWidth: 220 }}>
              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.address}</div>
            </td>
            <td style={tdStyle}>
              <div style={{ color: '#0B1224', fontWeight: 500 }}>{c.assignor}</div>
              <div style={{ fontSize: '0.68rem', color: 'rgba(5,14,36,0.4)' }}>{c.assignorEmail}</div>
            </td>
            <td style={{ ...tdStyle, color: 'rgba(5,14,36,0.5)', fontSize: '0.78rem' }}>{c.templateName}</td>
            <td style={{ ...tdStyle, color: '#0B1224' }}>{fmt(c.fee)}</td>
            <td style={tdStyle}><StatusBadge status={c.status} /></td>
            <td style={{ ...tdStyle, color: 'rgba(5,14,36,0.5)', fontSize: '0.78rem' }}>{new Date(c.createdAt).toLocaleDateString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// --- Shared components ---

function KpiCard({ label, value, detail, icon: Icon, iconBg, iconColor }: {
  label: string; value: string; detail: string; icon: React.ElementType; iconBg: string; iconColor: string
}) {
  return (
    <div style={{ background: '#ffffff', border: '1px solid rgba(5,14,36,0.06)', borderRadius: 10, padding: 18, position: 'relative' }}>
      <div style={{ position: 'absolute', top: 16, right: 16, width: 34, height: 34, borderRadius: '50%', background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon style={{ width: 16, height: 16, color: iconColor, strokeWidth: 1.8 }} />
      </div>
      <p style={{ fontSize: '0.62rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(5,14,36,0.4)', margin: '0 0 6px', fontFamily }}>{label}</p>
      <p style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0B1224', margin: '0 0 4px', fontFamily, lineHeight: 1.2 }}>{value}</p>
      <p style={{ fontSize: '0.72rem', fontWeight: 500, color: 'rgba(5,14,36,0.4)', margin: 0, fontFamily }}>{detail}</p>
    </div>
  )
}

function PageBtn({ children, disabled, onClick }: { children: React.ReactNode; disabled: boolean; onClick: () => void }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      style={{
        width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 6, border: '1px solid rgba(5,14,36,0.12)',
        background: disabled ? '#F9FAFB' : '#ffffff',
        cursor: disabled ? 'not-allowed' : 'pointer',
        color: disabled ? 'rgba(5,14,36,0.2)' : '#0B1224',
      }}
    >
      {children}
    </button>
  )
}
