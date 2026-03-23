'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Lock,
  Loader2,
  Phone,
  Mail,
  MapPin,
  Copy,
  Check,
  CheckCircle2,
  ShieldAlert,
  ShieldOff,
  Smartphone,
  PhoneCall,
  Wifi,
} from 'lucide-react'

interface SkipTracePhone {
  number: string
  type: 'mobile' | 'landline' | 'voip'
  score: number
  verified: boolean
  doNotCall: boolean
  litigator: boolean
  carrier?: string
}

interface SkipTraceEmail {
  address: string
  type?: string
  score: number
  verified?: boolean
}

interface SkipTraceMailingAddress {
  line1: string
  city: string
  state: string
  zip: string
}

interface SkipTraceResultData {
  id: string
  ownerName: string
  propertyAddress: string
  phones: SkipTracePhone[]
  emails: SkipTraceEmail[]
  mailingAddress: SkipTraceMailingAddress | null
  confidence: number
  provider: string
  phoneCount: number
  emailCount: number
  mobileCount: number
  hasDoNotCall: boolean
  hasLitigator: boolean
  cachedAt: string
  expiresAt: string
}

interface UsageData {
  used: number
  limit: number | null
  remaining: number | null
}

function formatPhone(num: string): string {
  const cleaned = num.replace(/\D/g, '')
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`
  }
  return num
}

function PhoneTypeIcon({ type }: { type: string }) {
  switch (type) {
    case 'mobile':
      return <Smartphone className="w-3 h-3" />
    case 'landline':
      return <PhoneCall className="w-3 h-3" />
    case 'voip':
      return <Wifi className="w-3 h-3" />
    default:
      return <Phone className="w-3 h-3" />
  }
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
      className="p-1 rounded hover:bg-gray-100 transition-colors cursor-pointer border-0 bg-transparent"
      title="Copy"
    >
      {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-gray-400" />}
    </button>
  )
}

export default function ContactReveal({
  propertyId,
  ownerName,
  onRevealComplete,
}: {
  propertyId: string
  ownerName: string | null
  onRevealComplete?: (result: SkipTraceResultData) => void
}) {
  const [result, setResult] = useState<SkipTraceResultData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [upgradeRequired, setUpgradeRequired] = useState(false)

  // Check cache + fetch usage on mount
  useEffect(() => {
    fetch(`/api/discovery/property/${propertyId}/skip-trace`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.cached && data.result) {
          setResult(data.result)
          onRevealComplete?.(data.result)
        }
      })
      .catch(() => {})
    fetch('/api/usage/reveals')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.reveals) setUsage(data.reveals)
      })
      .catch(() => {})
  }, [propertyId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleReveal = useCallback(async () => {
    if (loading || result) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/discovery/property/${propertyId}/skip-trace`, {
        method: 'POST',
      })

      const data = await res.json()

      if (res.status === 403 && data.upgradeRequired) {
        setUpgradeRequired(true)
        if (data.used != null && data.limit != null) {
          setUsage({ used: data.used, limit: data.limit, remaining: 0 })
        }
        return
      }

      if (!res.ok) {
        setError(data.error ?? 'Failed to reveal contact')
        return
      }

      setResult(data.result)
      if (data.usage) {
        setUsage(data.usage)
      }
      onRevealComplete?.(data.result)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [propertyId, loading, result, onRevealComplete])

  // Reset when property changes
  useEffect(() => {
    setResult(null)
    setError(null)
    setUpgradeRequired(false)
  }, [propertyId])

  if (!ownerName) {
    return (
      <div className="px-5 py-4 border-b border-[rgba(5,14,36,0.06)]">
        <h3 className="text-[15px] font-[600] text-[#0B1224] mb-2">Contact Information</h3>
        <p className="text-[0.78rem] text-gray-400">No owner name on record</p>
      </div>
    )
  }

  // Usage bar
  const usageBar = usage && usage.limit != null ? (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[0.7rem] text-gray-400">
          {usage.used} of {usage.limit} reveals used this month
        </span>
        {usage.remaining != null && usage.remaining <= Math.ceil(usage.limit * 0.2) && usage.remaining > 0 && (
          <span className="text-[0.65rem] font-medium text-amber-600">Running low</span>
        )}
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            usage.remaining === 0
              ? 'bg-red-500'
              : usage.remaining != null && usage.remaining <= Math.ceil(usage.limit * 0.2)
              ? 'bg-amber-500'
              : 'bg-[#2563EB]'
          }`}
          style={{ width: `${Math.min(100, (usage.used / usage.limit) * 100)}%` }}
        />
      </div>
    </div>
  ) : null

  // Locked state
  if (!result && !upgradeRequired) {
    return (
      <div className="px-5 py-4 border-b border-[rgba(5,14,36,0.06)]">
        <h3 className="text-[15px] font-[600] text-[#0B1224] mb-3">Contact Information</h3>

        {/* Blurred preview */}
        <div className="space-y-2 mb-3 select-none">
          <div className="flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 text-gray-300" />
            <span className="text-[0.82rem] text-gray-300 blur-[4px]">(555) 123-4567</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="w-3.5 h-3.5 text-gray-300" />
            <span className="text-[0.82rem] text-gray-300 blur-[4px]">owner@email.com</span>
          </div>
        </div>

        <button
          onClick={handleReveal}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:bg-[#93B4F8] text-white font-[600] border-0 rounded-[8px] px-4 py-2.5 text-[0.82rem] cursor-pointer transition-colors"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Searching records...</>
          ) : (
            <><Lock className="w-4 h-4" /> Reveal Contact Info</>
          )}
        </button>

        {error && (
          <p className="text-[0.74rem] text-red-500 mt-2">{error}</p>
        )}

        {usageBar}
      </div>
    )
  }

  // Upgrade required
  if (upgradeRequired) {
    return (
      <div className="px-5 py-4 border-b border-[rgba(5,14,36,0.06)]">
        <h3 className="text-[15px] font-[600] text-[#0B1224] mb-3">Contact Information</h3>
        <div className="bg-red-50 border border-red-200 rounded-[8px] p-3 mb-3">
          <p className="text-[0.82rem] font-medium text-red-700 mb-1">Monthly reveal limit reached</p>
          <p className="text-[0.74rem] text-red-600">
            You&apos;ve used all {usage?.limit} reveals this month.
          </p>
        </div>
        <a
          href="/settings"
          className="w-full flex items-center justify-center gap-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-[600] border-0 rounded-[8px] px-4 py-2.5 text-[0.82rem] cursor-pointer transition-colors no-underline"
        >
          Upgrade for More Reveals
        </a>
        {usageBar}
      </div>
    )
  }

  // Revealed state — result is guaranteed non-null here
  if (!result) return null
  return (
    <div className="px-5 py-4 border-b border-[rgba(5,14,36,0.06)]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[15px] font-[600] text-[#0B1224]">Contact Information</h3>
        <span className="text-[0.68rem] text-gray-400">
          Confidence: {result.confidence}%
        </span>
      </div>

      {/* Phones */}
      {result.phones.length > 0 ? (
        <div className="space-y-2 mb-3">
          {result.phones.map((phone, i) => (
            <div key={i} className="flex items-center gap-2 group">
              <PhoneTypeIcon type={phone.type} />
              <a
                href={phone.doNotCall ? undefined : `tel:${phone.number}`}
                onClick={phone.doNotCall ? (e) => e.preventDefault() : undefined}
                className={`text-[0.82rem] font-medium tabular-nums no-underline ${
                  phone.doNotCall ? 'text-gray-400 cursor-not-allowed' : 'text-[#2563EB] hover:underline cursor-pointer'
                }`}
                title={phone.doNotCall ? 'Do Not Call (cannot dial)' : `Call ${formatPhone(phone.number)}`}
              >
                {formatPhone(phone.number)}
              </a>

              {/* Type badge */}
              <span className={`text-[0.62rem] font-medium px-1.5 py-0.5 rounded-full ${
                phone.type === 'mobile'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : phone.type === 'voip'
                  ? 'bg-blue-50 text-blue-600 border border-blue-200'
                  : 'bg-gray-50 text-gray-500 border border-gray-200'
              }`}>
                {phone.type === 'mobile' ? 'Mobile' : phone.type === 'voip' ? 'VoIP' : 'Landline'}
              </span>

              {/* Verified */}
              {phone.verified && (
                <span title="Verified"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /></span>
              )}

              {/* DNC */}
              {phone.doNotCall && (
                <span className="text-[0.6rem] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 border border-red-300">
                  DNC
                </span>
              )}

              {/* TCPA litigator */}
              {phone.litigator && (
                <span className="text-[0.6rem] font-bold px-1.5 py-0.5 rounded bg-red-600 text-white flex items-center gap-0.5">
                  <ShieldAlert className="w-2.5 h-2.5" /> TCPA
                </span>
              )}

              <CopyButton text={phone.number} />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[0.78rem] text-gray-400 mb-3">No phone numbers found</p>
      )}

      {/* Emails */}
      {result.emails.length > 0 && (
        <div className="space-y-2 mb-3">
          {result.emails.map((email, i) => (
            <div key={i} className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-gray-400" />
              <a href={`mailto:${email.address}`} className="text-[0.82rem] text-[#2563EB] hover:underline no-underline">{email.address}</a>
              {email.verified && (
                <span title="Verified"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /></span>
              )}
              <CopyButton text={email.address} />
            </div>
          ))}
        </div>
      )}

      {/* Mailing address */}
      {result.mailingAddress && (
        <div className="flex items-start gap-2 mb-3">
          <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5" />
          <div>
            <div className="text-[0.82rem] text-[rgba(5,14,36,0.65)]">{result.mailingAddress.line1}</div>
            <div className="text-[0.74rem] text-gray-400">{result.mailingAddress.city}, {result.mailingAddress.state} {result.mailingAddress.zip}</div>
          </div>
          <CopyButton text={`${result.mailingAddress.line1}, ${result.mailingAddress.city}, ${result.mailingAddress.state} ${result.mailingAddress.zip}`} />
        </div>
      )}

      {/* DNC/TCPA warning banner */}
      {(result.hasDoNotCall || result.hasLitigator) && (
        <div className={`rounded-[8px] p-2.5 mt-2 ${result.hasLitigator ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'}`}>
          <div className="flex items-start gap-2">
            <ShieldOff className={`w-4 h-4 flex-shrink-0 mt-0.5 ${result.hasLitigator ? 'text-red-500' : 'text-amber-500'}`} />
            <div>
              {result.hasLitigator && (
                <p className="text-[0.74rem] font-medium text-red-700 mb-0.5">
                  TCPA litigator detected. Do not call without express written consent.
                </p>
              )}
              {result.hasDoNotCall && !result.hasLitigator && (
                <p className="text-[0.74rem] font-medium text-amber-700">
                  DNC-flagged number detected. Use direct mail instead.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Start Outreach button */}
      {result.phones.length > 0 && (
        <a
          href={`/outreach?phone=${encodeURIComponent(result.phones[0].number)}&name=${encodeURIComponent(result.ownerName)}`}
          className="mt-3 w-full flex items-center justify-center gap-2 bg-[#F97316] hover:bg-[#EA580C] text-white font-[600] border-0 rounded-[8px] px-4 py-2.5 text-[0.82rem] cursor-pointer transition-colors no-underline"
        >
          <Phone className="w-4 h-4" /> Start Outreach
        </a>
      )}

      {usageBar}
    </div>
  )
}
