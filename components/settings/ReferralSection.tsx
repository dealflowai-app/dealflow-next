'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Copy,
  Check,
  Send,
  Gift,
  Users,
  UserPlus,
  TrendingUp,
  Loader2,
  Mail,
  Link2,
} from 'lucide-react'

interface ReferralStats {
  total: number
  pending: number
  signedUp: number
  converted: number
  rewards: { earned: number; pending: number; claimed: number }
}

interface ReferralRecord {
  id: string
  referredEmail: string
  status: string
  reward: string | null
  rewardClaimed: boolean
  createdAt: string
  convertedAt: string | null
}

const satoshi = "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"

function rewardLabel(reward: string | null): string {
  if (!reward) return '--'
  switch (reward) {
    case '7_DAY_EXTENSION':
      return '7-Day Trial Extension'
    case 'CREDIT_25':
      return '$25 Account Credit'
    default:
      return reward.replace(/_/g, ' ')
  }
}

function statusBadge(status: string) {
  const styles: Record<string, { bg: string; text: string }> = {
    PENDING: { bg: 'rgba(234,179,8,0.1)', text: '#A16207' },
    SIGNED_UP: { bg: 'rgba(37,99,235,0.1)', text: '#2563EB' },
    CONVERTED: { bg: 'rgba(22,163,74,0.1)', text: '#16A34A' },
  }
  const s = styles[status] || styles.PENDING
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 10px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        fontFamily: satoshi,
        letterSpacing: '0.02em',
      }}
      className={`bg-[${s.bg}] text-[${s.text}]`}
    >
      <style>{`
        .status-${status.toLowerCase()} { background: ${s.bg}; color: ${s.text}; }
      `}</style>
      <span className={`status-${status.toLowerCase()}`} style={{ padding: '2px 10px', borderRadius: 999, display: 'inline-block' }}>
        {status === 'SIGNED_UP' ? 'Signed Up' : status.charAt(0) + status.slice(1).toLowerCase()}
      </span>
    </span>
  )
}

export default function ReferralSection() {
  const [loading, setLoading] = useState(true)
  const [referralCode, setReferralCode] = useState('')
  const [referralLink, setReferralLink] = useState('')
  const [stats, setStats] = useState<ReferralStats | null>(null)
  const [referrals, setReferrals] = useState<ReferralRecord[]>([])
  const [copied, setCopied] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<{ ok: boolean; msg: string } | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/referrals')
      if (res.ok) {
        const data = await res.json()
        setReferralCode(data.referralCode)
        setReferralLink(data.referralLink)
        setStats(data.stats)
        setReferrals(data.referrals || [])
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
    }
  }

  const sendInvite = async () => {
    if (!inviteEmail.trim()) return
    setSending(true)
    setSendResult(null)
    try {
      const res = await fetch('/api/referrals/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        setSendResult({ ok: true, msg: `Invite sent to ${inviteEmail.trim()}` })
        setInviteEmail('')
        fetchData() // refresh stats
      } else {
        setSendResult({ ok: false, msg: data.error || 'Failed to send invite' })
      }
    } catch {
      setSendResult({ ok: false, msg: 'Network error. Please try again.' })
    } finally {
      setSending(false)
    }
  }

  const handleEmailKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      sendInvite()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--dash-blue, #2563EB)' }} />
      </div>
    )
  }

  return (
    <div>
      <h2
        style={{
          fontFamily: satoshi,
          fontWeight: 600,
          fontSize: '18px',
          color: 'var(--dash-text, #0B1224)',
          letterSpacing: '-0.02em',
        }}
        className="mb-6"
      >
        Referrals
      </h2>

      {/* ── Referral Link Card ── */}
      <div
        style={{
          border: '1px solid var(--dash-card-border, rgba(5,14,36,0.06))',
          borderRadius: '10px',
          padding: '20px 24px',
        }}
        className="bg-white mb-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <Link2 style={{ width: 16, height: 16, color: 'var(--dash-blue, #2563EB)' }} />
          <h3
            style={{
              fontFamily: satoshi,
              fontWeight: 600,
              fontSize: '15px',
              color: 'var(--dash-text, #0B1224)',
              margin: 0,
            }}
          >
            Your Referral Link
          </h3>
        </div>
        <p
          style={{
            fontFamily: satoshi,
            fontWeight: 400,
            fontSize: '13px',
            color: 'var(--dash-muted, rgba(5,14,36,0.5))',
            margin: '0 0 12px',
          }}
        >
          Share this link with fellow wholesalers. You both earn rewards when they sign up and close their first deal.
        </p>

        {/* Dashed link area */}
        <div
          style={{
            border: '2px dashed var(--dash-card-border, rgba(5,14,36,0.12))',
            borderRadius: '8px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
          className="bg-[rgba(37,99,235,0.02)]"
        >
          <code
            style={{
              flex: 1,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              fontSize: '13px',
              color: 'var(--dash-text, #0B1224)',
              wordBreak: 'break-all',
              letterSpacing: '-0.01em',
            }}
          >
            {referralLink}
          </code>
          <button
            onClick={copyLink}
            style={{
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              fontFamily: satoshi,
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              background: copied ? '#16A34A' : '#2563EB',
              color: '#ffffff',
            }}
          >
            {copied ? (
              <>
                <Check style={{ width: 14, height: 14 }} />
                Copied
              </>
            ) : (
              <>
                <Copy style={{ width: 14, height: 14 }} />
                Copy Link
              </>
            )}
          </button>
        </div>

        <p
          style={{
            fontFamily: satoshi,
            fontWeight: 500,
            fontSize: '12px',
            color: 'var(--dash-muted, rgba(5,14,36,0.4))',
            margin: '10px 0 0',
          }}
        >
          Code: <span style={{ fontWeight: 700, color: 'var(--dash-blue, #2563EB)' }}>{referralCode}</span>
        </p>
      </div>

      {/* ── Send Invite Card ── */}
      <div
        style={{
          border: '1px solid var(--dash-card-border, rgba(5,14,36,0.06))',
          borderRadius: '10px',
          padding: '20px 24px',
        }}
        className="bg-white mb-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <Mail style={{ width: 16, height: 16, color: 'var(--dash-blue, #2563EB)' }} />
          <h3
            style={{
              fontFamily: satoshi,
              fontWeight: 600,
              fontSize: '15px',
              color: 'var(--dash-text, #0B1224)',
              margin: 0,
            }}
          >
            Send Invite
          </h3>
        </div>

        <div className="flex gap-2">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            onKeyDown={handleEmailKeyDown}
            placeholder="colleague@example.com"
            style={{
              flex: 1,
              backgroundColor: 'var(--dash-input-bg, #ffffff)',
              border: '1px solid var(--dash-card-border, rgba(5,14,36,0.15))',
              borderRadius: '8px',
              padding: '10px 14px',
              fontSize: '14px',
              fontFamily: satoshi,
              color: 'var(--dash-text, #0B1224)',
              outline: 'none',
            }}
          />
          <button
            onClick={sendInvite}
            disabled={sending || !inviteEmail.trim()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              fontFamily: satoshi,
              fontWeight: 600,
              fontSize: '14px',
              cursor: sending || !inviteEmail.trim() ? 'not-allowed' : 'pointer',
              background: '#2563EB',
              color: '#ffffff',
              opacity: sending || !inviteEmail.trim() ? 0.5 : 1,
              transition: 'opacity 0.15s ease',
            }}
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send style={{ width: 14, height: 14 }} />
            )}
            Send
          </button>
        </div>

        {sendResult && (
          <div
            style={{
              marginTop: 10,
              padding: '8px 14px',
              borderRadius: 8,
              fontSize: 13,
              fontFamily: satoshi,
              fontWeight: 500,
              background: sendResult.ok ? 'rgba(37,99,235,0.08)' : 'rgba(239,68,68,0.08)',
              color: sendResult.ok ? '#2563EB' : '#DC2626',
              border: `1px solid ${sendResult.ok ? 'rgba(37,99,235,0.2)' : 'rgba(239,68,68,0.2)'}`,
            }}
          >
            {sendResult.msg}
          </div>
        )}
      </div>

      {/* ── Stats Cards ── */}
      {stats && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Invited', value: stats.total, icon: UserPlus, color: '#2563EB' },
            { label: 'Signed Up', value: stats.signedUp, icon: Users, color: '#8B5CF6' },
            { label: 'Converted', value: stats.converted, icon: TrendingUp, color: '#16A34A' },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                border: '1px solid var(--dash-card-border, rgba(5,14,36,0.06))',
                borderRadius: '10px',
                padding: '18px 20px',
              }}
              className="bg-white"
            >
              <div className="flex items-center gap-2 mb-2">
                <item.icon style={{ width: 14, height: 14, color: item.color }} />
                <span
                  style={{
                    fontFamily: satoshi,
                    fontWeight: 500,
                    fontSize: '12px',
                    color: 'var(--dash-muted, rgba(5,14,36,0.5))',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  {item.label}
                </span>
              </div>
              <p
                style={{
                  fontFamily: satoshi,
                  fontWeight: 700,
                  fontSize: '28px',
                  color: 'var(--dash-text, #0B1224)',
                  margin: 0,
                  letterSpacing: '-0.02em',
                }}
              >
                {item.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ── Rewards Card ── */}
      {stats && stats.rewards.earned > 0 && (
        <div
          style={{
            border: '1px solid var(--dash-card-border, rgba(5,14,36,0.06))',
            borderRadius: '10px',
            padding: '20px 24px',
          }}
          className="bg-white mb-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Gift style={{ width: 16, height: 16, color: '#F59E0B' }} />
            <h3
              style={{
                fontFamily: satoshi,
                fontWeight: 600,
                fontSize: '15px',
                color: 'var(--dash-text, #0B1224)',
                margin: 0,
              }}
            >
              Rewards
            </h3>
          </div>
          <div className="flex gap-6">
            <div>
              <span
                style={{
                  fontFamily: satoshi,
                  fontWeight: 400,
                  fontSize: '12px',
                  color: 'var(--dash-muted, rgba(5,14,36,0.5))',
                }}
              >
                Earned
              </span>
              <p
                style={{
                  fontFamily: satoshi,
                  fontWeight: 700,
                  fontSize: '20px',
                  color: '#16A34A',
                  margin: '2px 0 0',
                }}
              >
                {stats.rewards.claimed}
              </p>
            </div>
            <div>
              <span
                style={{
                  fontFamily: satoshi,
                  fontWeight: 400,
                  fontSize: '12px',
                  color: 'var(--dash-muted, rgba(5,14,36,0.5))',
                }}
              >
                Pending
              </span>
              <p
                style={{
                  fontFamily: satoshi,
                  fontWeight: 700,
                  fontSize: '20px',
                  color: '#F59E0B',
                  margin: '2px 0 0',
                }}
              >
                {stats.rewards.pending}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Referral History ── */}
      {referrals.length > 0 && (
        <div
          style={{
            border: '1px solid var(--dash-card-border, rgba(5,14,36,0.06))',
            borderRadius: '10px',
            overflow: 'hidden',
          }}
          className="bg-white"
        >
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--dash-card-border, rgba(5,14,36,0.06))' }}>
            <h3
              style={{
                fontFamily: satoshi,
                fontWeight: 600,
                fontSize: '15px',
                color: 'var(--dash-text, #0B1224)',
                margin: 0,
              }}
            >
              Referral History
            </h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr
                  style={{
                    borderBottom: '1px solid var(--dash-card-border, rgba(5,14,36,0.06))',
                  }}
                >
                  {['Email', 'Status', 'Reward', 'Date'].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: 'left',
                        padding: '10px 24px',
                        fontFamily: satoshi,
                        fontWeight: 500,
                        fontSize: '11px',
                        color: 'var(--dash-muted, rgba(5,14,36,0.4))',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {referrals.map((ref) => (
                  <tr
                    key={ref.id}
                    style={{
                      borderBottom: '1px solid var(--dash-card-border, rgba(5,14,36,0.04))',
                    }}
                  >
                    <td
                      style={{
                        padding: '12px 24px',
                        fontFamily: satoshi,
                        fontSize: '13px',
                        fontWeight: 500,
                        color: 'var(--dash-text, #0B1224)',
                      }}
                    >
                      {ref.referredEmail}
                    </td>
                    <td style={{ padding: '12px 24px' }}>
                      {statusBadge(ref.status)}
                    </td>
                    <td
                      style={{
                        padding: '12px 24px',
                        fontFamily: satoshi,
                        fontSize: '13px',
                        color: 'var(--dash-muted, rgba(5,14,36,0.55))',
                      }}
                    >
                      {rewardLabel(ref.reward)}
                    </td>
                    <td
                      style={{
                        padding: '12px 24px',
                        fontFamily: satoshi,
                        fontSize: '12px',
                        color: 'var(--dash-muted, rgba(5,14,36,0.4))',
                      }}
                    >
                      {new Date(ref.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {referrals.length === 0 && stats && stats.total === 0 && (
        <div
          style={{
            border: '1px solid var(--dash-card-border, rgba(5,14,36,0.06))',
            borderRadius: '10px',
            padding: '40px 24px',
            textAlign: 'center',
          }}
          className="bg-white"
        >
          <Gift style={{ width: 32, height: 32, color: 'var(--dash-muted, rgba(5,14,36,0.2))', margin: '0 auto 12px' }} />
          <p
            style={{
              fontFamily: satoshi,
              fontWeight: 600,
              fontSize: '15px',
              color: 'var(--dash-text, #0B1224)',
              margin: '0 0 4px',
            }}
          >
            No referrals yet
          </p>
          <p
            style={{
              fontFamily: satoshi,
              fontWeight: 400,
              fontSize: '13px',
              color: 'var(--dash-muted, rgba(5,14,36,0.5))',
              margin: 0,
            }}
          >
            Share your link or send an invite to start earning rewards.
          </p>
        </div>
      )}
    </div>
  )
}
