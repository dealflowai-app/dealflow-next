'use client'

import { useState } from 'react'

interface UpgradePromptProps {
  message: string
  feature: string
  currentTier: string
  suggestedTier: string
}

export default function UpgradePrompt({ message, feature, currentTier, suggestedTier }: UpgradePromptProps) {
  const [loading, setLoading] = useState(false)

  async function handleUpgrade() {
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch (e) {
      console.error('Upgrade error:', e)
    }
    setLoading(false)
  }

  return (
    <div style={{
      background: 'rgba(37,99,235,0.04)',
      border: '1px solid rgba(37,99,235,0.15)',
      borderRadius: 10,
      padding: '20px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
      fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
    }}>
      <div>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#0B1224', marginBottom: 4 }}>
          {message}
        </div>
        <div style={{ fontSize: 13, color: 'rgba(5,14,36,0.5)' }}>
          Upgrade to {suggestedTier} for more {feature}.
        </div>
      </div>
      <button
        onClick={handleUpgrade}
        disabled={loading}
        style={{
          background: '#2563EB',
          color: 'white',
          border: 'none',
          borderRadius: 8,
          padding: '10px 20px',
          fontSize: 14,
          fontWeight: 600,
          cursor: loading ? 'not-allowed' : 'pointer',
          whiteSpace: 'nowrap',
          opacity: loading ? 0.6 : 1,
          fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
        }}
      >
        {loading ? 'Loading...' : `Upgrade to ${suggestedTier}`}
      </button>
    </div>
  )
}
