'use client'

import { useState } from 'react'
import {
  Settings,
  CreditCard,
  Globe,
  Clock,
  AlertTriangle,
} from 'lucide-react'

const fontFamily = "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"

export default function AdminSettingsPage() {
  const [trialDays, setTrialDays] = useState('14')
  const [supportEmail, setSupportEmail] = useState('hello@dealflowai.app')
  const [maintenanceMode, setMaintenanceMode] = useState(false)

  return (
    <div style={{ padding: 32, fontFamily, maxWidth: 800 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0B1224', margin: 0 }}>Settings</h1>
        <p style={{ fontSize: '0.85rem', color: 'rgba(5,14,36,0.5)', margin: '4px 0 0' }}>Platform configuration</p>
      </div>

      {/* Platform name */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <IconCircle icon={Globe} bg="#EFF6FF" color="#2563EB" />
          <div>
            <h3 style={{ fontSize: '0.88rem', fontWeight: 600, color: '#0B1224', margin: 0 }}>Platform Name</h3>
            <p style={{ fontSize: '0.75rem', color: 'rgba(5,14,36,0.4)', margin: '2px 0 0' }}>Display name across the application</p>
          </div>
        </div>
        <input
          value="DealFlow AI"
          readOnly
          style={{
            width: '100%', padding: '10px 12px', borderRadius: 8,
            border: '1px solid rgba(5,14,36,0.12)', background: '#F9FAFB',
            fontSize: '0.85rem', color: 'rgba(5,14,36,0.5)', fontFamily,
            cursor: 'not-allowed',
          }}
        />
        <p style={{ fontSize: '0.68rem', color: 'rgba(5,14,36,0.3)', margin: '6px 0 0' }}>Read-only. Contact support to change.</p>
      </Card>

      {/* Support email */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <IconCircle icon={Settings} bg="#EDE9FE" color="#8B5CF6" />
          <div>
            <h3 style={{ fontSize: '0.88rem', fontWeight: 600, color: '#0B1224', margin: 0 }}>Support Email</h3>
            <p style={{ fontSize: '0.75rem', color: 'rgba(5,14,36,0.4)', margin: '2px 0 0' }}>Shown to users in help and error messages</p>
          </div>
        </div>
        <input
          value={supportEmail}
          onChange={(e) => setSupportEmail(e.target.value)}
          style={{
            width: '100%', padding: '10px 12px', borderRadius: 8,
            border: '1px solid rgba(5,14,36,0.12)', background: '#ffffff',
            fontSize: '0.85rem', color: '#0B1224', fontFamily, outline: 'none',
          }}
        />
        <p style={{ fontSize: '0.68rem', color: 'rgba(5,14,36,0.3)', margin: '6px 0 0' }}>Save functionality will be wired to a config table.</p>
      </Card>

      {/* Default trial days */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <IconCircle icon={Clock} bg="#FFF7ED" color="#F59E0B" />
          <div>
            <h3 style={{ fontSize: '0.88rem', fontWeight: 600, color: '#0B1224', margin: 0 }}>Default Trial Duration</h3>
            <p style={{ fontSize: '0.75rem', color: 'rgba(5,14,36,0.4)', margin: '2px 0 0' }}>Number of days for new user trials</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            value={trialDays}
            onChange={(e) => setTrialDays(e.target.value.replace(/\D/g, ''))}
            style={{
              width: 80, padding: '10px 12px', borderRadius: 8,
              border: '1px solid rgba(5,14,36,0.12)', background: '#ffffff',
              fontSize: '0.85rem', color: '#0B1224', fontFamily, outline: 'none',
              textAlign: 'center',
            }}
          />
          <span style={{ fontSize: '0.85rem', color: 'rgba(5,14,36,0.5)' }}>days</span>
        </div>
      </Card>

      {/* Maintenance mode */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <IconCircle icon={AlertTriangle} bg={maintenanceMode ? '#FEF2F2' : '#F9FAFB'} color={maintenanceMode ? '#DC2626' : '#9CA3AF'} />
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '0.88rem', fontWeight: 600, color: '#0B1224', margin: 0 }}>Maintenance Mode</h3>
            <p style={{ fontSize: '0.75rem', color: 'rgba(5,14,36,0.4)', margin: '2px 0 0' }}>
              {maintenanceMode ? 'Active: Non-admin users see a maintenance banner' : 'Disabled: Platform operating normally'}
            </p>
          </div>
          <button
            onClick={() => setMaintenanceMode(!maintenanceMode)}
            style={{
              width: 44, height: 24, borderRadius: 12,
              background: maintenanceMode ? '#DC2626' : '#D1D5DB',
              border: 'none', cursor: 'pointer', position: 'relative',
              transition: 'background 0.2s ease',
            }}
          >
            <div
              style={{
                width: 18, height: 18, borderRadius: '50%', background: '#ffffff',
                position: 'absolute', top: 3,
                left: maintenanceMode ? 23 : 3,
                transition: 'left 0.2s ease',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              }}
            />
          </button>
        </div>
        {maintenanceMode && (
          <div style={{
            padding: '10px 12px', background: '#FEF2F2', borderRadius: 8,
            border: '1px solid #FEE2E2', fontSize: '0.78rem', color: '#DC2626',
          }}>
            Maintenance mode is ON. Non-admin users will see a maintenance notification.
          </div>
        )}
      </Card>

      {/* Stripe mode */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <IconCircle icon={CreditCard} bg="#ECFDF5" color="#10B981" />
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '0.88rem', fontWeight: 600, color: '#0B1224', margin: 0 }}>Stripe Integration</h3>
            <p style={{ fontSize: '0.75rem', color: 'rgba(5,14,36,0.4)', margin: '2px 0 0' }}>Current payment processing mode</p>
          </div>
          <span style={{
            fontSize: '0.72rem', fontWeight: 700, color: '#F59E0B',
            background: '#FEF3C7', borderRadius: 20, padding: '3px 10px',
          }}>
            Test Mode
          </span>
        </div>
        <div style={{ marginTop: 12 }}>
          <a
            href="https://dashboard.stripe.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: '0.78rem', fontWeight: 500, color: '#2563EB', textDecoration: 'none',
            }}
          >
            Open Stripe Dashboard
          </a>
        </div>
      </Card>

      {/* Save placeholder */}
      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
        <button
          disabled
          style={{
            padding: '10px 24px', borderRadius: 8, border: 'none',
            background: '#D1D5DB', color: '#ffffff', fontSize: '0.85rem',
            fontWeight: 600, fontFamily, cursor: 'not-allowed',
          }}
        >
          Save Changes (coming soon)
        </button>
      </div>
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: '#ffffff', border: '1px solid rgba(5,14,36,0.08)',
      borderRadius: 12, padding: 20, marginBottom: 16,
    }}>
      {children}
    </div>
  )
}

function IconCircle({ icon: Icon, bg, color }: { icon: React.ElementType; bg: string; color: string }) {
  return (
    <div style={{
      width: 36, height: 36, borderRadius: '50%', background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <Icon style={{ width: 17, height: 17, color, strokeWidth: 1.8 }} />
    </div>
  )
}
