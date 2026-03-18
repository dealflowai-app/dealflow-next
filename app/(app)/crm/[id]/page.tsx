'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeft, Phone, Mail, MapPin, Home, Copy, Check,
  RefreshCw, Loader2, X, Tag, Pencil, Archive, PhoneOutgoing,
  Send, Clock, Circle, FileSignature, Users, UserPlus, Upload,
  Plus, Sparkles, ChevronDown, MessageSquare, AlertTriangle,
} from 'lucide-react'
import ClickToCall from '@/components/outreach/ClickToCall'

/* ═══════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════ */
interface BuyerDetail {
  id: string
  firstName: string | null
  lastName: string | null
  entityName: string | null
  entityType: string | null
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  cashPurchaseCount: number
  primaryPropertyType: string | null
  status: string
  contactEnriched: boolean
  notes: string | null
  buyerScore: number
  lastContactedAt: string | null
  lastVerifiedAt: string | null
  preferredMarkets: string[]
  preferredTypes: string[]
  strategy: string | null
  minPrice: number | null
  maxPrice: number | null
  closeSpeedDays: number | null
  proofOfFundsVerified: boolean
  scorePinned: boolean
  scoreOverride: number | null
  scoreAdjustment: number
  customTags: string[]
  aiInsight: string | null
  aiInsightGeneratedAt: string | null
  // Wholesaler fields
  motivation: string | null
  buyerType: string | null
  fundingSource: string | null
  conditionPreference: string | null
  communicationPref: string | null
  preferredZips: string[]
  portfolioSize: number | null
  avgPurchasePrice: number | null
  followUpDate: string | null
  source: string | null
  assignedTo: string | null
  createdAt: string
  updatedAt: string
  tags?: Array<{ id: string; autoApplied: boolean; tagId: string; tag: { id: string; name: string; label: string; color: string; type: string } }>
  campaignCalls?: Array<{
    id: string; outcome: string | null; durationSecs: number | null; aiSummary: string | null
    transcript: string | null; createdAt: string; campaign?: { name: string }
  }>
  dealMatches?: Array<{
    id: string; matchScore: number; outreachSent: boolean; outreachSentAt: string | null
    createdAt: string; deal: { id: string; address: string; city: string; state: string; askingPrice: number; arv: number | null; propertyType: string }
  }>
  offers?: Array<{
    id: string; amount: number; status: string; createdAt: string; deal: { address: string; city: string; state: string }
  }>
  inboundCalls?: Array<{
    id: string; fromPhone: string; routedTo: string; status: string; duration: number | null
    outcome: string | null; aiSummary: string | null; recordingUrl: string | null; notes: string | null; createdAt: string
  }>
}

interface TimelineEvent {
  id: string; type: string; title: string; detail: string | null; createdAt: string
}

interface ScoreData {
  transactionScore: number; recencyScore: number; responsivenessScore: number
  completenessScore: number; engagementScore: number; closingScore: number
  total: number; tagBonus: number; manualAdjustment: number
}

/* ═══════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════ */
function buyerName(b: BuyerDetail) {
  if (b.entityName) return b.entityName
  return [b.firstName, b.lastName].filter(Boolean).join(' ') || 'Unnamed Buyer'
}

function scoreGrade(s: number) { return s >= 90 ? 'A' : s >= 70 ? 'B' : s >= 50 ? 'C' : 'D' }
function scoreColor(g: string) {
  switch (g) {
    case 'A': return 'text-emerald-700 bg-emerald-50 border-emerald-200'
    case 'B': return 'text-blue-700 bg-blue-50 border-blue-200'
    case 'C': return 'text-amber-700 bg-amber-50 border-amber-200'
    default: return 'text-red-700 bg-red-50 border-red-200'
  }
}

function statusStyle(s: string) {
  switch (s) {
    case 'HIGH_CONFIDENCE': return 'text-emerald-700 bg-emerald-50'
    case 'RECENTLY_VERIFIED': return 'text-blue-700 bg-blue-50'
    case 'ACTIVE': return 'text-gray-700 bg-gray-100'
    case 'DORMANT': return 'text-amber-700 bg-amber-50'
    case 'DO_NOT_CALL': return 'text-red-700 bg-red-50'
    default: return 'text-gray-700 bg-gray-100'
  }
}

function displayStatus(s: string) { return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }

function motivationStyle(m: string | null) {
  switch (m) {
    case 'HOT': return 'text-red-700 bg-red-50 border-red-200'
    case 'WARM': return 'text-orange-700 bg-orange-50 border-orange-200'
    case 'COLD': return 'text-blue-700 bg-blue-50 border-blue-200'
    case 'NOT_INTERESTED': return 'text-gray-600 bg-gray-100 border-gray-200'
    case 'DNC': return 'text-red-800 bg-red-100 border-red-300'
    default: return 'text-gray-500 bg-gray-50 border-gray-200'
  }
}

function motivationLabel(m: string | null) {
  switch (m) {
    case 'HOT': return 'Hot'
    case 'WARM': return 'Warm'
    case 'COLD': return 'Cold'
    case 'NOT_INTERESTED': return 'Not Interested'
    case 'DNC': return 'Do Not Contact'
    default: return 'Unrated'
  }
}

function motivationDot(m: string | null) {
  switch (m) {
    case 'HOT': return 'bg-red-500'
    case 'WARM': return 'bg-orange-400'
    case 'COLD': return 'bg-blue-400'
    case 'NOT_INTERESTED': return 'bg-gray-400'
    case 'DNC': return 'bg-red-700'
    default: return 'bg-gray-300'
  }
}

const ENUM_OPTIONS = {
  motivation: [
    { value: 'HOT', label: 'Hot — Ready to buy' },
    { value: 'WARM', label: 'Warm — Interested' },
    { value: 'COLD', label: 'Cold — Not active' },
    { value: 'NOT_INTERESTED', label: 'Not Interested' },
    { value: 'DNC', label: 'Do Not Contact' },
  ],
  buyerType: [
    { value: 'CASH_BUYER', label: 'Cash Buyer' },
    { value: 'FLIPPER', label: 'Flipper' },
    { value: 'LANDLORD', label: 'Landlord / Buy & Hold' },
    { value: 'WHOLESALER', label: 'Wholesaler' },
    { value: 'DEVELOPER', label: 'Developer' },
    { value: 'OWNER_OCCUPANT', label: 'Owner Occupant' },
    { value: 'HEDGE_FUND', label: 'Hedge Fund / Institution' },
  ],
  fundingSource: [
    { value: 'CASH', label: 'Cash' },
    { value: 'HARD_MONEY', label: 'Hard Money' },
    { value: 'CONVENTIONAL', label: 'Conventional Loan' },
    { value: 'PRIVATE_MONEY', label: 'Private Money' },
    { value: 'SELF_DIRECTED_IRA', label: 'Self-Directed IRA' },
    { value: 'LINE_OF_CREDIT', label: 'Line of Credit' },
  ],
  conditionPreference: [
    { value: 'TURNKEY', label: 'Turnkey / Move-In Ready' },
    { value: 'LIGHT_REHAB', label: 'Light Rehab' },
    { value: 'HEAVY_REHAB', label: 'Heavy Rehab' },
    { value: 'TEARDOWN', label: 'Teardown' },
    { value: 'ANY', label: 'Any Condition' },
  ],
  communicationPref: [
    { value: 'CALL', label: 'Phone Call' },
    { value: 'TEXT', label: 'Text / SMS' },
    { value: 'EMAIL', label: 'Email' },
    { value: 'ANY', label: 'Any' },
  ],
  source: [
    'Driving for Dollars', 'Referral', 'Cash Buyer List', 'Tax Records',
    'Auction', 'Networking Event', 'Social Media', 'Cold Call', 'Inbound Lead', 'Other',
  ],
}

function formatPrice(n: number | null) {
  if (n == null) return '—'
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `$${Math.round(n / 1000)}k`
  return `$${n}`
}

function relativeTime(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function tlIcon(type: string) {
  switch (type) {
    case 'call': case 'call_completed': case 'phone': return <Phone className="w-3.5 h-3.5 text-blue-500" />
    case 'email': return <Mail className="w-3.5 h-3.5 text-violet-500" />
    case 'deal': case 'deal_matched': case 'deal_match': return <Home className="w-3.5 h-3.5 text-purple-500" />
    case 'offer': case 'offer_made': return <Send className="w-3.5 h-3.5 text-emerald-500" />
    case 'status_changed': return <RefreshCw className="w-3.5 h-3.5 text-amber-500" />
    case 'contract': return <FileSignature className="w-3.5 h-3.5 text-emerald-500" />
    case 'score_updated': return <RefreshCw className="w-3.5 h-3.5 text-blue-500" />
    case 'merged': return <Users className="w-3.5 h-3.5 text-violet-500" />
    case 'tag_added': case 'tag_removed': return <Tag className="w-3.5 h-3.5 text-cyan-500" />
    case 'created': return <UserPlus className="w-3.5 h-3.5 text-emerald-500" />
    case 'imported': return <Upload className="w-3.5 h-3.5 text-blue-500" />
    case 'note_added': return <MessageSquare className="w-3.5 h-3.5 text-gray-500" />
    case 'edited': return <Pencil className="w-3.5 h-3.5 text-gray-400" />
    default: return <Circle className="w-3.5 h-3.5 text-gray-400" />
  }
}

function tlColor(type: string) {
  if (['call', 'call_completed', 'phone'].includes(type)) return 'border-blue-300'
  if (['deal', 'deal_matched', 'deal_match'].includes(type)) return 'border-purple-300'
  if (['offer', 'offer_made', 'contract'].includes(type)) return 'border-emerald-300'
  if (['status_changed'].includes(type)) return 'border-amber-300'
  return 'border-gray-200'
}

/* ═══════════════════════════════════════════════
   COPY TO CLIPBOARD BUTTON
   ═══════════════════════════════════════════════ */
function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      className="p-1 rounded hover:bg-gray-200 bg-transparent border-0 cursor-pointer transition-colors"
      title="Copy"
    >
      {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-gray-400" />}
    </button>
  )
}

/* ═══════════════════════════════════════════════
   NOTE COMPOSER
   ═══════════════════════════════════════════════ */
function NoteComposer({ buyerId, onNoteAdded }: { buyerId: string; onNoteAdded: () => void }) {
  const [text, setText] = useState('')
  const [focused, setFocused] = useState(false)
  const [saving, setSaving] = useState(false)
  const [flash, setFlash] = useState(false)

  async function save() {
    if (!text.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/crm/buyers/${buyerId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() }),
      })
      if (!res.ok) throw new Error('Failed to save note')
      setText('')
      setFocused(false)
      setFlash(true)
      setTimeout(() => setFlash(false), 1000)
      onNoteAdded()
    } catch {
      // silently fail
    } finally {
      setSaving(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      save()
    }
  }

  return (
    <div className={`rounded-lg border transition-all ${flash ? 'border-emerald-400 bg-emerald-50' : focused ? 'border-[#2563EB] bg-white' : 'border-gray-200 bg-gray-50'}`}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => { if (!text.trim()) setFocused(false) }}
        onKeyDown={handleKeyDown}
        rows={focused ? 4 : 1}
        placeholder="Add a note about this buyer..."
        className="w-full px-3 py-2.5 text-[0.82rem] bg-transparent border-0 outline-none resize-none"
        maxLength={5000}
      />
      {focused && (
        <div className="flex items-center justify-between px-3 pb-2">
          <span className="text-[0.68rem] text-gray-400">{text.length}/5000 &middot; Cmd+Enter to save</span>
          <button
            onClick={save}
            disabled={saving || !text.trim()}
            className="text-[0.74rem] text-white bg-[#2563EB] hover:bg-[#1D4ED8] border-0 rounded-md px-3 py-1.5 cursor-pointer disabled:opacity-50 flex items-center gap-1"
          >
            {saving && <Loader2 className="w-3 h-3 animate-spin" />}
            Save Note
          </button>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════
   TAB COMPONENT
   ═══════════════════════════════════════════════ */
const TABS = ['Overview', 'Timeline', 'Deals', 'Calls', 'Intelligence', 'Callbacks', 'Notes'] as const
type TabName = typeof TABS[number]

function TabBar({ active, onChange }: { active: TabName; onChange: (t: TabName) => void }) {
  return (
    <div className="flex border-b border-gray-200">
      {TABS.map(t => (
        <button
          key={t}
          onClick={() => onChange(t)}
          data-active={active === t}
          className={`px-4 py-2.5 text-[0.82rem] font-medium border-b-2 -mb-px bg-transparent cursor-pointer crm-tab ${active === t ? 'border-[#2563EB] text-[#2563EB]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          {t}
        </button>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════
   AI INSIGHTS CARD
   ═══════════════════════════════════════════════ */
function AiInsightsCard({ buyerId, cached }: { buyerId: string; cached: { insight: string | null; generatedAt: string | null } }) {
  const [insight, setInsight] = useState(cached.insight)
  const [generatedAt, setGeneratedAt] = useState(cached.generatedAt)
  const [loading, setLoading] = useState(false)
  const [noKey, setNoKey] = useState(false)

  async function generate(force: boolean) {
    setLoading(true)
    setNoKey(false)
    try {
      const res = await fetch(`/api/crm/buyers/${buyerId}/insights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force }),
      })
      const data = await res.json()
      if (res.status === 503) { setNoKey(true); return }
      if (!res.ok) return
      setInsight(data.insight)
      setGeneratedAt(data.generatedAt)
    } finally {
      setLoading(false)
    }
  }

  if (noKey) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-gray-400" />
          <span className="text-[0.82rem] font-medium text-gray-500">AI Insight</span>
        </div>
        <p className="text-[0.78rem] text-gray-400">Set up your Anthropic API key to enable AI insights.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-500" />
          <span className="text-[0.82rem] font-medium text-blue-700">Generating AI Insight...</span>
        </div>
        <div className="space-y-2 animate-pulse">
          <div className="h-3 bg-blue-100 rounded w-full" />
          <div className="h-3 bg-blue-100 rounded w-5/6" />
          <div className="h-3 bg-blue-100 rounded w-4/6" />
        </div>
      </div>
    )
  }

  if (!insight) {
    return (
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-500" />
            <span className="text-[0.82rem] font-medium text-blue-700">AI Insight</span>
          </div>
          <button onClick={() => generate(false)} className="text-[0.74rem] text-blue-600 hover:text-blue-800 bg-white border border-blue-200 rounded-md px-3 py-1.5 cursor-pointer">
            Generate Insight
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-500" />
          <span className="text-[0.82rem] font-medium text-blue-700">AI Insight</span>
          {generatedAt && <span className="text-[0.66rem] text-blue-400">{relativeTime(generatedAt)}</span>}
        </div>
        <button onClick={() => generate(true)} className="text-[0.68rem] text-blue-500 hover:text-blue-700 bg-transparent border-0 cursor-pointer flex items-center gap-1">
          <RefreshCw className="w-3 h-3" /> Regenerate
        </button>
      </div>
      <p className="text-[0.82rem] text-blue-900 leading-relaxed whitespace-pre-wrap">{insight}</p>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   MANUAL SCORE + MOTIVATION CARD
   ═══════════════════════════════════════════════ */
function ScoreMotivationCard({ buyerId, currentScore, currentMotivation, onUpdated }: {
  buyerId: string; currentScore: number; currentMotivation: string | null; onUpdated: () => void
}) {
  const [score, setScore] = useState(currentScore)
  const [motivation, setMotivation] = useState(currentMotivation || '')
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  useEffect(() => { setScore(currentScore); setMotivation(currentMotivation || ''); setDirty(false) }, [currentScore, currentMotivation])

  function handleScoreChange(v: number) {
    setScore(Math.max(0, Math.min(100, v)))
    setDirty(true)
  }

  function handleMotivationChange(v: string) {
    setMotivation(v)
    setDirty(true)
  }

  async function save() {
    setSaving(true)
    try {
      const payload: Record<string, unknown> = { buyerScore: score }
      if (motivation) payload.motivation = motivation
      else payload.motivation = null
      const res = await fetch(`/api/crm/buyers/${buyerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) { setDirty(false); onUpdated() }
    } finally {
      setSaving(false)
    }
  }

  const grade = scoreGrade(score)
  const gradeColor = scoreColor(grade)

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      {/* Score */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Buyer Score</span>
        <span className={`text-[0.72rem] font-bold px-2 py-0.5 rounded-full border ${gradeColor}`}>{grade}</span>
      </div>
      <div className="flex items-center gap-3 mb-4">
        <input
          type="range"
          min={0} max={100} value={score}
          onChange={e => handleScoreChange(Number(e.target.value))}
          className="flex-1 h-2 accent-[#2563EB] cursor-pointer"
        />
        <input
          type="number"
          min={0} max={100} value={score}
          onChange={e => handleScoreChange(Number(e.target.value))}
          className="w-14 text-center text-lg font-bold text-gray-900 border border-gray-200 rounded-md py-1 outline-none focus:border-[#2563EB]"
        />
      </div>

      {/* Motivation */}
      <div className="mb-4">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider block mb-2">Motivation Level</span>
        <div className="grid grid-cols-2 gap-1.5">
          {ENUM_OPTIONS.motivation.map(m => (
            <button
              key={m.value}
              onClick={() => handleMotivationChange(motivation === m.value ? '' : m.value)}
              className={`flex items-center gap-1.5 px-2.5 py-2 rounded-md text-[0.74rem] font-medium border cursor-pointer crm-btn ${
                motivation === m.value
                  ? motivationStyle(m.value) + ' border-current'
                  : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}
            >
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${motivationDot(m.value)}`} />
              {motivationLabel(m.value)}
            </button>
          ))}
        </div>
      </div>

      {dirty && (
        <button onClick={save} disabled={saving} className="w-full text-[0.78rem] text-white bg-[#2563EB] hover:bg-[#1D4ED8] border-0 rounded-md py-2.5 cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 font-medium crm-btn">
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {saving ? 'Saving...' : 'Save Score & Motivation'}
        </button>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════
   OVERVIEW TAB
   ═══════════════════════════════════════════════ */
function OverviewTab({ buyer, editing, editForm, setEditForm, onSave, onCancel, saving }: {
  buyer: BuyerDetail
  editing: boolean
  editForm: Record<string, string>
  setEditForm: React.Dispatch<React.SetStateAction<Record<string, string>>>
  onSave: () => void
  onCancel: () => void
  saving: boolean
}) {
  const totalCalls = buyer.campaignCalls?.length ?? 0
  const totalMatches = buyer.dealMatches?.length ?? 0
  const totalOffers = buyer.offers?.length ?? 0
  const closedDeals = buyer.offers?.filter(o => o.status === 'ACCEPTED').length ?? 0

  if (editing) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5">
          <span className="text-[0.78rem] text-blue-700 font-medium">Editing buyer profile</span>
          <div className="flex gap-2">
            <button onClick={onCancel} disabled={saving} className="text-[0.74rem] text-gray-600 bg-white border border-gray-200 rounded-md px-3 py-1.5 cursor-pointer hover:bg-gray-50">Cancel</button>
            <button onClick={onSave} disabled={saving} className="text-[0.74rem] text-white bg-[#2563EB] hover:bg-[#1D4ED8] border-0 rounded-md px-3 py-1.5 cursor-pointer disabled:opacity-50 flex items-center gap-1">
              {saving && <Loader2 className="w-3 h-3 animate-spin" />}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Contact Info</div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'firstName', label: 'First Name' },
              { key: 'lastName', label: 'Last Name' },
              { key: 'entityName', label: 'Entity Name' },
              { key: 'phone', label: 'Phone' },
              { key: 'email', label: 'Email' },
              { key: 'address', label: 'Address' },
              { key: 'city', label: 'City' },
              { key: 'state', label: 'State' },
              { key: 'zip', label: 'Zip' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-[0.72rem] text-gray-500 mb-1 block">{f.label}</label>
                <input value={editForm[f.key] || ''} onChange={e => setEditForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className="w-full border border-gray-200 rounded-md px-2.5 py-1.5 text-[0.82rem] outline-none focus:border-[#2563EB]" />
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Buy Box</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[0.72rem] text-gray-500 mb-1 block">Strategy</label>
              <select value={editForm.strategy || ''} onChange={e => setEditForm(p => ({ ...p, strategy: e.target.value }))}
                className="w-full border border-gray-200 rounded-md px-2.5 py-1.5 text-[0.82rem] outline-none focus:border-[#2563EB] bg-white">
                <option value="">None</option>
                <option value="FLIP">Flip</option><option value="HOLD">Hold</option>
                <option value="BOTH">Both</option><option value="LAND">Land</option>
                <option value="COMMERCIAL">Commercial</option>
              </select>
            </div>
            <div>
              <label className="text-[0.72rem] text-gray-500 mb-1 block">Status</label>
              <select value={editForm.status || 'ACTIVE'} onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))}
                className="w-full border border-gray-200 rounded-md px-2.5 py-1.5 text-[0.82rem] outline-none focus:border-[#2563EB] bg-white">
                <option value="ACTIVE">Active</option><option value="DORMANT">Dormant</option>
                <option value="HIGH_CONFIDENCE">High Confidence</option><option value="RECENTLY_VERIFIED">Recently Verified</option>
                <option value="DO_NOT_CALL">Do Not Call</option>
              </select>
            </div>
            {[
              { key: 'minPrice', label: 'Min Price', type: 'number' },
              { key: 'maxPrice', label: 'Max Price', type: 'number' },
              { key: 'closeSpeedDays', label: 'Close Speed (days)', type: 'number' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-[0.72rem] text-gray-500 mb-1 block">{f.label}</label>
                <input type={f.type} value={editForm[f.key] || ''} onChange={e => setEditForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className="w-full border border-gray-200 rounded-md px-2.5 py-1.5 text-[0.82rem] outline-none focus:border-[#2563EB]" />
              </div>
            ))}
          </div>
        </div>

        {/* Buyer Profile */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Buyer Profile</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[0.72rem] text-gray-500 mb-1 block">Buyer Type</label>
              <select value={editForm.buyerType || ''} onChange={e => setEditForm(p => ({ ...p, buyerType: e.target.value }))}
                className="w-full border border-gray-200 rounded-md px-2.5 py-1.5 text-[0.82rem] outline-none focus:border-[#2563EB] bg-white">
                <option value="">Select...</option>
                {ENUM_OPTIONS.buyerType.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[0.72rem] text-gray-500 mb-1 block">Funding Source</label>
              <select value={editForm.fundingSource || ''} onChange={e => setEditForm(p => ({ ...p, fundingSource: e.target.value }))}
                className="w-full border border-gray-200 rounded-md px-2.5 py-1.5 text-[0.82rem] outline-none focus:border-[#2563EB] bg-white">
                <option value="">Select...</option>
                {ENUM_OPTIONS.fundingSource.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[0.72rem] text-gray-500 mb-1 block">Condition Preference</label>
              <select value={editForm.conditionPreference || ''} onChange={e => setEditForm(p => ({ ...p, conditionPreference: e.target.value }))}
                className="w-full border border-gray-200 rounded-md px-2.5 py-1.5 text-[0.82rem] outline-none focus:border-[#2563EB] bg-white">
                <option value="">Select...</option>
                {ENUM_OPTIONS.conditionPreference.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[0.72rem] text-gray-500 mb-1 block">Communication Preference</label>
              <select value={editForm.communicationPref || ''} onChange={e => setEditForm(p => ({ ...p, communicationPref: e.target.value }))}
                className="w-full border border-gray-200 rounded-md px-2.5 py-1.5 text-[0.82rem] outline-none focus:border-[#2563EB] bg-white">
                <option value="">Select...</option>
                {ENUM_OPTIONS.communicationPref.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[0.72rem] text-gray-500 mb-1 block">Entity Type</label>
              <select value={editForm.entityType || ''} onChange={e => setEditForm(p => ({ ...p, entityType: e.target.value }))}
                className="w-full border border-gray-200 rounded-md px-2.5 py-1.5 text-[0.82rem] outline-none focus:border-[#2563EB] bg-white">
                <option value="">Select...</option>
                <option value="individual">Individual</option>
                <option value="llc">LLC</option>
                <option value="corporation">Corporation</option>
                <option value="trust">Trust</option>
              </select>
            </div>
            <div>
              <label className="text-[0.72rem] text-gray-500 mb-1 block">Portfolio Size</label>
              <input type="number" value={editForm.portfolioSize || ''} onChange={e => setEditForm(p => ({ ...p, portfolioSize: e.target.value }))}
                placeholder="# of properties" className="w-full border border-gray-200 rounded-md px-2.5 py-1.5 text-[0.82rem] outline-none focus:border-[#2563EB]" />
            </div>
            <div>
              <label className="text-[0.72rem] text-gray-500 mb-1 block">Avg Purchase Price</label>
              <input type="number" value={editForm.avgPurchasePrice || ''} onChange={e => setEditForm(p => ({ ...p, avgPurchasePrice: e.target.value }))}
                placeholder="$" className="w-full border border-gray-200 rounded-md px-2.5 py-1.5 text-[0.82rem] outline-none focus:border-[#2563EB]" />
            </div>
            <div>
              <label className="text-[0.72rem] text-gray-500 mb-1 block">Lead Source</label>
              <select value={editForm.source || ''} onChange={e => setEditForm(p => ({ ...p, source: e.target.value }))}
                className="w-full border border-gray-200 rounded-md px-2.5 py-1.5 text-[0.82rem] outline-none focus:border-[#2563EB] bg-white">
                <option value="">Select...</option>
                {ENUM_OPTIONS.source.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[0.72rem] text-gray-500 mb-1 block">Preferred Zips</label>
              <input value={editForm.preferredZips || ''} onChange={e => setEditForm(p => ({ ...p, preferredZips: e.target.value }))}
                placeholder="75201, 75202, ..." className="w-full border border-gray-200 rounded-md px-2.5 py-1.5 text-[0.82rem] outline-none focus:border-[#2563EB]" />
            </div>
            <div>
              <label className="text-[0.72rem] text-gray-500 mb-1 block">Follow-Up Date</label>
              <input type="date" value={editForm.followUpDate || ''} onChange={e => setEditForm(p => ({ ...p, followUpDate: e.target.value }))}
                className="w-full border border-gray-200 rounded-md px-2.5 py-1.5 text-[0.82rem] outline-none focus:border-[#2563EB]" />
            </div>
            <div>
              <label className="text-[0.72rem] text-gray-500 mb-1 block">Assigned To</label>
              <input value={editForm.assignedTo || ''} onChange={e => setEditForm(p => ({ ...p, assignedTo: e.target.value }))}
                placeholder="Team member" className="w-full border border-gray-200 rounded-md px-2.5 py-1.5 text-[0.82rem] outline-none focus:border-[#2563EB]" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Notes</div>
          <textarea value={editForm.notes || ''} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))}
            rows={4} className="w-full border border-gray-200 rounded-md px-3 py-2 text-[0.82rem] outline-none focus:border-[#2563EB] resize-y"
            placeholder="Notes about this buyer..." />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Contact Info Card */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Contact Info</div>
        <div className="space-y-2.5">
          {buyer.phone && (
            <div className="flex items-center justify-between">
              <span className="text-[0.82rem] text-gray-500 flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> Phone</span>
              <span className="text-[0.82rem] text-gray-900 flex items-center gap-1.5">{buyer.phone} <CopyBtn text={buyer.phone} /> <ClickToCall buyerId={buyer.id} buyerName={buyerName(buyer)} phone={buyer.phone} compact /></span>
            </div>
          )}
          {buyer.email && (
            <div className="flex items-center justify-between">
              <span className="text-[0.82rem] text-gray-500 flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> Email</span>
              <span className="text-[0.82rem] text-gray-900 flex items-center gap-1.5">{buyer.email} <CopyBtn text={buyer.email} /></span>
            </div>
          )}
          {(buyer.address || buyer.city) && (
            <div className="flex items-center justify-between">
              <span className="text-[0.82rem] text-gray-500 flex items-center gap-2"><MapPin className="w-3.5 h-3.5" /> Address</span>
              <span className="text-[0.82rem] text-gray-700 text-right max-w-[60%]">
                {[buyer.address, buyer.city, buyer.state, buyer.zip].filter(Boolean).join(', ')}
              </span>
            </div>
          )}
          {!buyer.phone && !buyer.email && !buyer.address && (
            <p className="text-[0.78rem] text-gray-400">No contact info on file.</p>
          )}
        </div>
      </div>

      {/* Buy Box Card */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Buy Box</div>
        <div className="grid grid-cols-2 gap-y-2.5">
          <div><span className="text-[0.74rem] text-gray-400">Types</span><div className="text-[0.82rem] text-gray-900">{buyer.preferredTypes?.join(', ') || '—'}</div></div>
          <div><span className="text-[0.74rem] text-gray-400">Strategy</span><div className="text-[0.82rem] text-gray-900">{buyer.strategy || '—'}</div></div>
          <div><span className="text-[0.74rem] text-gray-400">Price Range</span><div className="text-[0.82rem] text-gray-900 font-medium">{formatPrice(buyer.minPrice)} – {formatPrice(buyer.maxPrice)}</div></div>
          <div><span className="text-[0.74rem] text-gray-400">Close Speed</span><div className="text-[0.82rem] text-gray-900">{buyer.closeSpeedDays ? `${buyer.closeSpeedDays} days` : '—'}</div></div>
          <div><span className="text-[0.74rem] text-gray-400">Markets</span><div className="text-[0.82rem] text-gray-900">{buyer.preferredMarkets?.join(', ') || '—'}</div></div>
          <div><span className="text-[0.74rem] text-gray-400">Proof of Funds</span><div className={`text-[0.78rem] font-medium ${buyer.proofOfFundsVerified ? 'text-emerald-600' : 'text-gray-400'}`}>{buyer.proofOfFundsVerified ? 'Verified' : 'Unverified'}</div></div>
        </div>
      </div>

      {/* Buyer Profile Card */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Buyer Profile</div>
        <div className="grid grid-cols-2 gap-y-2.5">
          <div><span className="text-[0.74rem] text-gray-400">Buyer Type</span><div className="text-[0.82rem] text-gray-900">{buyer.buyerType ? displayStatus(buyer.buyerType) : '—'}</div></div>
          <div><span className="text-[0.74rem] text-gray-400">Funding</span><div className="text-[0.82rem] text-gray-900">{buyer.fundingSource ? displayStatus(buyer.fundingSource) : '—'}</div></div>
          <div><span className="text-[0.74rem] text-gray-400">Condition Pref</span><div className="text-[0.82rem] text-gray-900">{buyer.conditionPreference ? displayStatus(buyer.conditionPreference) : '—'}</div></div>
          <div><span className="text-[0.74rem] text-gray-400">Contact Via</span><div className="text-[0.82rem] text-gray-900">{buyer.communicationPref ? displayStatus(buyer.communicationPref) : '—'}</div></div>
          <div><span className="text-[0.74rem] text-gray-400">Portfolio Size</span><div className="text-[0.82rem] text-gray-900">{buyer.portfolioSize != null ? `${buyer.portfolioSize} properties` : '—'}</div></div>
          <div><span className="text-[0.74rem] text-gray-400">Avg Purchase</span><div className="text-[0.82rem] text-gray-900 font-medium">{formatPrice(buyer.avgPurchasePrice)}</div></div>
          <div><span className="text-[0.74rem] text-gray-400">Lead Source</span><div className="text-[0.82rem] text-gray-900">{buyer.source || '—'}</div></div>
          <div><span className="text-[0.74rem] text-gray-400">Assigned To</span><div className="text-[0.82rem] text-gray-900">{buyer.assignedTo || '—'}</div></div>
          {buyer.preferredZips?.length > 0 && (
            <div className="col-span-2"><span className="text-[0.74rem] text-gray-400">Target Zips</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {buyer.preferredZips.map(z => (
                  <span key={z} className="text-[0.68rem] text-gray-600 bg-gray-100 rounded-full px-2 py-0.5">{z}</span>
                ))}
              </div>
            </div>
          )}
          {buyer.followUpDate && (
            <div className="col-span-2"><span className="text-[0.74rem] text-gray-400">Next Follow-Up</span>
              <div className="text-[0.82rem] text-gray-900 font-medium flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                {new Date(buyer.followUpDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Calls', value: totalCalls },
          { label: 'Matched', value: totalMatches },
          { label: 'Offers', value: totalOffers },
          { label: 'Closed', value: closedDeals },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-gray-900">{s.value}</div>
            <div className="text-[0.68rem] text-gray-400 uppercase tracking-wider">{s.label}</div>
          </div>
        ))}
      </div>

      {/* AI Insight */}
      <AiInsightsCard buyerId={buyer.id} cached={{ insight: buyer.aiInsight, generatedAt: buyer.aiInsightGeneratedAt }} />

      {/* Notes */}
      {buyer.notes && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Notes</div>
          <p className="text-[0.82rem] text-gray-700 whitespace-pre-wrap">{buyer.notes}</p>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════
   TIMELINE TAB
   ═══════════════════════════════════════════════ */
function TimelineTab({ buyerId }: { buyerId: string }) {
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (c?: string | null) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '20' })
      if (c) params.set('cursor', c)
      const res = await fetch(`/api/crm/buyers/${buyerId}/timeline?${params}`)
      if (!res.ok) return
      const data = await res.json()
      if (c) setEvents(prev => [...prev, ...data.events])
      else setEvents(data.events)
      setHasMore(data.pagination.hasMore)
      setCursor(data.pagination.nextCursor)
    } finally {
      setLoading(false)
    }
  }, [buyerId])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-4">
      <NoteComposer buyerId={buyerId} onNoteAdded={() => load()} />

      {!loading && events.length === 0 && (
        <p className="text-center text-sm text-gray-400 py-8">No activity yet</p>
      )}

      <div className="relative pl-6">
        {events.length > 0 && <div className="absolute left-[9px] top-2 bottom-2 w-px bg-gray-200" />}
        <div className="space-y-4">
          {events.map(e => (
            <div key={e.id} className="relative">
              <div className={`absolute left-[-24px] top-0.5 w-[18px] h-[18px] rounded-full bg-white border-2 ${tlColor(e.type)} flex items-center justify-center`}>
                {tlIcon(e.type)}
              </div>
              <div>
                <div className="text-[0.68rem] text-gray-400 mb-0.5">{relativeTime(e.createdAt)}</div>
                <div className="text-[0.82rem] text-gray-800 font-medium">{e.title}</div>
                {e.detail && <div className="text-[0.78rem] text-gray-500 mt-0.5 whitespace-pre-wrap">{e.detail}</div>}
              </div>
            </div>
          ))}
        </div>
        {hasMore && (
          <button onClick={() => load(cursor)} disabled={loading} className="mt-3 text-[0.78rem] text-[#2563EB] hover:text-[#1D4ED8] bg-transparent border-0 cursor-pointer flex items-center gap-1">
            {loading && <Loader2 className="w-3 h-3 animate-spin" />}
            {loading ? 'Loading...' : 'Load more'}
          </button>
        )}
      </div>

      {loading && events.length === 0 && (
        <div className="space-y-3 animate-pulse">
          {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-lg" />)}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════
   DEALS TAB
   ═══════════════════════════════════════════════ */
function DealsTab({ matches }: { matches: BuyerDetail['dealMatches'] }) {
  if (!matches || matches.length === 0) {
    return <p className="text-center text-sm text-gray-400 py-12">No deals matched to this buyer yet.</p>
  }

  return (
    <div className="space-y-3">
      {matches.map(m => (
        <div key={m.id} className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="text-[0.88rem] font-medium text-gray-900">{m.deal.address}</div>
              <div className="text-[0.74rem] text-gray-500">{m.deal.city}, {m.deal.state} &middot; {m.deal.propertyType}</div>
            </div>
            <div className="text-right">
              <div className="text-[0.74rem] text-gray-400">Match Score</div>
              <div className="text-[0.92rem] font-bold text-[#2563EB]">{m.matchScore}%</div>
            </div>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
            <div className="h-full bg-[#2563EB] rounded-full" style={{ width: `${m.matchScore}%` }} />
          </div>
          <div className="flex items-center gap-4 text-[0.74rem] text-gray-500">
            <span>Ask: {formatPrice(m.deal.askingPrice)}</span>
            <span>ARV: {formatPrice(m.deal.arv)}</span>
            {m.outreachSent && <span className="text-emerald-600">Outreach sent {m.outreachSentAt ? relativeTime(m.outreachSentAt) : ''}</span>}
            <span className="ml-auto">{relativeTime(m.createdAt)}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════
   CALLS TAB
   ═══════════════════════════════════════════════ */
function CallsTab({ calls, inboundCalls }: { calls: BuyerDetail['campaignCalls']; inboundCalls: BuyerDetail['inboundCalls'] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  // Merge outbound + inbound calls into unified timeline
  type UnifiedCall = { id: string; direction: 'outbound' | 'inbound'; outcome: string | null; duration: number | null; aiSummary: string | null; transcript?: string | null; campaign?: string; routedTo?: string; createdAt: string }

  const unified: UnifiedCall[] = [
    ...(calls || []).map(c => ({
      id: c.id, direction: 'outbound' as const, outcome: c.outcome, duration: c.durationSecs,
      aiSummary: c.aiSummary, transcript: c.transcript, campaign: c.campaign?.name, createdAt: c.createdAt,
    })),
    ...(inboundCalls || []).map(c => ({
      id: `inbound-${c.id}`, direction: 'inbound' as const, outcome: c.outcome, duration: c.duration,
      aiSummary: c.aiSummary || c.notes, routedTo: c.routedTo, createdAt: c.createdAt,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  if (unified.length === 0) {
    return <p className="text-center text-sm text-gray-400 py-12">No calls recorded yet.</p>
  }

  function toggle(id: string) {
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  function outcomeColor(o: string | null) {
    switch (o) {
      case 'QUALIFIED': return 'text-emerald-700 bg-emerald-50'
      case 'CALLBACK_REQUESTED': return 'text-blue-700 bg-blue-50'
      case 'NO_ANSWER': case 'VOICEMAIL': return 'text-amber-700 bg-amber-50'
      case 'NOT_INTERESTED': case 'WRONG_NUMBER': return 'text-red-700 bg-red-50'
      default: return 'text-gray-700 bg-gray-100'
    }
  }

  const ROUTE_LABELS: Record<string, string> = { ai: 'AI Answered', wholesaler: 'Forwarded', voicemail: 'Voicemail', missed: 'Missed' }

  return (
    <div className="space-y-3">
      {unified.map(c => (
        <div key={c.id} className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              {c.direction === 'inbound' ? (
                <span className="text-[0.65rem] font-medium px-1.5 py-0.5 rounded-full text-violet-700 bg-violet-50">Inbound</span>
              ) : (
                <span className="text-[0.65rem] font-medium px-1.5 py-0.5 rounded-full text-sky-700 bg-sky-50">AI Call</span>
              )}
              {c.outcome && (
                <span className={`text-[0.72rem] font-medium px-2 py-0.5 rounded-full ${outcomeColor(c.outcome)}`}>
                  {c.outcome.replace(/_/g, ' ')}
                </span>
              )}
              {c.direction === 'inbound' && c.routedTo && (
                <span className="text-[0.68rem] text-gray-400">{ROUTE_LABELS[c.routedTo] || c.routedTo}</span>
              )}
              {c.duration != null && c.duration > 0 && (
                <span className="text-[0.72rem] text-gray-400">{Math.floor(c.duration / 60)}m {c.duration % 60}s</span>
              )}
            </div>
            <span className="text-[0.72rem] text-gray-400">{relativeTime(c.createdAt)}</span>
          </div>
          {c.campaign && <p className="text-[0.72rem] text-gray-400">Campaign: {c.campaign}</p>}
          {c.aiSummary && <p className="text-[0.78rem] text-gray-600 mt-1">{c.aiSummary}</p>}
          {c.transcript && (
            <div className="mt-2">
              <button onClick={() => toggle(c.id)} className="text-[0.72rem] text-[#2563EB] bg-transparent border-0 cursor-pointer flex items-center gap-1">
                <ChevronDown className={`w-3 h-3 transition-transform ${expanded.has(c.id) ? 'rotate-180' : ''}`} />
                {expanded.has(c.id) ? 'Hide' : 'Show'} transcript
              </button>
              {expanded.has(c.id) && (
                <pre className="mt-2 p-3 bg-gray-50 rounded-md text-[0.72rem] text-gray-600 whitespace-pre-wrap max-h-60 overflow-y-auto">{c.transcript}</pre>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════
   CALLBACKS TAB (buyer-specific)
   ═══════════════════════════════════════════════ */
function BuyerCallbacksTab({ buyerId }: { buyerId: string }) {
  const [callbacks, setCallbacks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/api/outreach/callbacks?buyerId=${buyerId}&limit=50`)
        if (!res.ok) throw new Error()
        const data = await res.json()
        if (!cancelled) setCallbacks(data.data?.callbacks || [])
      } catch { /* ignore */ } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [buyerId])

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })

  const SOURCE_LABELS: Record<string, string> = {
    buyer_request: 'Buyer Request', ai_detected: 'AI Detected', manual: 'Manual', auto_retry: 'Auto Retry',
  }

  const STATUS_COLORS: Record<string, string> = {
    scheduled: 'text-blue-700 bg-blue-50',
    completed: 'text-emerald-700 bg-emerald-50',
    missed: 'text-red-700 bg-red-50',
    cancelled: 'text-gray-500 bg-gray-100',
  }

  if (loading) {
    return <div className="flex items-center justify-center py-12 text-gray-400"><Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading callbacks...</div>
  }

  if (callbacks.length === 0) {
    return (
      <div className="text-center py-12">
        <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p className="text-[0.82rem] text-gray-500">No scheduled callbacks for this buyer</p>
        <p className="text-[0.75rem] text-gray-400 mt-1">Callbacks are created when the buyer requests a call back during a campaign.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2 py-2">
      {callbacks.map((cb: any) => (
        <div key={cb.id} className={`border rounded-lg p-3 ${cb.status === 'scheduled' && new Date(cb.scheduledAt) < new Date() ? 'border-red-200 bg-red-50/30' : 'border-gray-200 bg-white'}`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className={`text-[0.68rem] font-medium px-1.5 py-0.5 rounded-full ${STATUS_COLORS[cb.status] || 'text-gray-500 bg-gray-100'}`}>
                {cb.status}
              </span>
              <span className="text-[0.78rem] text-gray-700">{formatTime(cb.scheduledAt)}</span>
              <span className={`text-[0.65rem] px-1.5 py-0.5 rounded-full ${
                cb.source === 'ai_detected' ? 'text-violet-600 bg-violet-50' : 'text-gray-500 bg-gray-100'
              }`}>
                {SOURCE_LABELS[cb.source] || cb.source}
              </span>
            </div>
            {cb.status === 'scheduled' && new Date(cb.scheduledAt) < new Date() && (
              <span className="text-[0.65rem] font-medium text-red-600">Overdue</span>
            )}
          </div>
          {cb.reason && <p className="text-[0.75rem] text-gray-500 mt-1">{cb.reason}</p>}
          {cb.notes && <p className="text-[0.72rem] text-gray-400 mt-0.5 italic">{cb.notes}</p>}
        </div>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════
   INTELLIGENCE TAB (buyer-specific)
   ═══════════════════════════════════════════════ */
function BuyerIntelligenceTab({ buyerId }: { buyerId: string }) {
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        // Fetch intelligence records for this buyer's calls
        const callsRes = await fetch(`/api/outreach/calls?buyerId=${buyerId}&limit=50`)
        if (!callsRes.ok) throw new Error()
        const callsData = await callsRes.json()
        const callIds: string[] = (callsData.data?.calls || callsData.calls || []).map((c: any) => c.id)

        if (callIds.length === 0) { if (!cancelled) { setRecords([]); setLoading(false) }; return }

        // Fetch intelligence for each call (in parallel, up to 10)
        const intelResults = await Promise.all(
          callIds.slice(0, 10).map(async (cid: string) => {
            try {
              const res = await fetch(`/api/outreach/intelligence/call/${cid}`)
              if (!res.ok) return null
              const json = await res.json()
              return json.data?.intelligence || null
            } catch { return null }
          })
        )

        if (!cancelled) setRecords(intelResults.filter(Boolean))
      } catch { /* ignore */ }
      finally { if (!cancelled) setLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [buyerId])

  if (loading) {
    return <div className="flex items-center justify-center py-12 text-gray-400"><Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading intelligence...</div>
  }

  if (records.length === 0) {
    return (
      <div className="text-center py-12">
        <Sparkles className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p className="text-[0.82rem] text-gray-500">No conversation intelligence yet</p>
        <p className="text-[0.72rem] text-gray-400 mt-1">Intelligence data appears after AI calls complete.</p>
      </div>
    )
  }

  // Aggregate across all calls
  const avgSentiment = Math.round(records.reduce((s, r) => s + (r.sentimentScore || 0), 0) / records.length)
  const avgEngagement = Math.round(records.reduce((s, r) => s + (r.engagementScore || 0), 0) / records.length)
  const sentimentTrend = records.map((r, i) => ({ call: i + 1, score: r.sentimentScore })).reverse()

  // Aggregate objections
  const objMap = new Map<string, number>()
  for (const r of records) {
    for (const obj of ((r.objections as any[]) || [])) {
      objMap.set(obj.objection, (objMap.get(obj.objection) || 0) + 1)
    }
  }
  const topObjections = Array.from(objMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5)

  // Aggregate buying signals
  const sigMap = new Map<string, number>()
  for (const r of records) {
    for (const sig of ((r.buyingSignals as any[]) || [])) {
      sigMap.set(sig.signal, (sigMap.get(sig.signal) || 0) + 1)
    }
  }
  const topSignals = Array.from(sigMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5)

  // Talk pattern
  const avgAiTalk = Math.round(records.reduce((s, r) => s + (r.aiTalkPercent || 50), 0) / records.length)
  const avgWords = Math.round(records.reduce((s, r) => s + (r.buyerTalkPercent || 50), 0) / records.length)

  return (
    <div className="space-y-5 py-2">
      {/* Summary row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="border border-gray-200 rounded-lg p-3 text-center">
          <div className={`text-[1.1rem] font-bold ${avgSentiment > 20 ? 'text-emerald-600' : avgSentiment < -20 ? 'text-red-600' : 'text-amber-600'}`}>
            {avgSentiment > 0 ? '+' : ''}{avgSentiment}
          </div>
          <div className="text-[0.65rem] text-gray-400">Avg Sentiment</div>
        </div>
        <div className="border border-gray-200 rounded-lg p-3 text-center">
          <div className="text-[1.1rem] font-bold text-gray-900">{avgEngagement}</div>
          <div className="text-[0.65rem] text-gray-400">Avg Engagement</div>
        </div>
        <div className="border border-gray-200 rounded-lg p-3 text-center">
          <div className="text-[1.1rem] font-bold text-gray-900">{records.length}</div>
          <div className="text-[0.65rem] text-gray-400">Calls Analyzed</div>
        </div>
      </div>

      {/* Sentiment trend */}
      {sentimentTrend.length > 1 && (
        <div>
          <h4 className="text-[0.78rem] font-medium text-gray-700 mb-2">Sentiment Over Conversations</h4>
          <div className="flex items-end gap-1 h-12">
            {sentimentTrend.map((pt, i) => (
              <div
                key={i}
                className={`flex-1 rounded-t ${pt.score > 10 ? 'bg-emerald-400' : pt.score < -10 ? 'bg-red-400' : 'bg-amber-300'}`}
                style={{ height: `${Math.max(15, Math.min(100, ((pt.score + 100) / 200) * 100))}%` }}
                title={`Call ${pt.call}: ${pt.score > 0 ? '+' : ''}${pt.score}`}
              />
            ))}
          </div>
          <div className="text-[0.62rem] text-gray-400 mt-1 text-right">
            {sentimentTrend.length > 1 && (sentimentTrend[sentimentTrend.length - 1].score > sentimentTrend[0].score
              ? 'Trending up — buyer is warming'
              : sentimentTrend[sentimentTrend.length - 1].score < sentimentTrend[0].score
              ? 'Trending down — buyer is cooling'
              : 'Stable sentiment')}
          </div>
        </div>
      )}

      {/* Top objections */}
      {topObjections.length > 0 && (
        <div>
          <h4 className="text-[0.78rem] font-medium text-gray-700 mb-2">Common Objections</h4>
          <div className="space-y-1">
            {topObjections.map(([objection, count], i) => (
              <div key={i} className="flex items-center justify-between text-[0.75rem]">
                <span className="text-gray-600">{objection}</span>
                <span className="text-gray-400">{count}x</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Buying signals */}
      {topSignals.length > 0 && (
        <div>
          <h4 className="text-[0.78rem] font-medium text-gray-700 mb-2">Buying Signals</h4>
          <div className="space-y-1">
            {topSignals.map(([signal, count], i) => (
              <div key={i} className="flex items-center justify-between text-[0.75rem]">
                <span className="text-gray-600">{signal}</span>
                <span className="text-gray-400">{count}x</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Talk pattern */}
      <div>
        <h4 className="text-[0.78rem] font-medium text-gray-700 mb-2">Talk Pattern</h4>
        <div className="flex h-4 rounded-full overflow-hidden">
          <div className="bg-blue-400 flex items-center justify-center" style={{ width: `${avgAiTalk}%` }}>
            <span className="text-[0.55rem] text-white font-medium">AI {avgAiTalk}%</span>
          </div>
          <div className="bg-emerald-400 flex items-center justify-center" style={{ width: `${avgWords}%` }}>
            <span className="text-[0.55rem] text-white font-medium">Buyer {avgWords}%</span>
          </div>
        </div>
        <p className="text-[0.68rem] text-gray-400 mt-1">
          {avgWords > 60 ? 'This buyer prefers detailed conversations' : avgWords < 40 ? 'Quick and to-the-point — keep calls brief' : 'Balanced conversationalist'}
        </p>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   NOTES TAB
   ═══════════════════════════════════════════════ */
function NotesTab({ buyerId }: { buyerId: string }) {
  const [notes, setNotes] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [cursor, setCursor] = useState<string | null>(null)

  const load = useCallback(async (c?: string | null) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '20' })
      if (c) params.set('cursor', c)
      const res = await fetch(`/api/crm/buyers/${buyerId}/notes?${params}`)
      if (!res.ok) return
      const data = await res.json()
      if (c) setNotes(prev => [...prev, ...data.notes])
      else setNotes(data.notes)
      setHasMore(data.pagination.hasMore)
      setCursor(data.pagination.nextCursor)
    } finally {
      setLoading(false)
    }
  }, [buyerId])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-4">
      <NoteComposer buyerId={buyerId} onNoteAdded={() => load()} />

      {!loading && notes.length === 0 && (
        <p className="text-center text-sm text-gray-400 py-8">No notes yet. Add one above.</p>
      )}

      <div className="space-y-3">
        {notes.map(n => (
          <div key={n.id} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[0.74rem] font-medium text-gray-700">You</span>
              <span className="text-[0.68rem] text-gray-400">{relativeTime(n.createdAt)}</span>
            </div>
            <p className="text-[0.82rem] text-gray-700 whitespace-pre-wrap">{n.detail}</p>
          </div>
        ))}
      </div>

      {hasMore && (
        <button onClick={() => load(cursor)} disabled={loading} className="text-[0.78rem] text-[#2563EB] bg-transparent border-0 cursor-pointer flex items-center gap-1 mx-auto">
          {loading && <Loader2 className="w-3 h-3 animate-spin" />}
          Load more
        </button>
      )}

      {loading && notes.length === 0 && (
        <div className="space-y-3 animate-pulse">
          {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-lg" />)}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════
   TAGS SIDEBAR CARD
   ═══════════════════════════════════════════════ */
function TagsCard({ buyer, onRefetch }: { buyer: BuyerDetail; onRefetch: () => void }) {
  const [removing, setRemoving] = useState<string | null>(null)

  async function removeTag(tagId: string) {
    setRemoving(tagId)
    try {
      await fetch('/api/crm/tags/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove', tagId, buyerIds: [buyer.id] }),
      })
      onRefetch()
    } finally {
      setRemoving(null)
    }
  }

  async function runAutoTags() {
    await fetch('/api/crm/buyers/auto-tag', { method: 'POST' })
    onRefetch()
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Tags</div>
      {(!buyer.tags || buyer.tags.length === 0) ? (
        <p className="text-[0.74rem] text-gray-400 mb-3">No tags applied.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {buyer.tags.map(bt => (
            <span key={bt.id} className="text-[0.72rem] font-medium px-2 py-1 rounded-full border flex items-center gap-1 crm-chip"
              style={{ color: bt.tag.color, borderColor: bt.tag.color + '40', backgroundColor: bt.tag.color + '10' }}>
              {bt.tag.label}
              <button
                onClick={() => removeTag(bt.tagId)}
                disabled={removing === bt.id}
                className="hover:opacity-70 bg-transparent border-0 cursor-pointer p-0 leading-none"
                style={{ color: bt.tag.color }}
              >
                {removing === bt.id ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <X className="w-2.5 h-2.5" />}
              </button>
            </span>
          ))}
        </div>
      )}
      <button onClick={runAutoTags} className="w-full text-[0.74rem] text-gray-600 hover:bg-gray-50 bg-transparent border border-gray-200 rounded-md py-1.5 cursor-pointer flex items-center justify-center gap-1 crm-btn">
        <Tag className="w-3 h-3" /> Run Auto-Tags
      </button>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════ */
export default function BuyerDetailPage() {
  const router = useRouter()
  const params = useParams()
  const buyerId = params.id as string

  const [buyer, setBuyer] = useState<BuyerDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<TabName>('Overview')
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState<Record<string, string>>({})
  const [editSaving, setEditSaving] = useState(false)
  const [dupes, setDupes] = useState<unknown[] | null>(null)

  const fetchBuyer = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/crm/buyers/${buyerId}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to fetch buyer')
      setBuyer(data.buyer)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [buyerId])

  useEffect(() => { fetchBuyer() }, [fetchBuyer])

  // Check duplicates
  useEffect(() => {
    if (!buyerId) return
    fetch(`/api/crm/buyers/${buyerId}/duplicates`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.duplicates?.length) setDupes(d.duplicates) })
      .catch(() => {})
  }, [buyerId])

  function startEditing() {
    if (!buyer) return
    setEditForm({
      firstName: buyer.firstName || '', lastName: buyer.lastName || '',
      entityName: buyer.entityName || '', entityType: buyer.entityType || '',
      phone: buyer.phone || '', email: buyer.email || '',
      address: buyer.address || '', city: buyer.city || '', state: buyer.state || '', zip: buyer.zip || '',
      strategy: buyer.strategy || '', minPrice: buyer.minPrice != null ? String(buyer.minPrice) : '',
      maxPrice: buyer.maxPrice != null ? String(buyer.maxPrice) : '',
      closeSpeedDays: buyer.closeSpeedDays != null ? String(buyer.closeSpeedDays) : '',
      notes: buyer.notes || '', status: buyer.status || 'ACTIVE',
      buyerType: buyer.buyerType || '', fundingSource: buyer.fundingSource || '',
      conditionPreference: buyer.conditionPreference || '',
      communicationPref: buyer.communicationPref || '',
      preferredZips: (buyer.preferredZips || []).join(', '),
      portfolioSize: buyer.portfolioSize != null ? String(buyer.portfolioSize) : '',
      avgPurchasePrice: buyer.avgPurchasePrice != null ? String(buyer.avgPurchasePrice) : '',
      source: buyer.source || '', assignedTo: buyer.assignedTo || '',
      followUpDate: buyer.followUpDate ? buyer.followUpDate.slice(0, 10) : '',
    })
    setEditing(true)
  }

  async function saveEdits() {
    if (!buyer) return
    setEditSaving(true)
    try {
      const payload: Record<string, unknown> = {}
      const numericFields = ['minPrice', 'maxPrice', 'closeSpeedDays', 'portfolioSize', 'avgPurchasePrice']
      const enumFields = ['strategy', 'buyerType', 'fundingSource', 'conditionPreference', 'communicationPref']

      // Build a map of original values to compare against
      const original: Record<string, string> = {
        firstName: buyer.firstName || '', lastName: buyer.lastName || '',
        entityName: buyer.entityName || '', entityType: buyer.entityType || '',
        phone: buyer.phone || '', email: buyer.email || '',
        address: buyer.address || '', city: buyer.city || '', state: buyer.state || '', zip: buyer.zip || '',
        strategy: buyer.strategy || '', minPrice: buyer.minPrice != null ? String(buyer.minPrice) : '',
        maxPrice: buyer.maxPrice != null ? String(buyer.maxPrice) : '',
        closeSpeedDays: buyer.closeSpeedDays != null ? String(buyer.closeSpeedDays) : '',
        notes: buyer.notes || '', status: buyer.status || 'ACTIVE',
        buyerType: buyer.buyerType || '', fundingSource: buyer.fundingSource || '',
        conditionPreference: buyer.conditionPreference || '',
        communicationPref: buyer.communicationPref || '',
        preferredZips: (buyer.preferredZips || []).join(', '),
        portfolioSize: buyer.portfolioSize != null ? String(buyer.portfolioSize) : '',
        avgPurchasePrice: buyer.avgPurchasePrice != null ? String(buyer.avgPurchasePrice) : '',
        source: buyer.source || '', assignedTo: buyer.assignedTo || '',
        followUpDate: buyer.followUpDate ? buyer.followUpDate.slice(0, 10) : '',
      }

      // Only send fields that actually changed
      for (const [k, v] of Object.entries(editForm)) {
        if (original[k] === v) continue // skip unchanged fields

        if (numericFields.includes(k)) {
          payload[k] = v ? Number(v) : null
        } else if (k === 'preferredZips') {
          payload[k] = v ? (v as string).split(',').map(s => s.trim()).filter(Boolean) : []
        } else if (k === 'followUpDate') {
          payload[k] = v ? new Date(v as string).toISOString() : null
        } else if (k === 'status') {
          if (v) payload[k] = v
        } else if (enumFields.includes(k)) {
          payload[k] = v || null
        } else {
          payload[k] = v || null
        }
      }

      if (Object.keys(payload).length === 0) {
        setEditing(false)
        return
      }

      console.log('PATCH payload (changed only):', payload)
      const res = await fetch(`/api/crm/buyers/${buyerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        console.error('Save failed:', errData)
        const msg = errData.detail || errData.error || 'Failed to update buyer'
        alert(msg.slice(0, 400))
        return
      }
      setEditing(false)
      await fetchBuyer()
    } catch (err) {
      console.error('Save error:', err)
      alert(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setEditSaving(false)
    }
  }

  async function handleArchive() {
    if (!confirm('Archive this buyer? They will be marked as Do Not Call.')) return
    try {
      await fetch(`/api/crm/buyers/${buyerId}`, { method: 'DELETE' })
      router.push('/crm')
    } catch {
      // error
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="p-6 max-w-[1200px] mx-auto animate-pulse">
        <div className="h-8 w-48 bg-gray-200 rounded mb-6" />
        <div className="h-24 bg-gray-100 rounded-lg mb-6" />
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-4">
            <div className="h-48 bg-gray-100 rounded-lg" />
            <div className="h-48 bg-gray-100 rounded-lg" />
          </div>
          <div className="space-y-4">
            <div className="h-48 bg-gray-100 rounded-lg" />
            <div className="h-32 bg-gray-100 rounded-lg" />
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !buyer) {
    return (
      <div className="p-6 max-w-[1200px] mx-auto">
        <button onClick={() => router.push('/crm')} className="flex items-center gap-1.5 text-[0.82rem] text-gray-500 hover:text-gray-700 bg-transparent border-0 cursor-pointer mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Buyer List
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600 font-medium">{error || 'Buyer not found'}</p>
          <button onClick={fetchBuyer} className="mt-3 text-[0.82rem] text-red-600 bg-transparent border border-red-300 rounded-md px-4 py-2 cursor-pointer">Try Again</button>
        </div>
      </div>
    )
  }

  const grade = scoreGrade(buyer.buyerScore)

  return (
    <div className="p-6 max-w-[1200px] mx-auto animate-fadeIn">
      {/* Back Button */}
      <button onClick={() => router.push('/crm')} className="flex items-center gap-1.5 text-[0.82rem] text-gray-500 hover:text-gray-700 bg-transparent border-0 cursor-pointer mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Buyer List
      </button>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>
              {buyerName(buyer)}
            </h1>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {buyer.entityType && (
                <span className="text-[0.72rem] text-gray-500 bg-gray-100 rounded-full px-2.5 py-0.5">{buyer.entityType}</span>
              )}
              <span className={`text-[0.72rem] font-bold px-2.5 py-0.5 rounded-full border crm-chip ${scoreColor(grade)}`}>
                {grade} ({buyer.buyerScore})
              </span>
              <span className={`text-[0.72rem] font-medium px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${motivationStyle(buyer.motivation)}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${motivationDot(buyer.motivation)}`} />
                {motivationLabel(buyer.motivation)}
              </span>
              <span className={`text-[0.72rem] font-medium px-2.5 py-0.5 rounded-full ${statusStyle(buyer.status)}`}>
                {displayStatus(buyer.status)}
              </span>
              {buyer.preferredMarkets?.map(m => (
                <span key={m} className="text-[0.68rem] text-gray-500 bg-gray-50 border border-gray-200 rounded-full px-2 py-0.5 flex items-center gap-1">
                  <MapPin className="w-2.5 h-2.5" />{m}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {(buyer.tags || []).map(bt => (
              <span key={bt.id} className="text-[0.72rem] font-medium px-2.5 py-1 rounded-full border crm-chip"
                style={{ color: bt.tag.color, borderColor: bt.tag.color + '40', backgroundColor: bt.tag.color + '10' }}>
                {bt.tag.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="flex gap-6 items-start flex-col lg:flex-row">
        {/* Left Column (2/3) */}
        <div className="flex-1 min-w-0 lg:w-2/3">
          <TabBar active={tab} onChange={(t) => { setTab(t); if (editing) setEditing(false) }} />
          <div className="mt-5">
            {tab === 'Overview' && (
              <OverviewTab buyer={buyer} editing={editing} editForm={editForm} setEditForm={setEditForm}
                onSave={saveEdits} onCancel={() => setEditing(false)} saving={editSaving} />
            )}
            {tab === 'Timeline' && <TimelineTab buyerId={buyerId} />}
            {tab === 'Deals' && <DealsTab matches={buyer.dealMatches} />}
            {tab === 'Calls' && <CallsTab calls={buyer.campaignCalls} inboundCalls={buyer.inboundCalls} />}
            {tab === 'Intelligence' && <BuyerIntelligenceTab buyerId={buyerId} />}
            {tab === 'Callbacks' && <BuyerCallbacksTab buyerId={buyerId} />}
            {tab === 'Notes' && <NotesTab buyerId={buyerId} />}
          </div>
        </div>

        {/* Right Column (1/3) */}
        <div className="w-full lg:w-80 flex-shrink-0 space-y-4 crm-stagger">
          <ScoreMotivationCard buyerId={buyerId} currentScore={buyer.buyerScore} currentMotivation={buyer.motivation} onUpdated={fetchBuyer} />
          <TagsCard buyer={buyer} onRefetch={fetchBuyer} />

          {/* Duplicate Warning */}
          {dupes && dupes.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span className="text-[0.82rem] font-medium text-amber-800">Possible Duplicate Found</span>
              </div>
              <p className="text-[0.74rem] text-amber-700">This buyer may be a duplicate. Review and merge from the CRM list.</p>
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Quick Actions</div>
            <div className="grid grid-cols-2 gap-2">
              <button className="flex items-center justify-center gap-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white border-0 rounded-md py-2.5 text-[0.78rem] font-medium cursor-pointer transition-colors">
                <PhoneOutgoing className="w-3.5 h-3.5" /> Outreach
              </button>
              <button className="flex items-center justify-center gap-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-md py-2.5 text-[0.78rem] font-medium cursor-pointer transition-colors">
                <Send className="w-3.5 h-3.5" /> Send Deal
              </button>
              <button onClick={startEditing}
                className="flex items-center justify-center gap-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-md py-2.5 text-[0.78rem] font-medium cursor-pointer transition-colors">
                <Pencil className="w-3.5 h-3.5" /> Edit
              </button>
              <button onClick={handleArchive}
                className="flex items-center justify-center gap-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-md py-2.5 text-[0.78rem] font-medium cursor-pointer transition-colors">
                <Archive className="w-3.5 h-3.5" /> Archive
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
