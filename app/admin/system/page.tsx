'use client'

import { useEffect, useState } from 'react'
import {
  Database,
  CreditCard,
  Shield,
  Map,
  Phone,
  Mail,
  Mic,
  Bot,
  Brain,
  RefreshCw,
  Server,
  Loader2,
} from 'lucide-react'

const fontFamily = "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"

interface SystemData {
  services: { name: string; status: 'healthy' | 'warning' | 'error'; message: string }[]
  dbStats: { table: string; count: number }[]
  environment: {
    nodeVersion: string
    platform: string
    stripeMode: string
    vercel: boolean
    vercelEnv: string
    region: string
  }
}

const serviceIcons: Record<string, React.ElementType> = {
  Database: Database,
  Stripe: CreditCard,
  'Supabase Auth': Shield,
  BatchData: Server,
  RentCast: Server,
  Mapbox: Map,
  'Bland AI': Phone,
  Twilio: Phone,
  SendGrid: Mail,
  OpenAI: Bot,
  Anthropic: Brain,
  ElevenLabs: Mic,
}

function statusDot(status: 'healthy' | 'warning' | 'error') {
  const colors = { healthy: '#10B981', warning: '#F59E0B', error: '#EF4444' }
  return (
    <div
      style={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: colors[status],
        flexShrink: 0,
        boxShadow: `0 0 6px ${colors[status]}40`,
      }}
    />
  )
}

export default function AdminSystemPage() {
  const [data, setData] = useState<SystemData | null>(null)
  const [loading, setLoading] = useState(true)
  const [recalculating, setRecalculating] = useState(false)

  function loadData() {
    setLoading(true)
    fetch('/api/admin/system')
      .then((r) => r.ok ? r.json() : null)
      .then(setData)
      .catch(() => null)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
  }, [])

  if (loading) return <PageShell><p style={{ color: 'rgba(5,14,36,0.5)', fontSize: '0.85rem' }}>Running system checks...</p></PageShell>
  if (!data) return <PageShell><p style={{ color: '#EF4444', fontSize: '0.85rem' }}>Failed to load system status.</p></PageShell>

  const healthyCount = data.services.filter((s) => s.status === 'healthy').length
  const warningCount = data.services.filter((s) => s.status === 'warning').length
  const errorCount = data.services.filter((s) => s.status === 'error').length

  return (
    <PageShell>
      {/* Overall status */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, padding: '14px 20px',
        background: errorCount > 0 ? '#FEF2F2' : warningCount > 0 ? '#FFFBEB' : '#ECFDF5',
        border: `1px solid ${errorCount > 0 ? '#FEE2E2' : warningCount > 0 ? '#FEF3C7' : '#D1FAE5'}`,
        borderRadius: 10,
      }}>
        {statusDot(errorCount > 0 ? 'error' : warningCount > 0 ? 'warning' : 'healthy')}
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#0B1224' }}>
            {errorCount > 0 ? 'System Issues Detected' : warningCount > 0 ? 'Some Services Not Configured' : 'All Systems Operational'}
          </span>
          <span style={{ fontSize: '0.78rem', color: 'rgba(5,14,36,0.5)', marginLeft: 12 }}>
            {healthyCount} healthy, {warningCount} warning, {errorCount} error
          </span>
        </div>
        <button
          onClick={loadData}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
            borderRadius: 6, border: '1px solid rgba(5,14,36,0.12)', background: '#ffffff',
            cursor: 'pointer', fontSize: '0.78rem', fontWeight: 500, color: '#0B1224', fontFamily,
          }}
        >
          <RefreshCw style={{ width: 13, height: 13, strokeWidth: 1.8 }} /> Refresh
        </button>
      </div>

      {/* Service status grid */}
      <div style={{
        background: '#ffffff', border: '1px solid rgba(5,14,36,0.06)', borderRadius: 10, padding: 20, marginBottom: 24,
      }}>
        <h3 style={{ fontSize: '0.88rem', fontWeight: 600, color: '#0B1224', margin: '0 0 16px' }}>Service Status</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {data.services.map((s) => {
            const Icon = serviceIcons[s.name] || Server
            return (
              <div
                key={s.name}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                  background: '#F9FAFB', borderRadius: 8,
                  border: s.status === 'error' ? '1px solid #FEE2E2' : s.status === 'warning' ? '1px solid #FEF3C7' : '1px solid transparent',
                }}
              >
                <Icon style={{ width: 16, height: 16, color: 'rgba(5,14,36,0.4)', strokeWidth: 1.7, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 500, color: '#0B1224', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.name}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'rgba(5,14,36,0.4)' }}>{s.message}</div>
                </div>
                {statusDot(s.status)}
              </div>
            )
          })}
        </div>
      </div>

      {/* DB stats + Environment */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div style={{ background: '#ffffff', border: '1px solid rgba(5,14,36,0.06)', borderRadius: 10, padding: 20 }}>
          <h3 style={{ fontSize: '0.88rem', fontWeight: 600, color: '#0B1224', margin: '0 0 16px' }}>Database Statistics</h3>
          {data.dbStats.map((s) => (
            <div
              key={s.table}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 0', borderBottom: '1px solid rgba(5,14,36,0.05)',
              }}
            >
              <span style={{ fontSize: '0.82rem', color: 'rgba(5,14,36,0.6)' }}>{s.table}</span>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0B1224' }}>
                {new Intl.NumberFormat('en-US').format(s.count)}
              </span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0', fontWeight: 600 }}>
            <span style={{ fontSize: '0.82rem', color: '#0B1224' }}>Total Records</span>
            <span style={{ fontSize: '0.82rem', color: '#0B1224' }}>
              {new Intl.NumberFormat('en-US').format(data.dbStats.reduce((s, d) => s + d.count, 0))}
            </span>
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid rgba(5,14,36,0.06)', borderRadius: 10, padding: 20 }}>
          <h3 style={{ fontSize: '0.88rem', fontWeight: 600, color: '#0B1224', margin: '0 0 16px' }}>Environment</h3>
          {[
            { label: 'Node.js', value: data.environment.nodeVersion },
            { label: 'Platform', value: data.environment.platform },
            { label: 'Deployment', value: data.environment.vercel ? `Vercel (${data.environment.vercelEnv})` : 'Local' },
            { label: 'Region', value: data.environment.region },
            {
              label: 'Stripe Mode',
              value: data.environment.stripeMode,
              highlight: data.environment.stripeMode === 'Test',
            },
          ].map((row) => (
            <div
              key={row.label}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 0', borderBottom: '1px solid rgba(5,14,36,0.05)',
              }}
            >
              <span style={{ fontSize: '0.82rem', color: 'rgba(5,14,36,0.6)' }}>{row.label}</span>
              <span style={{
                fontSize: '0.82rem', fontWeight: 600,
                color: (row as any).highlight ? '#F59E0B' : '#0B1224',
              }}>
                {row.value}
                {(row as any).highlight && (
                  <span style={{
                    marginLeft: 6, fontSize: '0.62rem', fontWeight: 700, color: '#F59E0B',
                    background: '#FEF3C7', borderRadius: 20, padding: '1px 6px',
                  }}>
                    TEST
                  </span>
                )}
              </span>
            </div>
          ))}

          {/* Stripe dashboard link */}
          <div style={{ marginTop: 14 }}>
            <a
              href="https://dashboard.stripe.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontSize: '0.78rem', fontWeight: 500, color: '#2563EB',
                textDecoration: 'none',
              }}
            >
              <CreditCard style={{ width: 13, height: 13 }} /> Open Stripe Dashboard
            </a>
          </div>
        </div>
      </div>

      {/* Error logging placeholder */}
      <div style={{ background: '#ffffff', border: '1px solid rgba(5,14,36,0.06)', borderRadius: 10, padding: 20, marginBottom: 24 }}>
        <h3 style={{ fontSize: '0.88rem', fontWeight: 600, color: '#0B1224', margin: '0 0 8px' }}>Error Logging</h3>
        <p style={{ fontSize: '0.82rem', color: 'rgba(5,14,36,0.5)', margin: '0 0 12px' }}>
          Error logging will be configured with a monitoring service (Sentry, LogRocket) before production launch. This section will display recent application errors, API failures, and performance issues.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          {['Sentry', 'LogRocket', 'Datadog'].map((service) => (
            <span
              key={service}
              style={{
                fontSize: '0.68rem', fontWeight: 500, color: 'rgba(5,14,36,0.4)',
                background: '#F9FAFB', borderRadius: 6, padding: '4px 10px',
              }}
            >
              {service}
            </span>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ background: '#ffffff', border: '1px solid rgba(5,14,36,0.06)', borderRadius: 10, padding: 20 }}>
        <h3 style={{ fontSize: '0.88rem', fontWeight: 600, color: '#0B1224', margin: '0 0 16px' }}>Quick Actions</h3>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <ActionButton label="Clear All Caches" description="Flush analysis and discovery caches" disabled />
          <ActionButton label="Migration Check" description="Verify database schema is up to date" disabled />
          <ActionButton
            label={recalculating ? 'Recalculating...' : 'Recalculate Usage'}
            description="Update usage snapshots for all users"
            onClick={async () => {
              setRecalculating(true)
              // In production, this would call a dedicated endpoint
              setTimeout(() => setRecalculating(false), 2000)
            }}
            loading={recalculating}
          />
        </div>
      </div>
    </PageShell>
  )
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: 32, fontFamily, maxWidth: 1280 }}>
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: '0.85rem', color: 'rgba(5,14,36,0.5)', margin: 0 }}>Health checks, database stats, and environment info</p>
      </div>
      {children}
    </div>
  )
}

function ActionButton({ label, description, onClick, disabled, loading }: {
  label: string; description: string; onClick?: () => void; disabled?: boolean; loading?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2,
        padding: '10px 16px', borderRadius: 8,
        border: '1px solid rgba(5,14,36,0.12)',
        background: disabled ? '#F9FAFB' : '#ffffff',
        cursor: disabled ? 'not-allowed' : loading ? 'wait' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        fontFamily,
        transition: 'background 0.1s ease',
      }}
    >
      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0B1224', display: 'flex', alignItems: 'center', gap: 6 }}>
        {loading && <Loader2 style={{ width: 13, height: 13, animation: 'spin 1s linear infinite' }} />}
        {label}
      </span>
      <span style={{ fontSize: '0.68rem', color: 'rgba(5,14,36,0.4)' }}>{description}</span>
    </button>
  )
}
