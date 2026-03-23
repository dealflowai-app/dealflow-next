'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, Check } from 'lucide-react'

/* ═══════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════ */

interface EmailPreferencesState {
  weeklyDigest: boolean
  dealAlerts: boolean
  communityUpdates: boolean
}

const DEFAULT_PREFS: EmailPreferencesState = {
  weeklyDigest: true,
  dealAlerts: true,
  communityUpdates: true,
}

const FONT =
  "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"

/* ═══════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════ */

export default function EmailPreferences() {
  const [prefs, setPrefs] = useState<EmailPreferencesState>(DEFAULT_PREFS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── Load current preferences from profile ──
  useEffect(() => {
    async function loadPrefs() {
      try {
        const res = await fetch('/api/profile/avatar') // profile endpoint
        if (!res.ok) {
          // Fall back: try to parse settings from any profile endpoint
          setLoading(false)
          return
        }
        const data = await res.json()
        const emailPrefs = data?.settings?.emailPreferences
        if (emailPrefs && typeof emailPrefs === 'object') {
          setPrefs({
            weeklyDigest: emailPrefs.weeklyDigest ?? true,
            dealAlerts: emailPrefs.dealAlerts ?? true,
            communityUpdates: emailPrefs.communityUpdates ?? true,
          })
        }
      } catch {
        // Use defaults on error
      } finally {
        setLoading(false)
      }
    }
    loadPrefs()
  }, [])

  // ── Save preferences ──
  const savePrefs = useCallback(async () => {
    setSaving(true)
    setSaved(false)
    setError(null)

    try {
      const res = await fetch('/api/profile/avatar', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            emailPreferences: prefs,
          },
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to save preferences')
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }, [prefs])

  // ── Toggle handler ──
  const toggle = (key: keyof EmailPreferencesState) => {
    setPrefs(prev => ({ ...prev, [key]: !prev[key] }))
    setSaved(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    )
  }

  const toggleItems: { key: keyof EmailPreferencesState; label: string; description: string }[] = [
    {
      key: 'weeklyDigest',
      label: 'Weekly Digest',
      description: 'A summary of your activity every Monday: new buyers, deals, campaigns, and responses.',
    },
    {
      key: 'dealAlerts',
      label: 'Deal Alerts',
      description: 'Real-time notifications when deals are matched, offers are received, or contracts are updated.',
    },
    {
      key: 'communityUpdates',
      label: 'Community Updates',
      description: 'New posts in your groups, replies to your threads, and platform announcements.',
    },
  ]

  return (
    <div>
      <h2
        style={{
          fontFamily: FONT,
          fontWeight: 600,
          fontSize: '18px',
          color: '#0B1224',
          letterSpacing: '-0.02em',
        }}
        className="mb-1"
      >
        Email Preferences
      </h2>
      <p
        style={{
          fontFamily: FONT,
          fontWeight: 400,
          fontSize: '14px',
          color: 'rgba(5,14,36,0.5)',
        }}
        className="mb-6"
      >
        Control which emails DealFlow AI sends you.
      </p>

      <div
        style={{ border: '1px solid rgba(5,14,36,0.06)', borderRadius: '10px' }}
        className="bg-white overflow-hidden"
      >
        <div className="px-6 py-3 border-b border-gray-100 bg-gray-50">
          <h3
            style={{
              fontFamily: FONT,
              fontWeight: 600,
              fontSize: '15px',
              color: '#0B1224',
            }}
          >
            Email Notifications
          </h3>
        </div>

        <div className="divide-y divide-gray-50">
          {toggleItems.map((item) => (
            <div key={item.key} className="flex items-center justify-between px-6 py-4">
              <div className="flex-1 mr-4">
                <span
                  style={{
                    fontFamily: FONT,
                    fontWeight: 500,
                    fontSize: '14px',
                    color: '#0B1224',
                    display: 'block',
                  }}
                >
                  {item.label}
                </span>
                <span
                  style={{
                    fontFamily: FONT,
                    fontWeight: 400,
                    fontSize: '13px',
                    color: 'rgba(5,14,36,0.45)',
                    display: 'block',
                    marginTop: '2px',
                    lineHeight: '1.4',
                  }}
                >
                  {item.description}
                </span>
              </div>
              <button
                onClick={() => toggle(item.key)}
                className={`w-10 h-[22px] rounded-full transition-colors relative flex-shrink-0 ${
                  prefs[item.key] ? 'bg-[#2563EB]' : 'bg-gray-200'
                }`}
                aria-label={`Toggle ${item.label}`}
                role="switch"
                aria-checked={prefs[item.key]}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white absolute top-[3px] transition-all ${
                    prefs[item.key] ? 'right-[3px]' : 'left-[3px]'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <p
          style={{
            fontFamily: FONT,
            fontWeight: 400,
            fontSize: '13px',
            color: '#dc2626',
          }}
          className="mt-3"
        >
          {error}
        </p>
      )}

      <button
        onClick={savePrefs}
        disabled={saving}
        style={{
          padding: '10px 20px',
          borderRadius: '8px',
          fontWeight: 600,
          fontSize: '14px',
          fontFamily: FONT,
        }}
        className="mt-6 bg-[#2563EB] text-white hover:bg-[#1D4ED8] transition-colors disabled:opacity-60 flex items-center gap-2"
      >
        {saving ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Saving...
          </>
        ) : saved ? (
          <>
            <Check className="w-4 h-4" />
            Saved
          </>
        ) : (
          'Save Email Preferences'
        )}
      </button>
    </div>
  )
}
