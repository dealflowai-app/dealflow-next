'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  Search,
  Plus,
  Upload,
  List,
  Columns3,
  MapPin,
  ChevronDown,
  MoreHorizontal,
  ArrowUpDown,
  Phone,
  Mail,
  Home,
  PhoneOutgoing,
  Pencil,
  Archive,
  ArchiveRestore,
  Tag,
  Download,
  X,
  Clock,
  Layers,
  UserPlus,
  Loader2,
  AlertCircle,
  Users,
  ChevronLeft,
  ChevronRight,
  Copy,
  CheckCircle2,
  FileDown,
  Merge,
} from 'lucide-react'
import {
  useBuyers,
  useTags,
  type ApiBuyer,
  type BuyerFilters,
} from '@/lib/hooks/useCRM'
import {
  createBuyer,
  importBuyers,
  bulkAction,
  archiveBuyer,
  unarchiveBuyer,
  checkDuplicates,
  mergeBuyers,
} from '@/lib/hooks/useCRMActions'
import ClickToCall from '@/components/outreach/ClickToCall'
import PowerDialer, { type DialerBuyer } from '@/components/outreach/PowerDialer'

/* ═══════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════ */

function buyerName(b: ApiBuyer): string {
  return b.entityName || [b.firstName, b.lastName].filter(Boolean).join(' ') || 'Unknown'
}

function buyerInitials(b: ApiBuyer): string {
  if (b.firstName && b.lastName) return (b.firstName[0] + b.lastName[0]).toUpperCase()
  if (b.entityName) return b.entityName.slice(0, 2).toUpperCase()
  return '??'
}

function scoreGrade(score: number): string {
  if (score >= 90) return 'A'
  if (score >= 70) return 'B'
  if (score >= 50) return 'C'
  return 'D'
}

function scoreColor(s: string) {
  switch (s) {
    case 'A': return 'text-white bg-[#2563EB] border-[#2563EB]'
    case 'B': return 'text-white bg-[#60A5FA] border-[#60A5FA]'
    case 'C': return 'text-white bg-[#F59E0B] border-[#F59E0B]'
    case 'D': return 'text-white bg-[rgba(5,14,36,0.3)] border-[rgba(5,14,36,0.3)]'
    default: return 'text-white bg-[rgba(5,14,36,0.3)] border-[rgba(5,14,36,0.3)]'
  }
}

function scoreDot(s: string) {
  switch (s) {
    case 'A': return '#2563EB'
    case 'B': return '#60A5FA'
    case 'C': return '#F59E0B'
    case 'D': return 'rgba(5,14,36,0.3)'
    default: return 'rgba(5,14,36,0.3)'
  }
}

const STATUS_DISPLAY: Record<string, string> = {
  ACTIVE: 'Active',
  DORMANT: 'Dormant',
  HIGH_CONFIDENCE: 'High-Confidence',
  RECENTLY_VERIFIED: 'Recently Verified',
  DO_NOT_CALL: 'Do Not Call',
}

function displayStatus(s: string): string {
  return STATUS_DISPLAY[s] || s
}

function motivationBadge(m: string | null) {
  switch (m) {
    case 'HOT': return { label: 'Hot', style: 'text-[#EF4444] bg-[rgba(239,68,68,0.08)]', dot: 'bg-[#EF4444]' }
    case 'WARM': return { label: 'Warm', style: 'text-[#F59E0B] bg-[rgba(245,158,11,0.08)]', dot: 'bg-[#F59E0B]' }
    case 'COLD': return { label: 'Cold', style: 'text-[#2563EB] bg-[rgba(37,99,235,0.08)]', dot: 'bg-[#2563EB]' }
    case 'NOT_INTERESTED': return { label: 'Not Int.', style: 'text-[rgba(5,14,36,0.4)] bg-[rgba(5,14,36,0.04)]', dot: 'bg-[rgba(5,14,36,0.3)]' }
    case 'DNC': return { label: 'DNC', style: 'text-[#EF4444] bg-[rgba(239,68,68,0.08)]', dot: 'bg-[#EF4444]' }
    default: return null
  }
}

function statusStyle(s: string) {
  const display = displayStatus(s)
  switch (display) {
    case 'Active': return 'text-[#2563EB] bg-[rgba(37,99,235,0.08)]'
    case 'Dormant': return 'text-[rgba(5,14,36,0.4)] bg-[rgba(5,14,36,0.04)]'
    case 'High-Confidence': return 'text-[#2563EB] bg-[rgba(37,99,235,0.08)]'
    case 'Recently Verified': return 'text-[#8B5CF6] bg-[rgba(139,92,246,0.08)]'
    case 'Do Not Call': return 'text-[#EF4444] bg-[rgba(239,68,68,0.08)]'
    default: return 'text-[rgba(5,14,36,0.4)] bg-[rgba(5,14,36,0.04)]'
  }
}

function formatPrice(n: number | null): string {
  if (n == null) return '—'
  if (n >= 1000) return `$${Math.round(n / 1000)}K`
  return `$${n}`
}

function buyBox(b: ApiBuyer): string {
  const parts: string[] = []
  if (b.preferredTypes?.length) parts.push(b.preferredTypes.join(', '))
  if (b.minPrice != null || b.maxPrice != null) parts.push(`${formatPrice(b.minPrice)}–${formatPrice(b.maxPrice)}`)
  if (b.strategy) parts.push(b.strategy)
  return parts.join(', ') || '—'
}

function relativeDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function hashPosition(id: string): { x: number; y: number } {
  let h = 0
  for (let i = 0; i < id.length; i++) {
    h = ((h << 5) - h + id.charCodeAt(i)) | 0
  }
  const x = 10 + Math.abs(h % 80)
  const y = 10 + Math.abs((h >> 8) % 75)
  return { x, y }
}

/** Parse CSV text handling quoted fields, BOM, and Windows line endings */
function parseCSV(text: string): string[][] {
  // Strip BOM
  const clean = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = clean.split('\n')
  const result: string[][] = []
  for (const line of lines) {
    if (!line.trim()) continue
    const row: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (inQuotes) {
        if (ch === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            current += '"'
            i++
          } else {
            inQuotes = false
          }
        } else {
          current += ch
        }
      } else {
        if (ch === '"') {
          inQuotes = true
        } else if (ch === ',') {
          row.push(current.trim())
          current = ''
        } else {
          current += ch
        }
      }
    }
    row.push(current.trim())
    result.push(row)
  }
  return result
}

/* ═══════════════════════════════════════════════
   TOAST SYSTEM
   ═══════════════════════════════════════════════ */
type ToastType = 'success' | 'error' | 'info'
interface Toast {
  id: number
  message: string
  type: ToastType
}

let toastId = 0

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="fixed top-4 right-4 z-[100] space-y-2 max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-2 px-4 py-3 rounded-[12px] shadow-lg text-sm font-medium animate-slideInRight ${
            t.type === 'success' ? 'bg-[#2563EB] text-white'
              : t.type === 'error' ? 'bg-red-600 text-white'
                : 'bg-gray-800 text-white'
          }`}
        >
          {t.type === 'success' && <CheckCircle2 className="w-4 h-4 flex-shrink-0" />}
          {t.type === 'error' && <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          <span className="flex-1">{t.message}</span>
          <button onClick={() => onDismiss(t.id)} className="text-white/70 hover:text-white bg-transparent border-0 cursor-pointer p-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}

function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = ++toastId
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return { toasts, addToast, dismissToast }
}

/* ═══════════════════════════════════════════════
   SKELETON LOADERS
   ═══════════════════════════════════════════════ */
function SkeletonRow() {
  return (
    <tr className="border-b border-[rgba(5,14,36,0.04)]">
      <td className="px-3 py-3"><div className="w-3.5 h-3.5 bg-gray-200 rounded animate-pulse" /></td>
      <td className="px-3 py-3"><div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-gray-200 animate-pulse" />
        <div className="w-28 h-4 bg-gray-200 rounded animate-pulse" />
      </div></td>
      <td className="px-3 py-3"><div className="w-24 h-4 bg-gray-200 rounded animate-pulse" /></td>
      <td className="px-3 py-3"><div className="w-16 h-4 bg-gray-200 rounded animate-pulse" /></td>
      <td className="px-3 py-3"><div className="w-32 h-4 bg-gray-200 rounded animate-pulse" /></td>
      <td className="px-3 py-3 text-center"><div className="w-8 h-5 bg-gray-200 rounded-full animate-pulse mx-auto" /></td>
      <td className="px-3 py-3"><div className="w-12 h-5 bg-gray-200 rounded-full animate-pulse" /></td>
      <td className="px-3 py-3"><div className="w-16 h-5 bg-gray-200 rounded-full animate-pulse" /></td>
      <td className="px-3 py-3"><div className="w-14 h-4 bg-gray-200 rounded animate-pulse" /></td>
      <td className="px-3 py-3 text-center"><div className="w-6 h-4 bg-gray-200 rounded animate-pulse mx-auto" /></td>
      <td className="px-3 py-3"><div className="w-16 h-4 bg-gray-200 rounded animate-pulse" /></td>
      <td className="px-3 py-3"><div className="w-5 h-5 bg-gray-200 rounded animate-pulse ml-auto" /></td>
    </tr>
  )
}

function TableSkeleton() {
  return (
    <div className="bg-white border border-[rgba(5,14,36,0.08)] rounded-[12px] shadow-none overflow-hidden">
      <table className="w-full min-w-[1000px]">
        <thead>
          <tr className="border-b border-[rgba(5,14,36,0.04)]" style={{ background: 'rgba(5,14,36,0.02)' }}>
            {Array.from({ length: 12 }).map((_, i) => (
              <th key={i} className="px-3 py-3"><div className="w-12 h-3 bg-gray-200 rounded animate-pulse" /></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 7 }).map((_, i) => <SkeletonRow key={i} />)}
        </tbody>
      </table>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="px-6 pt-6 pb-4 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-gray-200 animate-pulse" />
        <div className="space-y-2">
          <div className="w-36 h-5 bg-gray-200 rounded animate-pulse" />
          <div className="flex gap-2">
            <div className="w-16 h-5 bg-gray-200 rounded-full animate-pulse" />
            <div className="w-20 h-5 bg-gray-200 rounded-full animate-pulse" />
          </div>
        </div>
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-2">
          <div className="w-24 h-3 bg-gray-200 rounded animate-pulse" />
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            {[1, 2, 3].map((j) => (
              <div key={j} className="flex justify-between">
                <div className="w-20 h-4 bg-gray-200 rounded animate-pulse" />
                <div className="w-28 h-4 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function TimelineSkeleton() {
  return (
    <div className="space-y-4 pl-5">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="space-y-1">
          <div className="w-32 h-3 bg-gray-200 rounded animate-pulse" />
          <div className="w-48 h-4 bg-gray-200 rounded animate-pulse" />
        </div>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════
   FILTER SELECT
   ═══════════════════════════════════════════════ */
function FilterSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}
        className="appearance-none bg-white border border-[rgba(5,14,36,0.08)] rounded-[10px] pl-3 pr-7 py-2 text-[14px] text-[rgba(5,14,36,0.65)] outline-none focus:border-[#2563EB] transition-colors cursor-pointer"
      >
        <option value="">{label}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
    </div>
  )
}

/* ═══════════════════════════════════════════════
   ADD BUYER MODAL
   ═══════════════════════════════════════════════ */
function AddBuyerModal({ onClose, onCreated }: { onClose: () => void; onCreated: (msg: string) => void }) {
  const [form, setForm] = useState({
    firstName: '', lastName: '', entityName: '', phone: '', email: '',
    city: '', state: '', strategy: '', minPrice: '', maxPrice: '',
    motivation: '', buyerType: '', fundingSource: '', source: '', buyerScore: '50',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.firstName && !form.entityName) { setErr('Name or entity is required'); return }
    setSaving(true)
    setErr('')
    try {
      const payload: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(form)) {
        if (v === '') continue
        if (k === 'minPrice' || k === 'maxPrice' || k === 'buyerScore') { payload[k] = Number(v); continue }
        payload[k] = v
      }
      await createBuyer(payload)
      onCreated('Buyer created')
      onClose()
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Failed to create buyer')
    } finally {
      setSaving(false)
    }
  }

  const scoreVal = Number(form.buyerScore) || 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm crm-modal-overlay" onClick={onClose} />
      <form onSubmit={handleSubmit} className="relative bg-white rounded-[12px] shadow-xl p-6 w-[520px] max-h-[90vh] overflow-y-auto crm-modal-content" style={{ border: '1px solid rgba(5,14,36,0.08)' }}>
        <h3 style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 700, fontSize: '24px', color: '#0B1224', letterSpacing: '-0.02em' }} className="mb-4">Add Buyer</h3>
        {err && <div className="text-red-600 text-sm mb-3">{err}</div>}

        {/* Score Slider */}
        <div className="mb-4 bg-gray-50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-gray-600">Buyer Score</label>
            <span className={`text-[0.72rem] font-bold px-2 py-0.5 rounded-full border ${scoreColor(scoreGrade(scoreVal))}`}>
              {scoreGrade(scoreVal)} ({scoreVal})
            </span>
          </div>
          <div className="flex items-center gap-3">
            <input type="range" min="0" max="100" value={form.buyerScore} onChange={e => setForm(p => ({ ...p, buyerScore: e.target.value }))}
              className="flex-1 h-2 accent-[#2563EB] cursor-pointer" />
            <input type="number" min="0" max="100" value={form.buyerScore} onChange={e => setForm(p => ({ ...p, buyerScore: e.target.value }))}
              className="w-14 text-center text-sm font-bold border border-gray-200 rounded-md py-1 outline-none focus:border-[#2563EB]" />
          </div>
        </div>

        {/* Motivation */}
        <div className="mb-4">
          <label className="text-xs text-gray-500 mb-1.5 block">Motivation Level</label>
          <div className="flex flex-wrap gap-1.5">
            {[
              { value: 'HOT', label: 'Hot', dot: 'bg-red-500' },
              { value: 'WARM', label: 'Warm', dot: 'bg-orange-400' },
              { value: 'COLD', label: 'Cold', dot: 'bg-blue-400' },
              { value: 'NOT_INTERESTED', label: 'Not Interested', dot: 'bg-gray-400' },
            ].map(m => (
              <button key={m.value} type="button"
                onClick={() => setForm(p => ({ ...p, motivation: p.motivation === m.value ? '' : m.value }))}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[0.76rem] font-medium border cursor-pointer transition-all ${
                  form.motivation === m.value ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}>
                <span className={`w-2 h-2 rounded-full ${m.dot}`} />
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { key: 'firstName', label: 'First Name' },
            { key: 'lastName', label: 'Last Name' },
            { key: 'entityName', label: 'Entity / LLC' },
            { key: 'phone', label: 'Phone' },
            { key: 'email', label: 'Email' },
            { key: 'city', label: 'City' },
            { key: 'state', label: 'State' },
            { key: 'minPrice', label: 'Min Price' },
            { key: 'maxPrice', label: 'Max Price' },
          ].map((f) => (
            <div key={f.key}>
              <label className="text-xs text-gray-500 mb-1 block">{f.label}</label>
              <input
                value={form[f.key as keyof typeof form]}
                onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm outline-none focus:border-[#2563EB]"
              />
            </div>
          ))}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Strategy</label>
            <select value={form.strategy} onChange={(e) => setForm((p) => ({ ...p, strategy: e.target.value }))}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm outline-none focus:border-[#2563EB] bg-white">
              <option value="">Select...</option>
              <option value="FLIP">Flip</option><option value="HOLD">Hold</option>
              <option value="BOTH">Both</option><option value="LAND">Land</option>
              <option value="COMMERCIAL">Commercial</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Buyer Type</label>
            <select value={form.buyerType} onChange={(e) => setForm((p) => ({ ...p, buyerType: e.target.value }))}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm outline-none focus:border-[#2563EB] bg-white">
              <option value="">Select...</option>
              <option value="CASH_BUYER">Cash Buyer</option><option value="FLIPPER">Flipper</option>
              <option value="LANDLORD">Landlord</option><option value="WHOLESALER">Wholesaler</option>
              <option value="DEVELOPER">Developer</option><option value="HEDGE_FUND">Hedge Fund</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Funding</label>
            <select value={form.fundingSource} onChange={(e) => setForm((p) => ({ ...p, fundingSource: e.target.value }))}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm outline-none focus:border-[#2563EB] bg-white">
              <option value="">Select...</option>
              <option value="CASH">Cash</option><option value="HARD_MONEY">Hard Money</option>
              <option value="CONVENTIONAL">Conventional</option><option value="PRIVATE_MONEY">Private Money</option>
              <option value="SELF_DIRECTED_IRA">Self-Directed IRA</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Lead Source</label>
            <select value={form.source} onChange={(e) => setForm((p) => ({ ...p, source: e.target.value }))}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm outline-none focus:border-[#2563EB] bg-white">
              <option value="">Select...</option>
              {['Driving for Dollars','Referral','Cash Buyer List','Tax Records','Auction','Networking Event','Cold Call','Inbound Lead','Other'].map(s =>
                <option key={s} value={s}>{s}</option>
              )}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-[#0B1224] bg-white border border-[rgba(5,14,36,0.08)] rounded-[10px] cursor-pointer hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-2 text-sm text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-[10px] border-0 cursor-pointer disabled:opacity-50 flex items-center gap-1.5">
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {saving ? 'Saving...' : 'Create Buyer'}
          </button>
        </div>
      </form>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   CSV IMPORT MODAL
   ═══════════════════════════════════════════════ */
const CSV_TEMPLATE = 'First Name,Last Name,Company,Phone,Email,Address,City,State,Zip,Notes'

function ImportModal({ onClose, onImported }: { onClose: () => void; onImported: (msg: string) => void }) {
  const [csvText, setCsvText] = useState('')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ imported: number; skipped: number; total: number; errors: Array<{ index: number; reason: string }> } | null>(null)
  const [preview, setPreview] = useState<{ headers: string[]; rows: string[][]; mapped: Record<string, string> } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function downloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE + '\n'], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'buyer-import-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      setCsvText(text)
      buildPreview(text)
    }
    reader.readAsText(file)
  }

  function buildPreview(text: string) {
    const parsed = parseCSV(text)
    if (parsed.length < 2) { setPreview(null); return }
    const headers = parsed[0]
    const rows = parsed.slice(1, 6) // first 5 data rows
    const KNOWN = ['firstname', 'first name', 'lastname', 'last name', 'company', 'entityname', 'phone', 'email', 'address', 'city', 'state', 'zip', 'notes']
    const mapped: Record<string, string> = {}
    for (const h of headers) {
      const lower = h.toLowerCase().trim()
      if (KNOWN.includes(lower)) mapped[h] = lower
    }
    setPreview({ headers, rows, mapped })
  }

  useEffect(() => {
    if (csvText) buildPreview(csvText)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleImport() {
    if (!csvText.trim()) return
    setImporting(true)
    setResult(null)
    try {
      const parsed = parseCSV(csvText)
      if (parsed.length < 2) { setResult({ imported: 0, skipped: 0, total: 0, errors: [{ index: 0, reason: 'Need header + at least 1 row' }] }); setImporting(false); return }
      const headers = parsed[0]
      const rows = parsed.slice(1).map((vals) => {
        const obj: Record<string, string> = {}
        headers.forEach((h, i) => { obj[h.trim()] = vals[i] || '' })
        return obj
      })
      const data = await importBuyers(rows)
      setResult(data)
      const msg = `Imported ${data.imported} buyer${data.imported !== 1 ? 's' : ''}. ${data.skipped} skipped.`
      onImported(msg)
    } catch (ex) {
      setResult({ imported: 0, skipped: 0, total: 0, errors: [{ index: -1, reason: ex instanceof Error ? ex.message : 'Import failed' }] })
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm crm-modal-overlay" onClick={onClose} />
      <div className="relative bg-white rounded-[12px] shadow-xl p-6 w-[580px] max-h-[85vh] overflow-y-auto crm-modal-content" style={{ border: '1px solid rgba(5,14,36,0.08)' }}>
        <h3 style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 700, fontSize: '24px', color: '#0B1224', letterSpacing: '-0.02em' }} className="mb-1">Import Buyers (CSV)</h3>
        <div className="flex items-center gap-3 mb-4">
          <p className="text-xs text-gray-400">Upload a CSV or paste data below.</p>
          <button onClick={downloadTemplate} className="text-xs text-[#2563EB] hover:underline bg-transparent border-0 cursor-pointer flex items-center gap-1">
            <FileDown className="w-3 h-3" />
            Download template
          </button>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFileChange} className="hidden" />
          <button
            onClick={() => fileRef.current?.click()}
            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-md cursor-pointer transition-colors"
          >
            Choose File
          </button>
          <span className="text-xs text-gray-400">or paste below</span>
        </div>

        <textarea
          value={csvText}
          onChange={(e) => { setCsvText(e.target.value); buildPreview(e.target.value) }}
          rows={6}
          className="w-full border border-gray-200 rounded-md px-3 py-2 text-xs font-mono outline-none focus:border-[#2563EB] mb-3 resize-none"
          placeholder={CSV_TEMPLATE + '\nJohn,Doe,,2145550100,john@example.com,,Dallas,TX,75201,'}
        />

        {/* Preview */}
        {preview && (
          <div className="mb-3">
            <div className="text-xs font-medium text-gray-600 mb-1.5">Preview (first {preview.rows.length} rows)</div>
            {/* Column mapping */}
            <div className="flex flex-wrap gap-1 mb-2">
              {preview.headers.map((h, i) => (
                <span key={i} className={`text-[0.64rem] px-1.5 py-0.5 rounded ${preview.mapped[h] ? 'bg-[rgba(37,99,235,0.08)] text-[#2563EB] border border-[rgba(37,99,235,0.2)]' : 'bg-gray-100 text-gray-400 border border-gray-200'}`}>
                  {h}{preview.mapped[h] ? ' ✓' : ' ?'}
                </span>
              ))}
            </div>
            <div className="overflow-x-auto border border-gray-200 rounded-md">
              <table className="text-[0.68rem] w-full">
                <thead>
                  <tr className="bg-gray-50">
                    {preview.headers.map((h, i) => (
                      <th key={i} className="px-2 py-1 text-left font-medium text-gray-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row, ri) => (
                    <tr key={ri} className="border-t border-gray-100">
                      {row.map((cell, ci) => (
                        <td key={ci} className="px-2 py-1 text-gray-700 whitespace-nowrap max-w-[120px] truncate">{cell || '—'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className={`text-sm p-3 rounded-md mb-3 ${result.imported > 0 ? 'bg-[rgba(37,99,235,0.08)] text-[#2563EB]' : 'bg-red-50 text-red-800'}`}>
            {result.imported > 0 && <div className="font-medium">{result.imported} imported, {result.skipped} skipped</div>}
            {result.errors.length > 0 && result.errors.slice(0, 5).map((e, i) => (
              <div key={i} className="text-xs mt-1">{e.index >= 0 ? `Row ${e.index + 1}: ` : ''}{e.reason}</div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-[#0B1224] bg-white border border-[rgba(5,14,36,0.08)] rounded-[10px] cursor-pointer hover:bg-gray-50">
            {result ? 'Done' : 'Cancel'}
          </button>
          {!result && (
            <button onClick={handleImport} disabled={importing || !csvText.trim()} className="px-4 py-2 text-sm text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-[10px] border-0 cursor-pointer disabled:opacity-50 flex items-center gap-1.5">
              {importing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {importing ? 'Importing...' : 'Import'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   DUPLICATE DETECTION MODAL
   ═══════════════════════════════════════════════ */
interface DuplicateGroup {
  buyerIds: string[]
  buyers: Array<{ id: string; firstName?: string; lastName?: string; entityName?: string; buyerScore: number }>
  reason: string
  confidence: 'high' | 'medium' | 'low'
}

function DuplicatesModal({ onClose, onMerged }: { onClose: () => void; onMerged: (msg: string) => void }) {
  const [groups, setGroups] = useState<DuplicateGroup[]>([])
  const [summary, setSummary] = useState<{ high: number; medium: number; low: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [merging, setMerging] = useState<string | null>(null) // group index being merged
  const [mergeTarget, setMergeTarget] = useState<{ group: DuplicateGroup; primaryId: string } | null>(null)

  const fetchDups = useCallback(async () => {
    setLoading(true)
    try {
      const data = await checkDuplicates()
      setGroups(data.groups || [])
      setSummary(data.summary || null)
    } catch {
      // handled by empty state
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchDups() }, [fetchDups])

  async function handleMerge() {
    if (!mergeTarget) return
    setMerging(mergeTarget.primaryId)
    try {
      const secondaryIds = mergeTarget.group.buyerIds.filter((id) => id !== mergeTarget.primaryId)
      await mergeBuyers(mergeTarget.primaryId, secondaryIds)
      setMergeTarget(null)
      onMerged('Buyers merged successfully')
      fetchDups() // refresh list
    } catch {
      // toast handled by parent
    } finally {
      setMerging(null)
    }
  }

  function buyerLabel(b: DuplicateGroup['buyers'][0]): string {
    return b.entityName || [b.firstName, b.lastName].filter(Boolean).join(' ') || b.id.slice(0, 8)
  }

  const confBadge = (c: string) => {
    if (c === 'high') return 'bg-red-50 text-red-700 border-red-200'
    if (c === 'medium') return 'bg-amber-50 text-amber-700 border-amber-200'
    return 'bg-gray-100 text-gray-600 border-gray-200'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm crm-modal-overlay" onClick={onClose} />
      <div className="relative bg-white rounded-[12px] shadow-xl p-6 w-[560px] max-h-[85vh] overflow-y-auto crm-modal-content" style={{ border: '1px solid rgba(5,14,36,0.08)' }}>
        <h3 style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 700, fontSize: '24px', color: '#0B1224', letterSpacing: '-0.02em' }} className="mb-1">Duplicate Detection</h3>
        {summary && (
          <div className="flex gap-3 text-xs text-gray-500 mb-4">
            <span className="text-red-600 font-medium">{summary.high} high</span>
            <span className="text-amber-600 font-medium">{summary.medium} medium</span>
            <span className="text-gray-500 font-medium">{summary.low} low</span>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
          </div>
        )}

        {!loading && groups.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-[#2563EB]" />
            <p className="text-sm font-medium text-gray-600">No duplicates found</p>
            <p className="text-xs mt-1">Your buyer list looks clean!</p>
          </div>
        )}

        {/* Merge sub-view */}
        {mergeTarget && (
          <div className="border border-[rgba(37,99,235,0.15)] bg-[rgba(37,99,235,0.05)] rounded-[12px] p-4 mb-4">
            <div className="text-sm font-medium text-gray-800 mb-2">Select primary buyer (keeps this record):</div>
            <div className="space-y-1.5 mb-3">
              {mergeTarget.group.buyers.map((b) => (
                <label key={b.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="primary"
                    checked={mergeTarget.primaryId === b.id}
                    onChange={() => setMergeTarget({ ...mergeTarget, primaryId: b.id })}
                    className="accent-[#2563EB]"
                  />
                  <span className="text-sm text-gray-700">{buyerLabel(b)}</span>
                  <span className={`text-[0.64rem] font-bold px-1.5 py-0.5 rounded-full border ${scoreColor(scoreGrade(b.buyerScore))}`}>{scoreGrade(b.buyerScore)}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={handleMerge} disabled={!!merging} className="px-3 py-1.5 text-sm bg-[#2563EB] text-white rounded-[10px] border-0 cursor-pointer hover:bg-[#1D4ED8] disabled:opacity-50 flex items-center gap-1">
                {merging && <Loader2 className="w-3 h-3 animate-spin" />}
                Confirm Merge
              </button>
              <button onClick={() => setMergeTarget(null)} className="px-3 py-1.5 text-sm text-[#0B1224] bg-white border border-[rgba(5,14,36,0.08)] rounded-[10px] cursor-pointer hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        )}

        {/* Groups list */}
        <div className="space-y-3">
          {groups.map((g, gi) => (
            <div key={gi} className="border border-[rgba(5,14,36,0.08)] rounded-[12px] p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-[0.64rem] font-medium px-1.5 py-0.5 rounded-full border ${confBadge(g.confidence)}`}>
                  {g.confidence}
                </span>
                <span className="text-xs text-gray-400">{g.reason}</span>
              </div>
              <div className="space-y-1 mb-2">
                {g.buyers.map((b) => (
                  <div key={b.id} className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="font-medium">{buyerLabel(b)}</span>
                    <span className={`text-[0.62rem] font-bold px-1.5 py-0.5 rounded-full border ${scoreColor(scoreGrade(b.buyerScore))}`}>
                      {scoreGrade(b.buyerScore)}
                    </span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setMergeTarget({ group: g, primaryId: g.buyerIds[0] })}
                className="text-xs text-[#2563EB] hover:text-[#1D4ED8] bg-transparent border-0 cursor-pointer flex items-center gap-1"
              >
                <Merge className="w-3 h-3" /> Merge
              </button>
            </div>
          ))}
        </div>

        <div className="flex justify-end mt-4">
          <button onClick={onClose} className="px-4 py-2 text-sm text-[#0B1224] bg-white border border-[rgba(5,14,36,0.08)] rounded-[10px] cursor-pointer hover:bg-gray-50">Close</button>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   PAGINATION BAR
   ═══════════════════════════════════════════════ */
function PaginationBar({
  page,
  totalPages,
  total,
  onPage,
}: {
  page: number
  totalPages: number
  total: number
  onPage: (p: number) => void
}) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between mt-4" style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontSize: '12px', fontWeight: 400, color: 'rgba(5,14,36,0.4)' }}>
      <span>{total} buyer{total !== 1 ? 's' : ''}</span>
      <div className="flex items-center gap-1">
        <button
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className="p-1.5 rounded-[10px] border border-[rgba(5,14,36,0.08)] bg-white hover:bg-gray-50 disabled:opacity-40 cursor-pointer disabled:cursor-default transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="px-3" style={{ fontSize: '12px' }}>Page {page} of {totalPages}</span>
        <button
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
          className="p-1.5 rounded-[10px] border border-[rgba(5,14,36,0.08)] bg-white hover:bg-gray-50 disabled:opacity-40 cursor-pointer disabled:cursor-default transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   ROW MENU (fixed positioning to escape overflow)
   ═══════════════════════════════════════════════ */
function RowMenu({ isOpen, onToggle, onClose, actions }: {
  isOpen: boolean
  onToggle: () => void
  onClose: () => void
  actions: { label: string; icon: React.ComponentType<{ className?: string }>; onClick: () => void }[]
}) {
  const btnRef = useRef<HTMLButtonElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (isOpen && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setPos({ top: rect.bottom + 4, left: rect.right - 160 })
    }
  }, [isOpen])

  return (
    <>
      <button
        ref={btnRef}
        onClick={(e) => { e.stopPropagation(); onToggle() }}
        className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 bg-transparent border-0 cursor-pointer transition-colors"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={onClose} />
          <div
            className="fixed z-[101] bg-white border border-[rgba(5,14,36,0.08)] rounded-[12px] shadow-lg py-1 min-w-[160px] crm-dropdown"
            style={{ top: pos.top, left: pos.left }}
          >
            {actions.map((a) => (
              <button
                key={a.label}
                onClick={a.onClick}
                className="w-full flex items-center gap-2 px-3 py-2 text-[0.78rem] text-gray-600 hover:bg-gray-50 bg-transparent border-0 cursor-pointer transition-colors text-left"
              >
                <a.icon className="w-3.5 h-3.5 text-gray-400" />
                {a.label}
              </button>
            ))}
          </div>
        </>
      )}
    </>
  )
}

/* ═══════════════════════════════════════════════
   LIST VIEW
   ═══════════════════════════════════════════════ */
function ListView({
  buyers,
  isLoading,
  hasFilters,
  showArchived,
  onOpenDetail,
  onRefetch,
  onClearFilters,
  addToast,
}: {
  buyers: ApiBuyer[]
  isLoading: boolean
  hasFilters: boolean
  showArchived?: boolean
  onOpenDetail: (id: string) => void
  onRefetch: () => void
  onClearFilters: () => void
  addToast: (msg: string, type?: ToastType) => void
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sortCol, setSortCol] = useState<string>('score')
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [showDialer, setShowDialer] = useState(false)

  const allSelected = buyers.length > 0 && selected.size === buyers.length
  function toggleAll() { setSelected(allSelected ? new Set() : new Set(buyers.map((b) => b.id))) }
  function toggle(id: string) { setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n }) }

  async function handleBulk(action: string) {
    if (selected.size === 0) return
    setBulkLoading(true)
    try {
      const data = await bulkAction(action, Array.from(selected))
      addToast(`${data.updated ?? selected.size} buyer${(data.updated ?? selected.size) !== 1 ? 's' : ''} ${action === 'archive' ? 'archived' : action === 'activate' ? 'activated' : 'updated'}`)
      setSelected(new Set())
      onRefetch()
    } catch (ex) {
      addToast(ex instanceof Error ? ex.message : 'Bulk action failed', 'error')
    } finally {
      setBulkLoading(false)
    }
  }

  async function handleArchive(id: string) {
    setMenuOpen(null)
    try {
      await archiveBuyer(id)
      addToast('Buyer archived')
      onRefetch()
    } catch (ex) {
      addToast(ex instanceof Error ? ex.message : 'Archive failed', 'error')
    }
  }

  async function handleUnarchive(id: string) {
    setMenuOpen(null)
    try {
      await unarchiveBuyer(id)
      addToast('Buyer restored')
      onRefetch()
    } catch (ex) {
      addToast(ex instanceof Error ? ex.message : 'Restore failed', 'error')
    }
  }

  // Skeleton while loading
  if (isLoading) return <TableSkeleton />

  // Empty state: no buyers at all
  if (buyers.length === 0 && !hasFilters) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white border border-[rgba(5,14,36,0.08)] rounded-[12px]">
        <Users className="w-14 h-14 mb-3 text-gray-300" />
        <p style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 600, fontSize: '15px', color: '#0B1224' }} className="mb-1">Your buyer list is empty</p>
        <p style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 400, fontSize: '14px', color: 'rgba(5,14,36,0.65)' }} className="mb-5">Add buyers manually or import from a CSV file.</p>
        <div className="flex gap-2">
          <button onClick={() => document.dispatchEvent(new CustomEvent('crm:openAddModal'))} className="flex items-center gap-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white border-0 rounded-[10px] px-4 py-2 text-sm font-medium cursor-pointer transition-colors">
            <UserPlus className="w-4 h-4" /> Add Buyer
          </button>
          <button onClick={() => document.dispatchEvent(new CustomEvent('crm:openImportModal'))} className="flex items-center gap-1.5 bg-white border border-[rgba(5,14,36,0.08)] hover:bg-[#F9FAFB] text-[#0B1224] rounded-[10px] px-4 py-2 text-sm font-medium cursor-pointer transition-colors">
            <Upload className="w-4 h-4" /> Import CSV
          </button>
        </div>
      </div>
    )
  }

  // Empty state: no search results
  if (buyers.length === 0 && hasFilters) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white border border-[rgba(5,14,36,0.08)] rounded-[12px]">
        <Search className="w-12 h-12 mb-3 text-gray-300" />
        <p style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 400, fontSize: '14px', color: 'rgba(5,14,36,0.65)' }}>No buyers match your filters</p>
        <button onClick={onClearFilters} className="mt-3 text-sm text-[#2563EB] hover:text-[#1D4ED8] bg-transparent border-0 cursor-pointer">Clear all filters</button>
      </div>
    )
  }

  return (
    <div>
      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 bg-[rgba(37,99,235,0.08)] border border-[rgba(37,99,235,0.15)] rounded-[12px] px-4 py-2.5 mb-3">
          <span className="text-[0.8rem] text-[#2563EB] font-medium">{selected.size} selected</span>
          <div className="flex items-center gap-1.5 ml-auto">
            <button
              onClick={() => setShowDialer(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[0.76rem] font-bold text-[#2563EB] hover:bg-[rgba(37,99,235,0.12)] bg-[rgba(37,99,235,0.08)] border border-[rgba(37,99,235,0.2)] cursor-pointer transition-colors"
            >
              <Phone className="w-3.5 h-3.5" />
              Power Dial
            </button>
            {[
              { label: 'Send Campaign', icon: PhoneOutgoing, action: 'campaign' },
              { label: 'Add Tag', icon: Tag, action: 'tag' },
              { label: 'Export', icon: Download, action: 'export' },
              { label: 'Archive', icon: Archive, action: 'archive' },
            ].map((a) => (
              <button
                key={a.label}
                onClick={() => handleBulk(a.action)}
                disabled={bulkLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[0.76rem] font-medium text-[#2563EB] hover:bg-[#DBEAFE] bg-transparent border-0 cursor-pointer transition-colors disabled:opacity-50"
              >
                <a.icon className="w-3.5 h-3.5" />
                {a.label}
              </button>
            ))}
          </div>
          <button onClick={() => setSelected(new Set())} className="text-[#60A5FA] hover:text-[#2563EB] bg-transparent border-0 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-[rgba(5,14,36,0.08)] rounded-[12px] shadow-none overflow-x-auto">
        <table className="w-full min-w-[1000px]">
          <thead>
            <tr className="border-b border-[rgba(5,14,36,0.04)]" style={{ background: 'rgba(5,14,36,0.02)' }}>
              <th className="w-10 px-3 py-3">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} className="accent-[#2563EB] cursor-pointer" style={{ width: '16px', height: '16px', borderRadius: '4px' }} />
              </th>
              {[
                { key: 'name', label: 'Buyer Name', align: 'left' },
                { key: 'phone', label: 'Phone', align: 'left' },
                { key: 'market', label: 'Market(s)', align: 'left' },
                { key: 'buybox', label: 'Buy Box', align: 'left' },
                { key: 'score', label: 'Score', align: 'center' },
                { key: 'motivation', label: 'Motivation', align: 'left' },
                { key: 'status', label: 'Status', align: 'left' },
                { key: 'lastContact', label: 'Last Contact', align: 'left' },
                { key: 'deals', label: 'Closed', align: 'center' },
                { key: 'tags', label: 'Tags', align: 'left' },
                { key: 'actions', label: '', align: 'right' },
              ].map((col) => (
                <th
                  key={col.key}
                  onClick={() => col.key !== 'actions' ? setSortCol(col.key) : null}
                  style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 600, fontSize: '11px', letterSpacing: '0.05em', color: 'rgba(5,14,36,0.4)' }}
                  className={`px-3 py-3 uppercase whitespace-nowrap ${
                    col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'
                  } ${col.key !== 'actions' ? 'cursor-pointer hover:text-[rgba(5,14,36,0.6)] select-none' : ''}`}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {sortCol === col.key && col.key !== 'actions' && <ArrowUpDown className="w-3 h-3" />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {buyers.map((b, i) => {
              const grade = scoreGrade(b.buyerScore)
              return (
                <tr
                  key={b.id}
                  className={`border-b border-[rgba(5,14,36,0.04)] bg-white hover:bg-[rgba(37,99,235,0.02)] cursor-pointer crm-row`}
                  onDoubleClick={() => onOpenDetail(b.id)}
                >
                  <td className="px-3 py-3">
                    <input type="checkbox" checked={selected.has(b.id)} onChange={() => toggle(b.id)} className="accent-[#2563EB] cursor-pointer" style={{ width: '16px', height: '16px', borderRadius: '4px', border: '1px solid rgba(5,14,36,0.2)' }} />
                  </td>
                  <td className="px-3 py-3">
                    <button onClick={() => onOpenDetail(b.id)} className="flex items-center gap-2 bg-transparent border-0 cursor-pointer text-left p-0 group">
                      <div className="w-8 h-8 rounded-full bg-[#0B1224] flex items-center justify-center flex-shrink-0">
                        <span style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 600, fontSize: '11px', color: 'white' }}>{buyerInitials(b)}</span>
                      </div>
                      <span style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 400, fontSize: '14px', color: '#0B1224' }} className="group-hover:text-[#2563EB] transition-colors">{buyerName(b)}</span>
                    </button>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap" style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 400, fontSize: '14px', color: '#0B1224' }}>
                    <span className="inline-flex items-center gap-1.5">
                      {b.phone || '—'}
                      {b.phone && <ClickToCall buyerId={b.id} buyerName={buyerName(b)} phone={b.phone} compact />}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(b.preferredMarkets || []).map((m) => (
                        <span key={m} className="text-[11px] rounded-full px-1.5 py-0.5" style={{ color: 'rgba(5,14,36,0.65)', backgroundColor: 'rgba(5,14,36,0.04)' }}>{m}</span>
                      ))}
                      {(!b.preferredMarkets || b.preferredMarkets.length === 0) && <span className="text-[11px]" style={{ color: 'rgba(5,14,36,0.4)' }}>—</span>}
                    </div>
                  </td>
                  <td className="px-3 py-3 max-w-[160px] truncate" style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 400, fontSize: '14px', color: '#0B1224' }}>{buyBox(b)}</td>
                  <td className="px-3 py-3 text-center">
                    <span className={`text-[0.72rem] font-bold px-2 py-0.5 rounded-full border ${scoreColor(grade)}`}>{grade}</span>
                  </td>
                  <td className="px-3 py-3">
                    {(() => {
                      const mb = motivationBadge(b.motivation)
                      if (!mb) return <span className="text-[0.68rem] text-gray-300">—</span>
                      return (
                        <span className={`text-[0.68rem] font-medium px-2 py-0.5 rounded-full whitespace-nowrap flex items-center gap-1 w-fit ${mb.style}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${mb.dot}`} />
                          {mb.label}
                        </span>
                      )
                    })()}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`text-[0.68rem] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${statusStyle(b.status)}`}>{displayStatus(b.status)}</span>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap" style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 400, fontSize: '12px', color: 'rgba(5,14,36,0.4)' }}>{relativeDate(b.lastContactedAt)}</td>
                  <td className="px-3 py-3 text-center" style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 400, fontSize: '14px', color: '#0B1224' }}>{b.cashPurchaseCount}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1 max-w-[140px]">
                      {(b.tags || []).slice(0, 3).map((bt) => (
                        <span
                          key={bt.id}
                          className="text-[0.62rem] font-medium px-1.5 py-0.5 rounded-full border crm-chip"
                          style={{
                            color: bt.tag.color,
                            borderColor: bt.tag.color + '40',
                            backgroundColor: bt.tag.color + '10',
                          }}
                        >
                          {bt.tag.label}
                        </span>
                      ))}
                      {(b.tags || []).length > 3 && (
                        <span className="text-[0.62rem] text-gray-400">+{b.tags!.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <RowMenu
                      isOpen={menuOpen === b.id}
                      onToggle={() => setMenuOpen(menuOpen === b.id ? null : b.id)}
                      onClose={() => setMenuOpen(null)}
                      actions={showArchived ? [
                        { label: 'View Details', icon: Pencil, onClick: () => { setMenuOpen(null); onOpenDetail(b.id) } },
                        { label: 'Restore Buyer', icon: ArchiveRestore, onClick: () => handleUnarchive(b.id) },
                      ] : [
                        { label: 'View Details', icon: Pencil, onClick: () => { setMenuOpen(null); onOpenDetail(b.id) } },
                        { label: 'Start Outreach', icon: PhoneOutgoing, onClick: () => setMenuOpen(null) },
                        { label: 'Archive', icon: Archive, onClick: () => handleArchive(b.id) },
                      ]}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Power Dialer overlay */}
      {showDialer && (() => {
        const dialerBuyers: DialerBuyer[] = buyers
          .filter(b => selected.has(b.id) && b.phone)
          .map(b => ({
            id: b.id,
            name: buyerName(b),
            phone: b.phone!,
            score: b.buyerScore,
            status: b.status,
            notes: b.notes || undefined,
            strategy: b.strategy,
            preferredTypes: b.preferredTypes,
            preferredMarkets: b.preferredMarkets,
            minPrice: b.minPrice,
            maxPrice: b.maxPrice,
            closeSpeedDays: b.closeSpeedDays,
            lastContactedAt: b.lastContactedAt,
          }))
        return dialerBuyers.length > 0 ? (
          <PowerDialer
            buyers={dialerBuyers}
            onClose={() => { setShowDialer(false); setSelected(new Set()) }}
          />
        ) : (
          <div className="fixed inset-0 z-50 bg-gray-900/50 flex items-center justify-center">
            <div className="bg-white rounded-xl p-6 max-w-sm text-center">
              <p className="text-sm text-gray-600 mb-3">No selected buyers have phone numbers.</p>
              <button onClick={() => setShowDialer(false)} className="text-sm text-blue-600 hover:text-blue-500">Close</button>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

/* ═══════════════════════════════════════════════
   PIPELINE VIEW
   ═══════════════════════════════════════════════ */
const PIPELINE_STATUSES = [
  { key: 'ACTIVE', label: 'Active', borderColor: 'border-t-[#2563EB]' },
  { key: 'RECENTLY_VERIFIED', label: 'Recently Verified', borderColor: 'border-t-[#8B5CF6]' },
  { key: 'HIGH_CONFIDENCE', label: 'High-Confidence', borderColor: 'border-t-[#F59E0B]' },
  { key: 'DORMANT', label: 'Dormant', borderColor: 'border-t-[rgba(5,14,36,0.2)]' },
  { key: 'DO_NOT_CALL', label: 'Do Not Call', borderColor: 'border-t-[#EF4444]' },
]

function PipelineView({
  buyers,
  isLoading,
  onOpenDetail,
}: {
  buyers: ApiBuyer[]
  isLoading: boolean
  onOpenDetail: (id: string) => void
}) {
  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-4">
        {PIPELINE_STATUSES.map((s) => (
          <div key={s.key} className="flex-shrink-0 w-[210px]">
            <div className={`bg-gray-50 rounded-xl border-t-[3px] ${s.borderColor} p-3 min-h-[400px]`}>
              <div className="w-20 h-4 bg-gray-200 rounded animate-pulse mb-3" />
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white border border-[rgba(5,14,36,0.08)] rounded-[12px] p-3 mb-2">
                  <div className="w-24 h-4 bg-gray-200 rounded animate-pulse mb-2" />
                  <div className="w-16 h-3 bg-gray-200 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (buyers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <Users className="w-12 h-12 mb-3 text-gray-300" />
        <p className="text-sm font-medium text-gray-500">No buyers to display</p>
      </div>
    )
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 crm-pipeline">
      {PIPELINE_STATUSES.map((stage) => {
        const cards = buyers.filter((b) => b.status === stage.key)
        return (
          <div key={stage.key} className="flex-shrink-0 w-[210px]">
            <div className={`bg-gray-50 rounded-xl border-t-[3px] ${stage.borderColor} p-3 min-h-[400px]`}>
              <div className="flex items-center justify-between mb-3">
                <span style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 600, fontSize: '15px', color: '#0B1224' }}>{stage.label}</span>
                <span style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 500, fontSize: '12px', color: 'rgba(5,14,36,0.4)' }} className="bg-white rounded-full px-2 py-0.5">{cards.length}</span>
              </div>
              <div className="space-y-2">
                {cards.map((b) => {
                  const grade = scoreGrade(b.buyerScore)
                  return (
                    <button
                      key={b.id}
                      onClick={() => onOpenDetail(b.id)}
                      className="w-full bg-white border border-[rgba(5,14,36,0.08)] rounded-[12px] px-3 py-2.5 text-left cursor-pointer shadow-none group crm-card"
                      style={{ transition: 'box-shadow 0.15s ease' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(5,14,36,0.06)' }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-8 h-8 rounded-full bg-[#0B1224] flex items-center justify-center flex-shrink-0">
                          <span style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 600, fontSize: '10px', color: 'white' }}>{buyerInitials(b)}</span>
                        </div>
                        <span style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 400, fontSize: '14px', color: '#0B1224' }} className="truncate group-hover:text-[#2563EB] transition-colors">{buyerName(b)}</span>
                      </div>
                      <div className="mb-1.5 flex gap-1 flex-wrap" style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontSize: '12px', fontWeight: 400, color: 'rgba(5,14,36,0.4)' }}>
                        {(b.preferredMarkets || []).map((m) => <span key={m}>{m}</span>)}
                      </div>
                      <div className="truncate mb-2" style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontSize: '12px', fontWeight: 400, color: 'rgba(5,14,36,0.65)' }}>{buyBox(b)}</div>
                      <div className="flex items-center justify-between">
                        <span className={`text-[0.64rem] font-bold px-1.5 py-0.5 rounded-full border ${scoreColor(grade)}`}>{grade}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ═══════════════════════════════════════════════
   MAP VIEW
   ═══════════════════════════════════════════════ */
function MapView({
  buyers,
  onOpenDetail,
}: {
  buyers: ApiBuyer[]
  onOpenDetail: (id: string) => void
}) {
  const [hoverBuyer, setHoverBuyer] = useState<string | null>(null)
  const [heatmap, setHeatmap] = useState(false)

  return (
    <div className="relative w-full rounded-xl overflow-hidden bg-[#1a1d23] border border-gray-800" style={{ height: 560 }}>
      <svg className="absolute inset-0 w-full h-full opacity-[0.06]">
        <defs><pattern id="crmGrid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="#ffffff" strokeWidth="0.5" /></pattern></defs>
        <rect width="100%" height="100%" fill="url(#crmGrid)" />
      </svg>
      <svg className="absolute inset-0 w-full h-full opacity-[0.08]">
        <line x1="0" y1="30%" x2="100%" y2="28%" stroke="#fff" strokeWidth="2" />
        <line x1="0" y1="55%" x2="100%" y2="58%" stroke="#fff" strokeWidth="1.5" />
        <line x1="30%" y1="0" x2="28%" y2="100%" stroke="#fff" strokeWidth="2" />
        <line x1="60%" y1="0" x2="62%" y2="100%" stroke="#fff" strokeWidth="1.5" />
        <line x1="0" y1="78%" x2="100%" y2="75%" stroke="#fff" strokeWidth="1" />
        <line x1="82%" y1="0" x2="80%" y2="100%" stroke="#fff" strokeWidth="1" />
      </svg>

      {heatmap && (
        <div className="absolute inset-0">
          <div className="absolute w-[180px] h-[180px] rounded-full bg-blue-500/12 blur-3xl" style={{ left: '35%', top: '30%' }} />
          <div className="absolute w-[220px] h-[220px] rounded-full bg-blue-500/10 blur-3xl" style={{ left: '55%', top: '40%' }} />
          <div className="absolute w-[140px] h-[140px] rounded-full bg-amber-500/10 blur-3xl" style={{ left: '20%', top: '50%' }} />
          <div className="absolute w-[160px] h-[160px] rounded-full bg-blue-400/08 blur-3xl" style={{ left: '70%', top: '55%' }} />
        </div>
      )}

      {buyers.map((b) => {
        const pos = hashPosition(b.id)
        const grade = scoreGrade(b.buyerScore)
        return (
          <div key={b.id} className="absolute cursor-pointer group" style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%, -50%)' }}
            onMouseEnter={() => setHoverBuyer(b.id)} onMouseLeave={() => setHoverBuyer(null)}>
            <div className="w-3 h-3 rounded-full border-2 border-white/60 group-hover:scale-150 crm-map-dot" style={{ background: scoreDot(grade) }} />
            {hoverBuyer === b.id && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#12141a] border border-gray-700 rounded-lg px-3 py-2.5 shadow-xl z-10 min-w-[180px] crm-tooltip">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-8 h-8 rounded-full bg-[#0B1224] flex items-center justify-center flex-shrink-0">
                    <span style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 600, fontSize: '10px', color: 'white' }}>{buyerInitials(b)}</span>
                  </div>
                  <span className="text-[0.8rem] font-medium text-white">{buyerName(b)}</span>
                  <span className={`text-[0.6rem] font-bold px-1.5 py-0.5 rounded-full border ${scoreColor(grade)}`}>{grade}</span>
                </div>
                <div className="text-[0.7rem] text-gray-400 mb-2">{buyBox(b)}</div>
                <button onClick={() => onOpenDetail(b.id)} className="w-full text-[0.72rem] font-medium text-[#60A5FA] hover:text-[#A5B4FC] bg-transparent border-0 cursor-pointer text-left transition-colors">View Profile →</button>
                <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 bg-[#12141a] border-r border-b border-gray-700 rotate-45" />
              </div>
            )}
          </div>
        )
      })}

      <div className="absolute top-3 left-3 bg-[#12141a]/80 backdrop-blur-sm rounded-md px-2.5 py-1.5 border border-gray-700/50">
        <span className="text-[0.72rem] text-gray-300 font-medium">All Markets</span>
      </div>

      <div className="absolute bottom-3 left-3 bg-[#12141a]/90 backdrop-blur-sm rounded-lg px-3 py-2.5 border border-gray-700/50">
        <div className="text-[0.62rem] text-gray-400 uppercase tracking-wide mb-1.5">Buyer Score</div>
        <div className="space-y-1">
          {[
            { label: 'A: Top Buyer', color: '#2563EB' },
            { label: 'B: Good', color: '#60A5FA' },
            { label: 'C: Fair', color: '#F59E0B' },
            { label: 'D: Low', color: 'rgba(5,14,36,0.3)' },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: l.color }} />
              <span className="text-[0.66rem] text-gray-300">{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute top-3 right-3">
        <button onClick={() => setHeatmap(!heatmap)} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[0.68rem] font-medium border cursor-pointer transition-all ${heatmap ? 'bg-[#2563EB] border-[#1D4ED8] text-white' : 'bg-[#12141a]/80 backdrop-blur-sm border-gray-700/50 text-gray-400 hover:text-gray-200 hover:border-gray-600'}`}>
          <Layers className="w-3 h-3" /> Density
        </button>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   MAIN CRM PAGE
   ═══════════════════════════════════════════════ */
export default function BuyerCrmPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Initialize from URL params
  const [view, setView] = useState<'list' | 'pipeline' | 'map'>((searchParams.get('view') as 'list' | 'pipeline' | 'map') || 'list')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showDuplicatesModal, setShowDuplicatesModal] = useState(false)
  const [showArchived, setShowArchived] = useState(searchParams.get('archived') === 'true')

  // Filters from URL
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '')
  const [marketFilter, setMarketFilter] = useState(searchParams.get('market') || '')
  const [strategyFilter, setStrategyFilter] = useState(searchParams.get('strategy') || '')
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || '')
  const [scoreFilter, setScoreFilter] = useState(searchParams.get('score') || '')
  const [tagFilter, setTagFilter] = useState(searchParams.get('tag') || '')
  const [motivationFilter, setMotivationFilter] = useState(searchParams.get('motivation') || '')
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1)

  const { toasts, addToast, dismissToast } = useToasts()

  const hasFilters = !!(search || statusFilter || marketFilter || strategyFilter || typeFilter || scoreFilter || tagFilter || motivationFilter)

  function clearFilters() {
    setSearch(''); setStatusFilter(''); setMarketFilter(''); setStrategyFilter('')
    setTypeFilter(''); setScoreFilter(''); setTagFilter(''); setMotivationFilter(''); setPage(1)
  }

  const filters: BuyerFilters = {
    page,
    limit: 25,
    search,
    status: statusFilter || undefined,
    market: marketFilter || undefined,
    strategy: strategyFilter || undefined,
    type: typeFilter || undefined,
    scoreMin: scoreFilter ? ({ A: 90, B: 70, C: 50, D: 0 } as Record<string, number>)[scoreFilter] : undefined,
    tag: tagFilter || undefined,
    motivation: motivationFilter || undefined,
    sortBy: searchParams.get('sort') || undefined,
    sortOrder: (searchParams.get('order') as 'asc' | 'desc') || undefined,
    archived: showArchived,
  }

  const { buyers, pagination, stats, isLoading, error, refetch } = useBuyers(filters)
  const { tags } = useTags()

  // Reset page on filter change
  useEffect(() => { setPage(1) }, [search, statusFilter, marketFilter, strategyFilter, typeFilter, scoreFilter, tagFilter, motivationFilter])

  // URL sync — update URL when state changes
  useEffect(() => {
    const params = new URLSearchParams()
    if (view !== 'list') params.set('view', view)
    if (search) params.set('search', search)
    if (statusFilter) params.set('status', statusFilter)
    if (marketFilter) params.set('market', marketFilter)
    if (strategyFilter) params.set('strategy', strategyFilter)
    if (typeFilter) params.set('type', typeFilter)
    if (scoreFilter) params.set('score', scoreFilter)
    if (tagFilter) params.set('tag', tagFilter)
    if (motivationFilter) params.set('motivation', motivationFilter)
    if (page > 1) params.set('page', String(page))
    if (showArchived) params.set('archived', 'true')
    const qs = params.toString()
    router.replace(qs ? `?${qs}` : '?', { scroll: false })
  }, [view, search, statusFilter, marketFilter, strategyFilter, typeFilter, scoreFilter, tagFilter, motivationFilter, page, showArchived, router])

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      // Escape: close detail panel or modals
      if (e.key === 'Escape') {
        if (showAddModal) { setShowAddModal(false); return }
        if (showImportModal) { setShowImportModal(false); return }
        if (showDuplicatesModal) { setShowDuplicatesModal(false); return }

      }
      // Don't trigger shortcuts if typing in an input
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return

      // / or Cmd+K: focus search
      if (e.key === '/' || (e.metaKey && e.key === 'k')) {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
      // Cmd+N: open add buyer modal
      if (e.metaKey && e.key === 'n') {
        e.preventDefault()
        setShowAddModal(true)
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [showAddModal, showImportModal, showDuplicatesModal])

  // Listen for custom events from empty state buttons
  useEffect(() => {
    const handleOpenAdd = () => setShowAddModal(true)
    const handleOpenImport = () => setShowImportModal(true)
    document.addEventListener('crm:openAddModal', handleOpenAdd)
    document.addEventListener('crm:openImportModal', handleOpenImport)
    return () => {
      document.removeEventListener('crm:openAddModal', handleOpenAdd)
      document.removeEventListener('crm:openImportModal', handleOpenImport)
    }
  }, [])

  const handleOpenDetail = useCallback((id: string) => router.push(`/crm/${id}`), [router])

  return (
    <div className="p-8 max-w-[1400px] bg-[var(--cream,#FAF9F6)]">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 700, fontSize: '24px', color: '#0B1224', letterSpacing: '-0.02em' }} className="mb-1">Buyer List</h1>
          <p style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 400, fontSize: '14px', color: 'rgba(5,14,36,0.5)' }}>Manage your cash buyer relationships and pipeline.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowArchived(!showArchived); setPage(1) }}
            className={`flex items-center gap-1.5 border rounded-[10px] px-4 py-2 text-[0.82rem] font-medium cursor-pointer transition-colors ${
              showArchived
                ? 'bg-[rgba(245,158,11,0.08)] border-[rgba(245,158,11,0.2)] text-[#F59E0B] hover:bg-[rgba(245,158,11,0.12)]'
                : 'bg-white border-[rgba(5,14,36,0.08)] hover:bg-[#F9FAFB] text-[#0B1224]'
            }`}
          >
            <Archive className="w-4 h-4" />
            {showArchived ? 'Viewing Archived' : 'Archived'}
          </button>
          <button
            onClick={() => setShowDuplicatesModal(true)}
            className="flex items-center gap-1.5 bg-white border border-[rgba(5,14,36,0.08)] hover:bg-[#F9FAFB] text-[#0B1224] rounded-[10px] px-4 py-2 text-[0.82rem] font-medium cursor-pointer crm-btn"
          >
            <Copy className="w-4 h-4" />
            Check Duplicates
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-1.5 bg-white border border-[rgba(5,14,36,0.08)] hover:bg-[#F9FAFB] text-[#0B1224] rounded-[10px] px-4 py-2 text-[0.82rem] font-medium cursor-pointer crm-btn"
          >
            <Upload className="w-4 h-4" />
            Import CSV
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white border-0 rounded-[10px] px-4 py-2 text-[0.82rem] font-medium cursor-pointer crm-btn"
          >
            <UserPlus className="w-4 h-4" />
            Add Buyer
          </button>
        </div>
      </div>

      {/* Search + Filters + View toggle */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="relative w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, phone, market... (/ to focus)"
            style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}
            className="w-full bg-white border border-[rgba(5,14,36,0.08)] rounded-[10px] pl-10 pr-16 py-2 text-[14px] text-[#0B1224] placeholder-[rgba(5,14,36,0.3)] outline-none focus:border-[#2563EB] transition-colors"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[0.58rem] text-gray-400 bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5">Cmd+K</kbd>
        </div>
        <FilterSelect label="Market" value={marketFilter} onChange={setMarketFilter}
          options={[{ value: 'Dallas', label: 'Dallas' }, { value: 'Atlanta', label: 'Atlanta' }, { value: 'Phoenix', label: 'Phoenix' }, { value: 'Tampa', label: 'Tampa' }]} />
        <FilterSelect label="Score" value={scoreFilter} onChange={setScoreFilter}
          options={[{ value: 'A', label: 'A (90+)' }, { value: 'B', label: 'B (70-89)' }, { value: 'C', label: 'C (50-69)' }, { value: 'D', label: 'D (<50)' }]} />
        <FilterSelect label="Motivation" value={motivationFilter} onChange={setMotivationFilter}
          options={[{ value: 'HOT', label: 'Hot' }, { value: 'WARM', label: 'Warm' }, { value: 'COLD', label: 'Cold' }, { value: 'NOT_INTERESTED', label: 'Not Interested' }]} />
        <FilterSelect label="Status" value={statusFilter} onChange={setStatusFilter}
          options={[{ value: 'ACTIVE', label: 'Active' }, { value: 'DORMANT', label: 'Dormant' }, { value: 'HIGH_CONFIDENCE', label: 'High-Confidence' }, { value: 'RECENTLY_VERIFIED', label: 'Recently Verified' }]} />
        <FilterSelect label="Strategy" value={strategyFilter} onChange={setStrategyFilter}
          options={[{ value: 'FLIP', label: 'Flip' }, { value: 'HOLD', label: 'Hold' }, { value: 'BOTH', label: 'Both' }]} />
        <FilterSelect label="Type" value={typeFilter} onChange={setTypeFilter}
          options={[{ value: 'SFR', label: 'SFR' }, { value: 'MULTI_FAMILY', label: 'Multi-Family' }, { value: 'LAND', label: 'Land' }, { value: 'CONDO', label: 'Condo' }]} />
        {tags.length > 0 && (
          <FilterSelect label="Tag" value={tagFilter} onChange={setTagFilter}
            options={tags.map((t) => ({ value: t.name, label: t.label }))} />
        )}
        {hasFilters && (
          <button onClick={clearFilters} className="text-xs text-gray-400 hover:text-red-500 bg-transparent border-0 cursor-pointer">
            Clear
          </button>
        )}

        {/* View toggle */}
        <div className="ml-auto flex items-center border-b border-[rgba(5,14,36,0.08)]">
          {[
            { key: 'list' as const, icon: List, label: 'List' },
            { key: 'pipeline' as const, icon: Columns3, label: 'Pipeline' },
            { key: 'map' as const, icon: MapPin, label: 'Map' },
          ].map((v) => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontSize: '14px', fontWeight: view === v.key ? 600 : 400, color: view === v.key ? '#2563EB' : 'rgba(5,14,36,0.45)', borderBottom: view === v.key ? '2px solid #2563EB' : '2px solid transparent', padding: '12px 16px' }}
              className="flex items-center gap-1.5 bg-transparent border-0 border-b-2 cursor-pointer crm-view-btn transition-colors"
            >
              <v.icon className="w-3.5 h-3.5" /> {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-5 mb-5" style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontSize: '14px', fontWeight: 400, color: 'rgba(5,14,36,0.65)' }}>
        {isLoading ? (
          <span className="flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading...</span>
        ) : (
          <>
            <span><strong style={{ color: '#0B1224', fontWeight: 700 }}>{pagination.total}</strong> buyers</span>
            {Object.entries(stats).map(([key, val]) => (
              <span key={key}>
                <span style={{ color: 'rgba(5,14,36,0.1)' }} className="mr-5">|</span>
                <strong style={{ color: '#0B1224', fontWeight: 700 }}>{val}</strong> {displayStatus(key)}
              </span>
            ))}
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.15)] rounded-[12px] px-4 py-3 mb-4 text-sm text-[#EF4444]">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={refetch} className="text-red-600 hover:text-red-800 bg-transparent border-0 cursor-pointer text-sm font-medium">Try Again</button>
        </div>
      )}

      {/* Archived banner */}
      {showArchived && (
        <div className="flex items-center gap-2 bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.15)] rounded-[12px] px-4 py-2.5 mb-3">
          <Archive className="w-4 h-4 text-[#F59E0B]" />
          <span style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 500, fontSize: '14px', color: '#F59E0B' }}>Viewing archived buyers</span>
          <button onClick={() => { setShowArchived(false); setPage(1) }} className="ml-auto text-[0.78rem] text-[#F59E0B] hover:text-[#D97706] bg-transparent border-0 cursor-pointer underline">
            Back to active buyers
          </button>
        </div>
      )}

      {/* Views */}
      {view === 'list' && (
        <ListView buyers={buyers} isLoading={isLoading} hasFilters={hasFilters} showArchived={showArchived}
          onOpenDetail={handleOpenDetail} onRefetch={refetch} onClearFilters={clearFilters} addToast={addToast} />
      )}
      {view === 'pipeline' && <PipelineView buyers={buyers} isLoading={isLoading} onOpenDetail={handleOpenDetail} />}
      {view === 'map' && <MapView buyers={buyers} onOpenDetail={handleOpenDetail} />}

      {/* Pagination */}
      {view === 'list' && !isLoading && (
        <PaginationBar page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} onPage={setPage} />
      )}

      {/* Modals */}
      {showAddModal && <AddBuyerModal onClose={() => setShowAddModal(false)} onCreated={(msg) => { addToast(msg); refetch() }} />}
      {showImportModal && <ImportModal onClose={() => setShowImportModal(false)} onImported={(msg) => { addToast(msg); refetch() }} />}
      {showDuplicatesModal && <DuplicatesModal onClose={() => setShowDuplicatesModal(false)} onMerged={(msg) => { addToast(msg); refetch() }} />}

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @media (max-width: 1000px) { .crm-pipeline { overflow-x: auto; } }
      `}</style>
    </div>
  )
}
