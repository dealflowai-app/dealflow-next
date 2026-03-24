'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/toast'
import type { FullDealAnalysis } from '@/lib/analysis/deal-analyzer'
import type { PhotoAnalysis } from '@/lib/analysis/photo-analysis'
import type { NeighborhoodIntelligence } from '@/lib/analysis/neighborhood-intel'
import type { DealRecommendations } from '@/lib/analysis/recommendations'
import {
  Search,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Home,
  BedDouble,
  Bath,
  Ruler,
  Calendar,
  MapPin,
  TrendingUp,
  TrendingDown,
  Users,
  Download,
  Store,
  FileSignature,
  Bookmark,
  BarChart3,
  Target,
  DollarSign,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Check,
  AlertTriangle,
  Brain,
  Wrench,
  RefreshCw,
  MoreVertical,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Activity,
  Columns2,
  Camera,
  Upload,
  X,
  Eye,
  Shield,
  Send,
  ExternalLink,
  Lightbulb,
  Clock,
  Zap,
  Phone,
} from 'lucide-react'

/* ═══════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════ */

function fmt(v: number | null | undefined): string {
  if (v == null) return 'N/A'
  return `${v < 0 ? '-' : ''}$${Math.abs(v).toLocaleString()}`
}

function gradeColor(grade: string): string {
  if (grade.startsWith('A')) return 'text-white bg-[#2563EB] border-[#2563EB]'
  if (grade.startsWith('B')) return 'text-white bg-[#60A5FA] border-[#60A5FA]'
  if (grade.startsWith('C')) return 'text-white bg-[#F59E0B] border-[#F59E0B]'
  return 'text-white bg-[rgba(5,14,36,0.3)] border-[rgba(5,14,36,0.3)]'
}

function confidenceBadge(level: string): string {
  if (level === 'high') return 'text-[#2563EB] bg-[rgba(37,99,235,0.08)]'
  if (level === 'medium') return 'text-amber-700 bg-amber-50'
  return 'text-red-700 bg-red-50'
}

function recLabel(rec: string): { text: string; className: string } {
  switch (rec) {
    case 'strong_buy': return { text: 'Strong Buy', className: 'text-white bg-[#2563EB] border-[#2563EB]' }
    case 'buy': return { text: 'Buy', className: 'text-[#2563EB] bg-[rgba(37,99,235,0.08)] border-[#2563EB]' }
    case 'hold': return { text: 'Hold', className: 'text-amber-700 bg-amber-50 border-amber-200' }
    case 'pass': return { text: 'Pass', className: 'text-red-700 bg-red-50 border-red-200' }
    default: return { text: 'Needs Review', className: 'text-gray-700 bg-gray-50 border-gray-200' }
  }
}

function marketLevelBadge(level: string): string {
  if (level === 'hot') return 'text-red-700 bg-red-50'
  if (level === 'warm') return 'text-amber-700 bg-amber-50'
  if (level === 'cool') return 'text-blue-700 bg-blue-50'
  if (level === 'cold') return 'text-indigo-700 bg-indigo-50'
  return 'text-gray-700 bg-gray-50'
}

function relativeTime(dateStr: string): string {
  const d = new Date(dateStr)
  const diff = Date.now() - d.getTime()
  const min = Math.floor(diff / 60000)
  const hr = Math.floor(diff / 3600000)
  const day = Math.floor(diff / 86400000)
  if (min < 1) return 'Just now'
  if (min < 60) return `${min}m ago`
  if (hr < 24) return `${hr}h ago`
  if (day === 1) return 'Yesterday'
  if (day < 7) return `${day}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/* ═══════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════ */

interface HistoryItem {
  id: string
  address: string
  city: string
  state: string
  zip: string
  propertyType: string | null
  askingPrice: number | null
  arv: number | null
  dealScore: number | null
  dealGrade: string | null
  recommendation: string | null
  flipProfit: number | null
  monthlyCashFlow: number | null
  compCount: number | null
  confidence: string | null
  analyzedAt: string
  isExpired: boolean
  savedAsDeal: boolean
  dealId: string | null
}

interface BuyerMatch {
  buyerId: string
  name: string
  matchScore: number
  buyBoxScore: number
  priceScore: number
  strategyScore: number
  timingScore: number
  closeProbScore: number
  status: string
  buyerScore: number
  strategy: string | null
  preferredTypes: string[]
  priceRange: string
  closeSpeed: string | null
  proofOfFunds: boolean
  lastContacted: string
}

interface BuyerPreviewData {
  matches: BuyerMatch[]
  totalBuyers: number
  matchedCount: number
  topScore: number
}

interface Suggestion {
  address: string
  city: string
  state: string
  zip: string
  full: string
}

type PageState = 'input' | 'loading' | 'results'

/* ═══════════════════════════════════════════════
   LOADING STEPS
   ═══════════════════════════════════════════════ */

const LOADING_STEPS = [
  { label: 'Looking up property records...', icon: 'home' },
  { label: 'Pulling comparable sales...', icon: 'target' },
  { label: 'Calculating repair estimates...', icon: 'wrench' },
  { label: 'Running profit analysis...', icon: 'dollar' },
  { label: 'Generating AI summary...', icon: 'brain' },
]

const ANALYSIS_FEATURES = [
  { icon: 'home', title: 'Property Details', desc: 'Beds, baths, sqft, owner, tax records' },
  { icon: 'target', title: 'Comparable Sales', desc: 'Recent sales within 3 miles, scored by relevance' },
  { icon: 'dollar', title: 'ARV Calculation', desc: 'Weighted after-repair value with confidence score' },
  { icon: 'wrench', title: 'Repair Estimate', desc: 'Itemized by category based on condition' },
  { icon: 'trending', title: 'Profit Analysis', desc: 'Flip P&L, rental cash flow, deal score' },
  { icon: 'map', title: 'Market Intelligence', desc: 'Price trends, buyer demand, neighborhood insights' },
]

function FeatureIcon({ icon, className }: { icon: string; className?: string }) {
  const cls = className ?? 'w-4 h-4'
  switch (icon) {
    case 'home': return <Home className={cls} />
    case 'target': return <Target className={cls} />
    case 'dollar': return <DollarSign className={cls} />
    case 'wrench': return <Wrench className={cls} />
    case 'trending': return <TrendingUp className={cls} />
    case 'map': return <MapPin className={cls} />
    case 'brain': return <Brain className={cls} />
    case 'camera': return <Camera className={cls} />
    default: return <BarChart3 className={cls} />
  }
}

function featureIconBg(icon: string): string {
  switch (icon) {
    case 'home': return 'bg-[rgba(37,99,235,0.08)] text-[#2563EB]'
    case 'target': return 'bg-[rgba(37,99,235,0.08)] text-[#2563EB]'
    case 'dollar': return 'bg-amber-50 text-amber-600'
    case 'wrench': return 'bg-orange-50 text-orange-600'
    case 'trending': return 'bg-purple-50 text-purple-600'
    case 'map': return 'bg-indigo-50 text-indigo-600'
    case 'brain': return 'bg-pink-50 text-pink-600'
    case 'camera': return 'bg-cyan-50 text-cyan-600'
    default: return 'bg-gray-50 text-gray-600'
  }
}

/* ═══════════════════════════════════════════════
   SPARKLINE (SVG)
   ═══════════════════════════════════════════════ */

function Sparkline({ data, color = '#2563EB' }: { data: number[]; color?: string }) {
  if (data.length < 2) return null
  const gradId = `sparkGrad-${color.replace('#', '')}`
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const w = 120
  const h = 32
  const step = w / (data.length - 1)
  const points = data.map((v, i) => `${i * step},${h - ((v - min) / range) * (h - 4) - 2}`)
  const path = `M${points.join(' L')}`
  const area = `${path} L${w},${h} L0,${h} Z`

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="flex-shrink-0">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* ═══════════════════════════════════════════════
   INPUT STATE
   ═══════════════════════════════════════════════ */

function InputState({
  onAnalyze,
  history,
  onLoadHistory,
  onReanalyze,
  onDeleteHistory,
  onClearHistory,
  selectedForCompare,
  onToggleCompare,
  onCompare,
  photos,
  onAddPhotos,
  onRemovePhoto,
}: {
  onAnalyze: (address: string, askingPrice?: number, condition?: string, repairCost?: number) => void
  history: HistoryItem[]
  onLoadHistory: (id: string) => void
  onReanalyze: (address: string) => void
  onDeleteHistory: (id: string) => void
  onClearHistory: () => void
  selectedForCompare: string[]
  onToggleCompare: (id: string) => void
  onCompare: () => void
  photos: File[]
  onAddPhotos: (files: File[]) => void
  onRemovePhoto: (index: number) => void
}) {
  const [query, setQuery] = useState('')
  const [selectedAddress, setSelectedAddress] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [showManual, setShowManual] = useState(false)
  const [askingPrice, setAskingPrice] = useState('')
  const [condition, setCondition] = useState('')
  const [repairCost, setRepairCost] = useState('')
  const [manualAddress, setManualAddress] = useState('')
  const [manualCity, setManualCity] = useState('')
  const [manualState, setManualState] = useState('')
  const [manualZip, setManualZip] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Autocomplete
  useEffect(() => {
    if (query.length < 3) {
      setSuggestions([])
      setShowDropdown(false)
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/analysis/autocomplete?q=${encodeURIComponent(query)}`)
        if (res.ok) {
          const data = await res.json()
          setSuggestions(data.suggestions ?? [])
          setShowDropdown(true)
        }
      } catch {
        // silently fail autocomplete
      }
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function selectSuggestion(s: Suggestion) {
    setSelectedAddress(s.full)
    setQuery(s.full)
    setShowDropdown(false)
    setSuggestions([])
  }

  function parseNum(val: string): number | undefined {
    const n = parseInt(val.replace(/[^0-9]/g, ''), 10)
    return n > 0 ? n : undefined
  }

  function handleAnalyze() {
    const address = selectedAddress || query
    if (!address.trim()) return
    onAnalyze(address, parseNum(askingPrice), condition || undefined, parseNum(repairCost))
  }

  function handleManualAnalyze() {
    const parts = [manualAddress, manualCity, manualState, manualZip].filter(Boolean)
    const address = parts.join(', ')
    if (!address.trim()) return
    onAnalyze(address, parseNum(askingPrice), condition || undefined, parseNum(repairCost))
  }

  const photoInputRef = useRef<HTMLInputElement>(null)
  const [photoDragOver, setPhotoDragOver] = useState(false)
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])

  useEffect(() => {
    const urls = photos.map((f) => URL.createObjectURL(f))
    setPhotoPreviews(urls)
    return () => urls.forEach((u) => URL.revokeObjectURL(u))
  }, [photos])

  function handlePhotoFiles(fileList: FileList | null) {
    if (!fileList) return
    const accepted = Array.from(fileList).filter(
      (f) => ['image/jpeg', 'image/png', 'image/webp'].includes(f.type) && f.size <= 5 * 1024 * 1024,
    )
    onAddPhotos(accepted.slice(0, 6 - photos.length))
  }

  const displayHistory = history.slice(0, 6)
  const hasMoreHistory = history.length > 6

  return (
    <div className="pt-4">
      {/* ── Split layout: Input (left) + Preview (right) ── */}
      <div className="grid analyzer-input-grid gap-5" style={{ gridTemplateColumns: '1.5fr 1fr' }}>
        {/* ═══ LEFT: Analysis Input ═══ */}
        <div>
          {/* Address search — focal point */}
          <div className="relative mb-4" ref={dropdownRef}>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setSelectedAddress('')
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAnalyze() }}
                placeholder="Enter any US property address"
                className="w-full bg-white border border-[rgba(5,14,36,0.15)] rounded-[8px] pl-12 pr-[140px] py-4 text-[1rem] text-[#1F2937] placeholder-gray-400 outline-none focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.08)] transition-all"
              />
              <button
                onClick={handleAnalyze}
                disabled={!query.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#2563EB] hover:bg-[#1D4ED8] hover:scale-[1.02] active:scale-[0.98] text-white border-0 rounded-[8px] px-5 py-2.5 text-[0.86rem] font-semibold cursor-pointer transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <Zap className="w-4 h-4" />
                Analyze
              </button>
            </div>
            {/* Autocomplete dropdown */}
            {showDropdown && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[rgba(5,14,36,0.06)] rounded-xl shadow-lg z-20 overflow-hidden">
                {suggestions.map((s, i) => (
                  <button
                    key={`${s.full}-${i}`}
                    onClick={() => selectSuggestion(s)}
                    className="w-full text-left px-4 py-3 hover:bg-[#F9FAFB] transition-colors border-0 bg-transparent cursor-pointer flex items-center gap-3"
                  >
                    <MapPin className="w-4 h-4 text-[#2563EB] flex-shrink-0" />
                    <div>
                      <div className="text-[0.86rem] text-gray-800">{s.address}</div>
                      <div className="text-[0.72rem] text-gray-400">{s.city}, {s.state} {s.zip}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Options card */}
          <div className="bg-white border border-[rgba(5,14,36,0.06)] rounded-xl px-5 py-4">
            {/* Three fields row */}
            <div className="grid grid-cols-3 gap-3 analyzer-options-grid">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[rgba(5,14,36,0.4)] mb-1.5 block">Contract Price</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[0.82rem] text-gray-400">$</span>
                  <input
                    type="text"
                    value={askingPrice}
                    onChange={(e) => setAskingPrice(e.target.value)}
                    placeholder="142,000"
                    className="w-full bg-white border border-[rgba(5,14,36,0.15)] rounded-[8px] pl-7 pr-3 py-2.5 text-[0.88rem] text-gray-800 outline-none focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.08)] transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[rgba(5,14,36,0.4)] mb-1.5 block">Condition</label>
                <div className="relative">
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                    className="appearance-none w-full bg-white border border-[rgba(5,14,36,0.15)] rounded-[8px] pl-3 pr-8 py-2.5 text-[0.88rem] text-gray-800 outline-none focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.08)] cursor-pointer transition-all"
                  >
                    <option value="">Auto-detect</option>
                    <option value="distressed">Distressed</option>
                    <option value="fair">Fair</option>
                    <option value="good">Good</option>
                    <option value="excellent">Excellent</option>
                  </select>
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-1.5">
                    {condition && (
                      <span className={`w-2 h-2 rounded-full ${
                        condition === 'excellent' ? 'bg-[#2563EB]' :
                        condition === 'good' ? 'bg-amber-500' :
                        condition === 'fair' ? 'bg-orange-500' :
                        condition === 'distressed' ? 'bg-red-500' : 'bg-gray-400'
                      }`} />
                    )}
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                  </div>
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[rgba(5,14,36,0.4)] mb-1.5 block">Repair Override</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[0.82rem] text-gray-400">$</span>
                  <input
                    type="text"
                    value={repairCost}
                    onChange={(e) => setRepairCost(e.target.value)}
                    placeholder="Optional"
                    className="w-full bg-white border border-[rgba(5,14,36,0.15)] rounded-[8px] pl-7 pr-3 py-2.5 text-[0.88rem] text-gray-800 outline-none focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.08)] transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Compact photo upload */}
            <div
              className={`mt-3 pt-3 border-t border-gray-100 transition-colors ${photoDragOver ? 'bg-blue-50 rounded-[8px]' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setPhotoDragOver(true) }}
              onDragLeave={() => setPhotoDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setPhotoDragOver(false); handlePhotoFiles(e.dataTransfer.files) }}
            >
              {photos.length === 0 ? (
                <div
                  className="flex items-center gap-3 cursor-pointer group"
                  onClick={() => photoInputRef.current?.click()}
                >
                  <div className="w-8 h-8 rounded-[8px] bg-gray-50 flex items-center justify-center group-hover:bg-[#EFF6FF] transition-colors flex-shrink-0">
                    <Camera className="w-4 h-4 text-gray-400 group-hover:text-[#2563EB] transition-colors" />
                  </div>
                  <span className="text-[0.82rem] text-gray-500 group-hover:text-gray-700 transition-colors">
                    Add property photos for AI condition analysis
                  </span>
                  <span className="text-[0.82rem] text-[#2563EB] font-medium ml-auto flex-shrink-0">Browse</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {photoPreviews.map((url, i) => (
                    <div key={i} className="relative w-10 h-10 rounded-[8px] overflow-hidden border border-gray-200 flex-shrink-0 group/thumb">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={(e) => { e.stopPropagation(); onRemovePhoto(i) }}
                        className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity border-0 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <span className="text-[0.76rem] text-gray-500 ml-1">{photos.length} photo{photos.length !== 1 ? 's' : ''}</span>
                  {photos.length < 6 && (
                    <button
                      onClick={() => photoInputRef.current?.click()}
                      className="text-[0.76rem] text-[#2563EB] font-medium bg-transparent border-0 cursor-pointer hover:text-[#1D4ED8] transition-colors ml-auto"
                    >
                      Add more
                    </button>
                  )}
                </div>
              )}
              <input
                ref={photoInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => handlePhotoFiles(e.target.files)}
              />
            </div>

            {/* Manual entry toggle */}
            <div className="mt-3 pt-3 border-t border-gray-100">
              <button
                onClick={() => setShowManual(!showManual)}
                className="w-full flex items-center justify-between bg-transparent border-0 cursor-pointer text-left py-0.5"
              >
                <span className="text-[0.8rem] text-gray-500 font-medium">Or enter address manually</span>
                {showManual ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
              </button>
              {showManual && (
                <div className="pt-3">
                  <div className="grid grid-cols-2 gap-3 mb-3 analyzer-manual-grid">
                    <div className="col-span-2">
                      <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[rgba(5,14,36,0.4)] mb-1 block">Address</label>
                      <input type="text" value={manualAddress} onChange={(e) => setManualAddress(e.target.value)} placeholder="123 Main St" className="w-full bg-white border border-[rgba(5,14,36,0.15)] rounded-[8px] px-3 py-2 text-[0.86rem] text-gray-800 outline-none focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.08)] transition-all" />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[rgba(5,14,36,0.4)] mb-1 block">City</label>
                      <input type="text" value={manualCity} onChange={(e) => setManualCity(e.target.value)} placeholder="Dallas" className="w-full bg-white border border-[rgba(5,14,36,0.15)] rounded-[8px] px-3 py-2 text-[0.86rem] text-gray-800 outline-none focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.08)] transition-all" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[rgba(5,14,36,0.4)] mb-1 block">State</label>
                        <input type="text" value={manualState} onChange={(e) => setManualState(e.target.value)} placeholder="TX" className="w-full bg-white border border-[rgba(5,14,36,0.15)] rounded-[8px] px-3 py-2 text-[0.86rem] text-gray-800 outline-none focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.08)] transition-all" />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[rgba(5,14,36,0.4)] mb-1 block">Zip</label>
                        <input type="text" value={manualZip} onChange={(e) => setManualZip(e.target.value)} placeholder="75216" className="w-full bg-white border border-[rgba(5,14,36,0.15)] rounded-[8px] px-3 py-2 text-[0.86rem] text-gray-800 outline-none focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.08)] transition-all" />
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleManualAnalyze}
                    className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white border-0 rounded-[8px] py-2.5 text-[0.86rem] font-semibold cursor-pointer transition-all flex items-center justify-center gap-1.5 hover:scale-[1.01] active:scale-[0.99]"
                  >
                    <Zap className="w-4 h-4" />
                    Analyze Deal
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ═══ RIGHT: What you'll get ═══ */}
        <div className="analyzer-preview-card">
          <div className="bg-white border border-[rgba(5,14,36,0.06)] rounded-xl px-5 py-5">
            <div style={{ fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(5,14,36,0.4)' }} className="mb-4">
              Your analysis will include
            </div>
            <div className="space-y-3">
              {ANALYSIS_FEATURES.map((f) => (
                <div key={f.title} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-[8px] flex items-center justify-center flex-shrink-0 ${featureIconBg(f.icon)}`}>
                    <FeatureIcon icon={f.icon} className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[0.82rem] font-medium text-gray-800">{f.title}</div>
                    <div className="text-[0.72rem] text-gray-400 leading-snug">{f.desc}</div>
                  </div>
                </div>
              ))}
              {photos.length > 0 && (
                <div className="flex items-center gap-3 animate-fadeInUp">
                  <div className={`w-8 h-8 rounded-[8px] flex items-center justify-center flex-shrink-0 ${featureIconBg('camera')}`}>
                    <FeatureIcon icon="camera" className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[0.82rem] font-medium text-gray-800">Photo Analysis</div>
                    <div className="text-[0.72rem] text-gray-400 leading-snug">AI condition assessment from your {photos.length} photo{photos.length !== 1 ? 's' : ''}</div>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-5 pt-4 border-t border-gray-100">
              <p className="text-[0.66rem] text-gray-400 leading-relaxed">
                Powered by real-time data from RentCast, FRED, and your CRM
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── History Section ── */}
      {history.length > 0 && (
        <div className="mt-8 pt-6 border-t border-[rgba(5,14,36,0.06)]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[rgba(5,14,36,0.4)]">
                Recent Analyses
              </span>
              <span className="text-[0.68rem] text-gray-400">({history.length})</span>
            </div>
            <div className="flex items-center gap-2">
              {selectedForCompare.length === 2 && (
                <button
                  onClick={onCompare}
                  className="flex items-center gap-1 text-[0.76rem] text-[#2563EB] hover:text-[#1D4ED8] bg-[#EFF6FF] border border-[#BFDBFE] rounded-[8px] px-3 py-1.5 font-medium cursor-pointer transition-colors"
                >
                  <Columns2 className="w-3.5 h-3.5" /> Compare ({selectedForCompare.length})
                </button>
              )}
              <button
                onClick={() => {
                  if (confirm('Clear all analysis history?')) onClearHistory()
                }}
                className="flex items-center gap-1 text-[0.72rem] text-gray-400 hover:text-red-600 bg-transparent border-0 cursor-pointer transition-colors"
              >
                <Trash2 className="w-3 h-3" /> Clear
              </button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 analyzer-history-grid">
            {displayHistory.map((item) => {
              const isSelected = selectedForCompare.includes(item.id)
              return (
                <div
                  key={item.id}
                  className={`bg-white border rounded-xl px-4 py-3.5 cursor-pointer transition-all group relative ${
                    isSelected ? 'border-[#2563EB] ring-1 ring-[#2563EB]/20' : 'border-[rgba(5,14,36,0.06)] hover:border-gray-300'
                  }`}
                  onClick={() => onLoadHistory(item.id)}
                >
                  {/* Compare checkbox */}
                  <div
                    className="absolute top-3 left-3"
                    onClick={(e) => { e.stopPropagation(); onToggleCompare(item.id) }}
                  >
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center cursor-pointer transition-colors ${
                      isSelected ? 'bg-[#2563EB] border-[#2563EB]' : 'border-gray-300 group-hover:border-gray-400'
                    }`}>
                      {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                  </div>

                  {/* Three-dot menu */}
                  <HistoryCardMenu
                    onReanalyze={() => onReanalyze(item.address)}
                    onSaveDeal={() => onLoadHistory(item.id)}
                    onDelete={() => onDeleteHistory(item.id)}
                    savedAsDeal={item.savedAsDeal}
                    dealId={item.dealId}
                  />

                  {/* Address */}
                  <div className="pl-6 pr-6">
                    <div className="text-[0.82rem] text-gray-800 font-medium truncate">{item.address}</div>
                    <div className="text-[0.7rem] text-gray-400 mb-2">{item.city}, {item.state}</div>
                  </div>

                  {/* Score + numbers row */}
                  <div className="flex items-center gap-2 pl-6 mb-2">
                    {item.dealGrade && (
                      <span className={`text-[0.64rem] font-bold px-2 py-0.5 rounded-[8px] border ${gradeColor(item.dealGrade)}`}>
                        {item.dealGrade}
                      </span>
                    )}
                    <span className="text-[0.72rem] text-gray-600">
                      {item.arv != null ? `ARV ${fmt(item.arv)}` : ''}
                    </span>
                    <span className="text-[0.72rem] text-gray-600">
                      {item.flipProfit != null ? `Profit ${fmt(item.flipProfit)}` : item.askingPrice == null ? 'No asking price' : ''}
                    </span>
                  </div>

                  {/* Status row */}
                  <div className="flex items-center gap-1.5 pl-6 flex-wrap">
                    <span className="text-[0.66rem] text-gray-400">{relativeTime(item.analyzedAt)}</span>
                    {item.savedAsDeal && item.dealId && (
                      <Link
                        href={`/deals/${item.dealId}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-[0.62rem] font-medium text-[#2563EB] bg-[rgba(37,99,235,0.08)] px-1.5 py-0.5 rounded no-underline hover:bg-[#EFF6FF]"
                      >
                        Saved
                      </Link>
                    )}
                    {item.isExpired && (
                      <span className="text-[0.62rem] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">Expired</span>
                    )}
                    {item.compCount != null && (
                      <span className="text-[0.62rem] font-medium text-[#2563EB] bg-[#EFF6FF] px-1.5 py-0.5 rounded">{item.compCount} comps</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          {hasMoreHistory && (
            <div className="text-center mt-3">
              <span className="text-[0.76rem] text-gray-400">
                Showing 6 of {history.length} &mdash; load a history item to view older analyses
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════
   HISTORY CARD MENU
   ═══════════════════════════════════════════════ */

function HistoryCardMenu({
  onReanalyze,
  onSaveDeal,
  onDelete,
  savedAsDeal,
  dealId,
}: {
  onReanalyze: () => void
  onSaveDeal: () => void
  onDelete: () => void
  savedAsDeal: boolean
  dealId: string | null
}) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div className="absolute top-3 right-3" ref={menuRef} onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen(!open)}
        className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 bg-transparent border-0 cursor-pointer transition-colors opacity-0 group-hover:opacity-100"
      >
        <MoreVertical className="w-3.5 h-3.5 text-gray-400" />
      </button>
      {open && (
        <div className="absolute right-0 top-7 bg-white border border-[rgba(5,14,36,0.06)] rounded-xl shadow-lg z-30 py-1 min-w-[140px]">
          <button
            onClick={() => { setOpen(false); onReanalyze() }}
            className="w-full text-left px-3 py-2 text-[0.78rem] text-gray-700 hover:bg-[#F9FAFB] bg-transparent border-0 cursor-pointer transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-3 h-3" /> Re-analyze
          </button>
          {!savedAsDeal && (
            <button
              onClick={() => { setOpen(false); onSaveDeal() }}
              className="w-full text-left px-3 py-2 text-[0.78rem] text-gray-700 hover:bg-[#F9FAFB] bg-transparent border-0 cursor-pointer transition-colors flex items-center gap-2"
            >
              <Bookmark className="w-3 h-3" /> Save as Deal
            </button>
          )}
          {savedAsDeal && dealId && (
            <Link
              href={`/deals/${dealId}`}
              className="block px-3 py-2 text-[0.78rem] text-[#2563EB] hover:bg-[#F9FAFB] no-underline transition-colors flex items-center gap-2"
            >
              <ArrowRight className="w-3 h-3" /> View Deal
            </Link>
          )}
          <button
            onClick={() => { setOpen(false); onDelete() }}
            className="w-full text-left px-3 py-2 text-[0.78rem] text-red-600 hover:bg-red-50 bg-transparent border-0 cursor-pointer transition-colors flex items-center gap-2"
          >
            <Trash2 className="w-3 h-3" /> Delete
          </button>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════
   LOADING STATE
   ═══════════════════════════════════════════════ */

function LoadingState({ address }: { address: string }) {
  const [step, setStep] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((prev) => {
        if (prev >= LOADING_STEPS.length - 1) {
          clearInterval(interval)
          return prev
        }
        return prev + 1
      })
    }, 1800)
    return () => clearInterval(interval)
  }, [])

  const progressPct = Math.round(((step + 1) / LOADING_STEPS.length) * 100)

  return (
    <div className="pt-4">
      {/* Disabled address bar (context) */}
      <div className="relative mb-4 opacity-60 pointer-events-none">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
        <div className="w-full bg-white border border-[rgba(5,14,36,0.06)] rounded-xl pl-12 pr-4 py-4 text-[1rem] text-gray-500 truncate">
          {address}
        </div>
      </div>

      {/* Progress card */}
      <div className="bg-white border border-[rgba(5,14,36,0.06)] rounded-xl overflow-hidden mb-5">
        {/* Progress bar */}
        <div className="h-1 bg-gray-100 relative overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#2563EB] to-[#7C3AED] transition-all duration-700 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="px-5 py-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#2563EB] animate-pulse" />
              <span className="text-[0.86rem] font-semibold text-gray-800">Analyzing Property</span>
            </div>
            <span className="text-[0.72rem] text-gray-400 tabular-nums">{progressPct}%</span>
          </div>

          <div className="grid grid-cols-5 gap-2 analyzer-loading-steps">
            {LOADING_STEPS.map((s, i) => (
              <div
                key={s.label}
                className={`flex flex-col items-center gap-1.5 py-2 px-1 rounded-[8px] transition-all duration-500 ${
                  i < step ? 'bg-[rgba(37,99,235,0.08)]' : i === step ? 'bg-[#EFF6FF]' : 'bg-gray-50 opacity-50'
                }`}
              >
                <div className={`w-8 h-8 rounded-[8px] flex items-center justify-center ${
                  i < step ? 'bg-[#DBEAFE]' : i === step ? 'bg-[#DBEAFE]' : 'bg-gray-100'
                }`}>
                  {i < step ? (
                    <CheckCircle2 className="w-4 h-4 text-[#2563EB]" />
                  ) : i === step ? (
                    <Loader2 className="w-4 h-4 text-[#2563EB] animate-spin" />
                  ) : (
                    <FeatureIcon icon={s.icon} className="w-4 h-4 text-gray-400" />
                  )}
                </div>
                <span className={`text-[0.64rem] text-center leading-tight ${
                  i < step ? 'text-[#2563EB] font-medium' : i === step ? 'text-[#2563EB] font-medium' : 'text-gray-400'
                }`}>
                  {s.label.replace('...', '')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Skeleton preview */}
      <div className="grid analyzer-results-grid gap-4 opacity-30" style={{ gridTemplateColumns: '1.5fr 1fr' }}>
        <div className="space-y-4">
          {/* AI Summary skeleton */}
          <div className="bg-white border border-[rgba(5,14,36,0.06)] rounded-xl px-5 py-5">
            <div className="w-24 h-3 bg-gray-200 rounded mb-4 animate-pulse" />
            <div className="space-y-2">
              <div className="w-full h-3 bg-gray-100 rounded animate-pulse" />
              <div className="w-4/5 h-3 bg-gray-100 rounded animate-pulse" />
              <div className="w-3/5 h-3 bg-gray-100 rounded animate-pulse" />
            </div>
          </div>
          {/* Comps skeleton */}
          <div className="bg-white border border-[rgba(5,14,36,0.06)] rounded-xl px-5 py-5">
            <div className="w-32 h-3 bg-gray-200 rounded mb-4 animate-pulse" />
            <div className="space-y-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="flex items-center gap-3">
                  <div className="flex-1 space-y-1.5">
                    <div className="w-3/4 h-3 bg-gray-100 rounded animate-pulse" />
                    <div className="w-1/2 h-2 bg-gray-50 rounded animate-pulse" />
                  </div>
                  <div className="w-16 h-4 bg-gray-100 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-4">
          {/* Financials skeleton */}
          <div className="bg-white border border-[rgba(5,14,36,0.06)] rounded-xl px-5 py-5">
            <div className="w-28 h-3 bg-gray-200 rounded mb-4 animate-pulse" />
            <div className="space-y-2.5">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="flex justify-between">
                  <div className="w-24 h-3 bg-gray-100 rounded animate-pulse" />
                  <div className="w-16 h-3 bg-gray-100 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
          {/* Score skeleton */}
          <div className="bg-white border border-[rgba(5,14,36,0.06)] rounded-xl px-5 py-5">
            <div className="w-20 h-3 bg-gray-200 rounded mb-4 animate-pulse" />
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 animate-pulse" />
              <div className="flex-1 space-y-1.5">
                <div className="w-full h-3 bg-gray-100 rounded animate-pulse" />
                <div className="w-3/4 h-2 bg-gray-50 rounded animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   RESULTS STATE
   ═══════════════════════════════════════════════ */

function ResultsState({
  analysis,
  onBack,
  historyNav,
  onNavigateHistory,
  buyerPreview,
  buyerPreviewLoading,
  photoAnalysis,
  photoAnalysisLoading,
  photos,
  onAddPhotos,
  onRemovePhoto,
  onRunPhotoAnalysis,
  onUpdateCondition,
  recommendations,
  recommendationsLoading,
  sourcePropertyId,
  onAnalyzeAddress,
}: {
  analysis: FullDealAnalysis
  onBack: () => void
  historyNav: { prevId: string | null; nextId: string | null; currentAddress: string; total: number } | null
  onNavigateHistory: (id: string) => void
  buyerPreview: BuyerPreviewData | null
  buyerPreviewLoading: boolean
  photoAnalysis: PhotoAnalysis | null
  photoAnalysisLoading: boolean
  photos: File[]
  onAddPhotos: (files: File[]) => void
  onRemovePhoto: (index: number) => void
  onRunPhotoAnalysis: () => void
  onUpdateCondition: (condition: string) => void
  recommendations: DealRecommendations | null
  recommendationsLoading: boolean
  sourcePropertyId?: string | null
  onAnalyzeAddress: (address: string) => void
}) {
  const toast = useToast()
  const [savedDealId, setSavedDealId] = useState<string | null>(null)
  const [matchCount, setMatchCount] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [matching, setMatching] = useState(false)
  const [listingCreated, setListingCreated] = useState(false)
  const [listingLoading, setListingLoading] = useState(false)
  const [contractCreated, setContractCreated] = useState(false)
  const [contractLoading, setContractLoading] = useState(false)
  const [regeneratingAI, setRegeneratingAI] = useState(false)
  const [aiSummary, setAiSummary] = useState(analysis.aiSummary)
  const [savingAndMatching, setSavingAndMatching] = useState(false)
  const [userARV, setUserARV] = useState<number | null>(null)
  const [compAdjustments, setCompAdjustments] = useState<Record<string, string>>({})
  const [expandedComp, setExpandedComp] = useState<string | null>(null)

  const { property: propData, arv, repairs, flip, rental, dealScore, market, neighborhood } = analysis
  const p = propData.property

  // Effective ARV: user override or system estimate
  const effectiveARV = userARV ?? arv.arv

  const spread = effectiveARV != null && flip ? effectiveARV - flip.purchasePrice : null
  const spreadPct =
    effectiveARV != null && effectiveARV > 0 && flip
      ? Math.round(((effectiveARV - flip.purchasePrice) / effectiveARV) * 100)
      : null

  // 70% Rule calculation
  const maxOffer70 = effectiveARV != null ? Math.round(effectiveARV * 0.7 - repairs.total) : null
  const meetsRule70 = maxOffer70 != null && flip ? flip.purchasePrice <= maxOffer70 : null

  async function saveDeal(): Promise<string | null> {
    if (savedDealId) return savedDealId
    setSaving(true)
    try {
      const res = await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: p.address,
          city: p.city,
          state: p.state,
          zip: p.zip,
          propertyType: p.propertyType ?? 'SFR',
          askingPrice: flip?.purchasePrice ?? null,
          arv: effectiveARV,
          repairCost: repairs.total,
          beds: p.beds,
          baths: p.baths,
          sqft: p.sqft,
          yearBuilt: p.yearBuilt,
          assignFee: flip?.assignmentFee ?? null,
          status: 'ACTIVE',
          propertyId: sourcePropertyId ?? undefined,
        }),
      })
      if (!res.ok) throw new Error('Failed to save deal')
      const data = await res.json()
      setSavedDealId(data.id)
      toast('Deal saved')
      return data.id
    } catch {
      toast('Failed to save deal')
      return null
    } finally {
      setSaving(false)
    }
  }

  async function matchBuyers() {
    setMatching(true)
    try {
      const dealId = await saveDeal()
      if (!dealId) return
      const res = await fetch(`/api/deals/${dealId}/match`, { method: 'POST' })
      if (!res.ok) throw new Error('Matching failed')
      const data = await res.json()
      setMatchCount(data.matches?.length ?? 0)
      toast(`Matched to ${data.matches?.length ?? 0} buyers`)
    } catch {
      toast('Failed to match buyers')
    } finally {
      setMatching(false)
    }
  }

  async function listOnMarketplace() {
    setListingLoading(true)
    try {
      const dealId = await saveDeal()
      if (!dealId) return
      const desc = `${p.propertyType ?? 'SFR'} opportunity. ${p.beds ?? '?'}bd/${p.baths ?? '?'}ba, ${p.sqft ? p.sqft.toLocaleString() : '?'} sqft. ARV ${fmt(arv.arv)}.`
      const res = await fetch('/api/marketplace/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealId,
          headline: `${p.address} \u2014 ${p.city}, ${p.state}`,
          description: desc,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to list')
      }
      setListingCreated(true)
      toast('Listed on Marketplace')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to list on Marketplace')
    } finally {
      setListingLoading(false)
    }
  }

  async function generateContract() {
    setContractLoading(true)
    try {
      const dealId = await saveDeal()
      if (!dealId) return
      const res = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealId, manualBuyer: {}, generatePdf: true }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to generate contract')
      }
      setContractCreated(true)
      toast('Contract generated')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to generate contract')
    } finally {
      setContractLoading(false)
    }
  }

  async function regenerateAISummary() {
    setRegeneratingAI(true)
    try {
      const res = await fetch('/api/analysis/ai-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisData: analysis }),
      })
      if (!res.ok) throw new Error('Failed to regenerate')
      const data = await res.json()
      setAiSummary(data.aiSummary)
      toast('AI summary regenerated')
    } catch {
      toast('Failed to regenerate AI summary')
    } finally {
      setRegeneratingAI(false)
    }
  }

  async function saveAndMatchAll() {
    setSavingAndMatching(true)
    try {
      const dealId = await saveDeal()
      if (!dealId) return
      const res = await fetch(`/api/deals/${dealId}/match`, { method: 'POST' })
      if (!res.ok) throw new Error('Matching failed')
      const data = await res.json()
      setMatchCount(data.matches?.length ?? 0)
      toast(`Saved & matched to ${data.matches?.length ?? 0} buyers`)
      // Navigate to deal detail page
      window.location.href = `/deals/${dealId}`
    } catch {
      toast('Failed to save & match')
    } finally {
      setSavingAndMatching(false)
    }
  }

  async function handleCta(actionType: string, meta?: Record<string, string>) {
    switch (actionType) {
      case 'save_deal':
        await saveDeal()
        break
      case 'run_matching':
        await matchBuyers()
        break
      case 'blast_buyers':
        if (confirm('Save this deal and blast to all matched buyers?')) {
          await saveAndMatchAll()
        }
        break
      case 'list_marketplace':
        await listOnMarketplace()
        break
      case 'contact_buyer':
        if (meta?.buyerId) {
          window.location.href = `/crm/${meta.buyerId}`
        }
        break
      case 'analyze_property':
        // Handled by onAnalyzeAddress
        break
    }
  }

  function handleBack() {
    setSavedDealId(null)
    setMatchCount(null)
    setListingCreated(false)
    setContractCreated(false)
    onBack()
  }

  return (
    <div className="animate-fadeInUp">
      {/* Back + History Nav */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 text-[0.82rem] text-gray-500 hover:text-gray-700 bg-transparent border-0 cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> New Analysis
          </button>
          {sourcePropertyId && (
            <Link
              href={`/discovery?activeProperty=${sourcePropertyId}`}
              className="flex items-center gap-1 text-[0.78rem] text-[#2563EB] hover:underline no-underline"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Back to Discovery
            </Link>
          )}
        </div>
        {historyNav && historyNav.total > 1 && (
          <div className="flex items-center gap-2 text-[0.78rem] text-gray-500">
            <button
              onClick={() => historyNav.prevId && onNavigateHistory(historyNav.prevId)}
              disabled={!historyNav.prevId}
              className="flex items-center gap-0.5 bg-transparent border-0 cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:text-gray-700"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Prev
            </button>
            <span className="text-gray-400 px-1">&middot;</span>
            <button
              onClick={() => historyNav.nextId && onNavigateHistory(historyNav.nextId)}
              disabled={!historyNav.nextId}
              className="flex items-center gap-0.5 bg-transparent border-0 cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:text-gray-700"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Property Header */}
      <div style={{ border: '1px solid rgba(5,14,36,0.06)', borderRadius: '10px' }} className="bg-white px-6 py-5 mb-5">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h2 style={{ fontWeight: 700, fontSize: '24px', color: '#0B1224', letterSpacing: '-0.02em' }} className="mb-1">
              {p.address}
            </h2>
            <p style={{ fontWeight: 400, fontSize: '14px', color: 'rgba(5,14,36,0.5)' }} className="flex items-center gap-1 mb-3">
              <MapPin className="w-3.5 h-3.5" /> {p.city}, {p.state} {p.zip}
            </p>
            <div className="flex items-center gap-4 flex-wrap" style={{ fontWeight: 400, fontSize: '14px', color: 'rgba(5,14,36,0.65)' }}>
              {p.propertyType && (
                <span className="flex items-center gap-1"><Home className="w-3.5 h-3.5" style={{ color: 'rgba(5,14,36,0.4)' }} /> {p.propertyType}</span>
              )}
              {p.beds != null && (
                <span className="flex items-center gap-1"><BedDouble className="w-3.5 h-3.5" style={{ color: 'rgba(5,14,36,0.4)' }} /> {p.beds} Beds</span>
              )}
              {p.baths != null && (
                <span className="flex items-center gap-1"><Bath className="w-3.5 h-3.5" style={{ color: 'rgba(5,14,36,0.4)' }} /> {p.baths} Baths</span>
              )}
              {p.sqft != null && (
                <span className="flex items-center gap-1"><Ruler className="w-3.5 h-3.5" style={{ color: 'rgba(5,14,36,0.4)' }} /> {p.sqft.toLocaleString()} sqft</span>
              )}
              {p.yearBuilt != null && (
                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" style={{ color: 'rgba(5,14,36,0.4)' }} /> Built {p.yearBuilt}</span>
              )}
            </div>
          </div>
          {dealScore && (
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div style={{ fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(5,14,36,0.4)' }} className="mb-1">Deal Score</div>
                <div style={{ fontWeight: 400, fontSize: '12px', color: 'rgba(5,14,36,0.4)' }} className="max-w-[200px] leading-snug">{dealScore.summary}</div>
              </div>
              <div
                className="w-[72px] h-[72px] rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: '#2563EB' }}
              >
                <span className="text-[1.6rem] font-bold text-white">{dealScore.grade}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid analyzer-results-grid gap-4 mb-5" style={{ gridTemplateColumns: '1.5fr 1fr' }}>
        {/* ═══ LEFT COLUMN ═══ */}
        <div className="space-y-4">
          {/* Card 1: AI Summary */}
          {aiSummary && (
            <div className="bg-white border border-[rgba(5,14,36,0.06)] rounded-xl px-5 py-5">
              <div className="flex items-center justify-between mb-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[rgba(5,14,36,0.4)] flex items-center gap-1.5">
                  <Brain className="w-3.5 h-3.5" /> AI Analysis
                </div>
                <button
                  onClick={regenerateAISummary}
                  disabled={regeneratingAI}
                  className="flex items-center gap-1 text-[0.72rem] text-gray-400 hover:text-[#2563EB] bg-transparent border-0 cursor-pointer transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${regeneratingAI ? 'animate-spin' : ''}`} />
                  Regenerate
                </button>
              </div>
              <p className="text-[0.84rem] text-gray-700 leading-relaxed mb-3">{aiSummary.overview}</p>
              {aiSummary.recommendation && (
                <p className="text-[0.82rem] text-gray-800 font-medium mb-3 px-3 py-2 bg-gray-50 rounded-[8px]">
                  {aiSummary.recommendation}
                </p>
              )}
              {aiSummary.bulletPoints.length > 0 && (
                <ul className="space-y-1.5 mb-3">
                  {aiSummary.bulletPoints.map((bp, i) => (
                    <li key={i} className="flex items-start gap-2 text-[0.8rem] text-gray-600">
                      <span className="text-[#2563EB] mt-0.5">&bull;</span>
                      {bp}
                    </li>
                  ))}
                </ul>
              )}
              {aiSummary.model !== 'fallback' && (
                <div className="text-[0.66rem] text-gray-400 pt-2 border-t border-gray-100">
                  Generated by {aiSummary.model} &middot; {new Date(aiSummary.generatedAt).toLocaleString()}
                </div>
              )}
            </div>
          )}

          {/* Card 2: Comparable Sales */}
          <div className="bg-white border border-[rgba(5,14,36,0.06)] rounded-xl px-5 py-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[rgba(5,14,36,0.4)] mb-4 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5" /> Comparable Sales
            </div>
            <div className="space-y-1">
              {arv.scoredComps
                .filter((c) => !c.excluded)
                .slice(0, 6)
                .map((c, i, arr) => {
                  const compKey = `${c.address}-${i}`
                  const isExpanded = expandedComp === compKey
                  return (
                    <div key={compKey} style={{ borderBottom: i < arr.length - 1 ? '1px solid rgba(5,14,36,0.04)' : 'none' }}>
                      <div
                        className="flex items-center gap-3 py-2 bg-white hover:bg-[rgba(37,99,235,0.02)] cursor-pointer"
                        onClick={() => setExpandedComp(isExpanded ? null : compKey)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-[0.8rem] text-gray-800 font-medium truncate">{c.address}</div>
                          <div className="flex items-center gap-2 text-[0.7rem] text-gray-400">
                            <span>{c.beds ?? '?'}bd/{c.baths ?? '?'}ba &middot; {c.sqft ? c.sqft.toLocaleString() : '?'} sqft</span>
                            <span>&middot;</span>
                            <span>{c.distance != null ? `${c.distance.toFixed(1)} mi` : '?'}</span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-[0.84rem] font-semibold text-gray-800">{fmt(c.price)}</div>
                          <div className="text-[0.66rem] text-gray-400">{c.saleDate ?? 'Unknown'}</div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <div
                            className={`text-[0.64rem] font-bold px-2 py-0.5 rounded-full border ${
                              c.relevanceScore >= 80
                                ? 'text-white bg-[#2563EB] border-[#2563EB]'
                                : c.relevanceScore >= 60
                                  ? 'text-[#2563EB] bg-[rgba(37,99,235,0.08)] border-[#2563EB]'
                                  : 'text-amber-700 bg-amber-50 border-amber-200'
                            }`}
                          >
                            {c.relevanceScore}%
                          </div>
                          <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </div>
                      </div>
                      {/* Expanded factor breakdown + adjustment */}
                      {isExpanded && (
                        <div className="pb-3 pl-1 pr-1 space-y-2">
                          {/* Score factors */}
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 bg-gray-50 rounded-[8px] p-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[0.7rem] text-gray-500">Distance</span>
                              <span className="text-[0.7rem] font-medium text-gray-700">{c.distance != null ? `${c.distance.toFixed(1)} mi` : 'Unknown'}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[0.7rem] text-gray-500">Sale Date</span>
                              <span className="text-[0.7rem] font-medium text-gray-700">{c.saleDate ?? 'Unknown'}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[0.7rem] text-gray-500">Size</span>
                              <span className="text-[0.7rem] font-medium text-gray-700">{c.sqft ? `${c.sqft.toLocaleString()} sqft` : 'N/A'}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[0.7rem] text-gray-500">$/sqft</span>
                              <span className="text-[0.7rem] font-medium text-gray-700">{c.pricePerSqft ? `$${Math.round(c.pricePerSqft)}` : 'N/A'}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[0.7rem] text-gray-500">Type</span>
                              <span className="text-[0.7rem] font-medium text-gray-700">{c.propertyType ?? 'Unknown'}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[0.7rem] text-gray-500">Adjusted Price</span>
                              <span className="text-[0.7rem] font-medium text-[#2563EB]">{fmt(c.adjustedPrice)}</span>
                            </div>
                          </div>
                          {/* Price adjustments applied */}
                          {c.adjustments.length > 0 && (
                            <div className="space-y-1">
                              <div className="text-[0.68rem] text-gray-400 font-medium">Auto-adjustments:</div>
                              {c.adjustments.map((adj, j) => (
                                <div key={j} className="flex items-center justify-between text-[0.68rem]">
                                  <span className="text-gray-500">{adj.description}</span>
                                  <span className={adj.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                                    {adj.amount >= 0 ? '+' : ''}{fmt(adj.amount)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                          {/* Manual adjustment input */}
                          <div className="flex items-center gap-2">
                            <span className="text-[0.7rem] text-gray-500">Your adjustment:</span>
                            <input
                              type="text"
                              placeholder="±$0"
                              value={compAdjustments[compKey] ?? ''}
                              onChange={e => setCompAdjustments(prev => ({ ...prev, [compKey]: e.target.value }))}
                              onClick={e => e.stopPropagation()}
                              className="w-24 text-center bg-white border border-gray-200 rounded px-2 py-1 text-[0.74rem] outline-none focus:border-[#2563EB] transition-colors"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
            </div>
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#2563EB]" />
              <span className="text-[0.76rem] text-gray-600">Comp Confidence:</span>
              <span className={`text-[0.72rem] font-medium px-2 py-0.5 rounded-full ${confidenceBadge(arv.confidence.level)}`}>
                {arv.confidence.level.charAt(0).toUpperCase() + arv.confidence.level.slice(1)}
              </span>
              <span className="text-[0.7rem] text-gray-400">
                {arv.compSummary.used} used, {arv.compSummary.excluded} excluded ({arv.confidence.score}/100)
              </span>
            </div>
          </div>

          {/* Photo Condition Analysis */}
          {(photoAnalysis || photoAnalysisLoading) && (
            <PhotoAnalysisCard
              photoAnalysis={photoAnalysis}
              photos={photos}
              loading={photoAnalysisLoading}
              repairEstimate={repairs.total}
              onUpdateCondition={onUpdateCondition}
            />
          )}

          {/* Add Photos (post-analysis) */}
          {!photoAnalysis && !photoAnalysisLoading && (
            <div className="bg-white border border-[rgba(5,14,36,0.06)] rounded-xl px-5 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[rgba(5,14,36,0.4)] mb-3 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5" /> Photo Condition Analysis
              </div>
              {photos.length > 0 ? (
                <div>
                  <PhotoUploadZone photos={photos} onAdd={onAddPhotos} onRemove={onRemovePhoto} />
                  <button
                    onClick={onRunPhotoAnalysis}
                    className="w-full mt-3 flex items-center justify-center gap-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white border-0 rounded-[8px] px-4 py-2.5 text-[0.82rem] font-medium cursor-pointer transition-colors"
                  >
                    <Eye className="w-4 h-4" /> Analyze Photos
                  </button>
                </div>
              ) : (
                <div>
                  <PhotoUploadZone photos={photos} onAdd={onAddPhotos} onRemove={onRemovePhoto} />
                  <p className="text-[0.72rem] text-gray-400 mt-2">Upload property photos for AI-powered condition assessment and more accurate repair estimates</p>
                </div>
              )}
            </div>
          )}

          {/* Card 3: Repair Estimate */}
          <div className="bg-white border border-[rgba(5,14,36,0.06)] rounded-xl px-5 py-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[rgba(5,14,36,0.4)] mb-4 flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5" /> Repair Estimate
            </div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-[1.1rem] font-semibold text-gray-900">{fmt(repairs.total)}</div>
                <div className="text-[0.72rem] text-gray-400">Range: {fmt(repairs.totalLow)} &ndash; {fmt(repairs.totalHigh)}</div>
              </div>
            </div>
            <div className="space-y-2">
              {repairs.breakdown
                .filter((item) => item.applies && item.mid > 0)
                .sort((a, b) => b.mid - a.mid)
                .map((item) => (
                  <div key={item.category} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                    <div>
                      <div className="text-[0.8rem] text-gray-700">{item.category}</div>
                      <div className="text-[0.68rem] text-gray-400">{item.description}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-[0.82rem] font-medium text-gray-800">{fmt(item.mid)}</div>
                      <div className="text-[0.66rem] text-gray-400">{fmt(item.low)} &ndash; {fmt(item.high)}</div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* ═══ RIGHT COLUMN ═══ */}
        <div className="space-y-4">
          {/* Card 4: Deal Financials */}
          <div className="bg-white border border-[rgba(5,14,36,0.06)] rounded-xl px-5 py-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[rgba(5,14,36,0.4)] mb-4 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5" /> Deal Financials
            </div>
            <div className="space-y-2.5 mb-4">
              {/* ARV with override */}
              <div className="flex items-center justify-between">
                <span className="text-[0.8rem] text-gray-500">System ARV</span>
                <span className="text-[0.92rem] font-semibold text-gray-900">{fmt(arv.arv)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[0.8rem] text-gray-500">Your ARV</span>
                <input
                  type="text"
                  value={userARV != null ? `$${userARV.toLocaleString()}` : ''}
                  onChange={e => {
                    const cleaned = e.target.value.replace(/[$,\s]/g, '')
                    setUserARV(cleaned ? parseInt(cleaned) || null : null)
                  }}
                  placeholder={fmt(arv.arv)}
                  className="text-[0.88rem] font-semibold text-[#2563EB] bg-transparent border-b-2 border-dashed border-[rgba(37,99,235,0.3)] focus:border-[#2563EB] outline-none w-32 text-right transition-colors"
                />
              </div>
              {userARV != null && (
                <div className="flex items-center justify-between">
                  <span className="text-[0.8rem] text-gray-500">Effective ARV</span>
                  <span className="text-[0.92rem] font-bold text-[#2563EB]">{fmt(effectiveARV)}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-[0.8rem] text-gray-500">ARV Range</span>
                <span className="text-[0.82rem] text-gray-700">{fmt(arv.arvLow)} &ndash; {fmt(arv.arvHigh)}</span>
              </div>
              {/* ARV methodology */}
              <div className="bg-gray-50 rounded-[8px] p-2.5">
                <div className="text-[0.68rem] text-gray-400 mb-0.5">Calculation: {arv.method === 'weighted_comp_average' ? 'Weighted comp average' : arv.method === 'avm_adjusted' ? 'AVM-adjusted' : arv.method}</div>
                <div className="text-[0.68rem] text-gray-400">Based on {arv.compSummary.used} comps, avg {fmt(arv.compSummary.avgPricePerSqft != null ? Math.round(arv.compSummary.avgPricePerSqft) : null)}/sqft</div>
              </div>
              {flip && (
                <div className="flex items-center justify-between">
                  <span className="text-[0.8rem] text-gray-500">Contract Price</span>
                  <span className="text-[0.92rem] font-semibold text-gray-900">{fmt(flip.purchasePrice)}</span>
                </div>
              )}
              {spread != null && spreadPct != null && (
                <div className="flex items-center justify-between">
                  <span className="text-[0.8rem] text-gray-500">Spread</span>
                  <span className="text-[0.92rem] font-semibold text-[#2563EB]">{fmt(spread)} ({spreadPct}%)</span>
                </div>
              )}
              {arv.breakdown.rentCastAVM != null && (
                <div className="flex items-center justify-between">
                  <span className="text-[0.8rem] text-gray-500">RentCast AVM</span>
                  <span className="text-[0.82rem] text-gray-700">
                    {fmt(arv.breakdown.rentCastAVM)}
                    {arv.breakdown.avmDifferencePercent != null && (
                      <span className={arv.breakdown.avmDifferencePercent > 0 ? 'text-[#2563EB]' : 'text-amber-600'}>
                        {' '}({arv.breakdown.avmDifferencePercent > 0 ? '+' : ''}{arv.breakdown.avmDifferencePercent}%)
                      </span>
                    )}
                  </span>
                </div>
              )}
              {p.lastSalePrice != null && (
                <div className="flex items-center justify-between">
                  <span className="text-[0.8rem] text-gray-500">Last Sale</span>
                  <span className="text-[0.82rem] text-gray-700">
                    {fmt(p.lastSalePrice)}{p.lastSaleDate ? ` \u00b7 ${p.lastSaleDate}` : ''}
                  </span>
                </div>
              )}
              {p.assessedValue != null && (
                <div className="flex items-center justify-between">
                  <span className="text-[0.8rem] text-gray-500">Tax Assessed</span>
                  <span className="text-[0.82rem] text-gray-700">{fmt(p.assessedValue)}</span>
                </div>
              )}
            </div>
            {/* Spread bar */}
            {flip && arv.arv != null && arv.arv > 0 && (
              <div className="bg-gray-50 rounded-[8px] p-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[rgba(5,14,36,0.4)] mb-2">Contract vs ARV</div>
                <div className="relative h-6 rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-[#2563EB] rounded-full"
                    style={{ width: `${Math.min(100, (flip.purchasePrice / arv.arv) * 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[0.66rem] text-gray-400">Contract {fmt(flip.purchasePrice)}</span>
                  <span className="text-[0.66rem] text-[#2563EB] font-medium">{fmt(spread)} spread</span>
                  <span className="text-[0.66rem] text-gray-400">ARV {fmt(arv.arv)}</span>
                </div>
              </div>
            )}
            {/* 70% Rule callout */}
            {maxOffer70 != null && flip && (
              <div className={`mt-4 rounded-[8px] p-3 border ${meetsRule70 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-center gap-1.5 mb-1">
                  {meetsRule70 ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> : <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
                  <span className={`text-[0.78rem] font-bold ${meetsRule70 ? 'text-green-700' : 'text-red-700'}`}>
                    70% Rule: {meetsRule70 ? 'PASS' : 'FAIL'}
                  </span>
                </div>
                <div className="text-[0.72rem] text-gray-600">
                  Max offer: {fmt(maxOffer70)} (ARV &times; 70% &minus; repairs)
                </div>
                <div className="text-[0.72rem] text-gray-600">
                  Asking: {fmt(flip.purchasePrice)} &mdash; {meetsRule70
                    ? <span className="text-green-600 font-medium">{fmt(maxOffer70 - flip.purchasePrice)} under</span>
                    : <span className="text-red-600 font-medium">{fmt(flip.purchasePrice - maxOffer70)} over</span>
                  }
                </div>
              </div>
            )}
            {/* Deal Score factors */}
            {dealScore && (
              <div className="mt-4 pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-[0.72rem] font-bold px-2.5 py-1 rounded-[8px] border ${recLabel(dealScore.recommendation).className}`}>
                    {recLabel(dealScore.recommendation).text}
                  </span>
                  <span className="text-[0.82rem] font-bold text-gray-900">{dealScore.score}/100</span>
                </div>
                {/* Visual factor bars */}
                <div className="space-y-2.5 mb-3">
                  {[
                    { name: 'Spread', score: dealScore.factors.spreadScore, max: 25 },
                    { name: 'Profit', score: dealScore.factors.profitScore, max: 20 },
                    { name: 'ARV Confidence', score: dealScore.factors.compConfidence, max: 20 },
                    { name: 'Market', score: dealScore.factors.marketStrength, max: 15 },
                    { name: 'Entry Price', score: dealScore.factors.entryPrice, max: 10 },
                    { name: 'Rental', score: dealScore.factors.rentalViability, max: 10 },
                  ].map(f => {
                    const pct = f.max > 0 ? Math.round((f.score / f.max) * 100) : 0
                    return (
                      <div key={f.name}>
                        <div className="flex items-center justify-between mb-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500'}`} />
                            <span className="text-[0.72rem] font-medium text-gray-700">{f.name}</span>
                          </div>
                          <span className="text-[0.68rem] font-semibold text-gray-600">{f.score}/{f.max}</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
                {dealScore.strengths.length > 0 && (
                  <div className="space-y-1">
                    {dealScore.strengths.slice(0, 3).map((s, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-[0.72rem] text-[#2563EB]">
                        <CheckCircle2 className="w-3 h-3 mt-0.5 flex-shrink-0" /> {s}
                      </div>
                    ))}
                  </div>
                )}
                {dealScore.risks.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {dealScore.risks.slice(0, 3).map((r, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-[0.72rem] text-amber-700">
                        <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" /> {r}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Card 5: Wholesale + Flip Analysis */}
          {flip ? (
            <div className="bg-white border border-[rgba(5,14,36,0.06)] rounded-xl px-5 py-5">
              {/* Wholesale Assignment Section */}
              <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[rgba(5,14,36,0.4)] mb-3 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5" /> Wholesale Assignment
              </div>
              {maxOffer70 != null && (
                <div className={`rounded-[8px] p-3 mb-4 border ${meetsRule70 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    {meetsRule70 ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> : <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
                    <span className={`text-[0.78rem] font-bold ${meetsRule70 ? 'text-green-700' : 'text-red-700'}`}>
                      70% Rule: {meetsRule70 ? 'PASS' : 'FAIL'}
                    </span>
                  </div>
                  <div className="text-[0.72rem] text-gray-600">
                    Max offer: {fmt(maxOffer70)} (ARV &times; 70% &minus; repairs)
                  </div>
                </div>
              )}
              <div className="space-y-1.5 mb-4 pb-3 border-b border-gray-100">
                <div className="flex justify-between text-[0.8rem]">
                  <span className="text-gray-500">Buyer pays (asking + fee)</span>
                  <span className="font-medium text-gray-700">{fmt(flip.purchasePrice + (flip.assignmentFee ?? 0))}</span>
                </div>
                <div className="flex justify-between text-[0.8rem]">
                  <span className="text-gray-500">Your assignment fee</span>
                  <span className="font-bold text-green-600">{fmt(flip.assignmentFee ?? 0)}</span>
                </div>
                <div className="flex justify-between text-[0.8rem]">
                  <span className="text-gray-500">Your capital at risk</span>
                  <span className="font-medium text-gray-700">$0</span>
                </div>
                <div className="flex justify-between text-[0.8rem] pt-1.5 border-t border-gray-50">
                  <span className="font-semibold text-gray-800">Wholesaler profit</span>
                  <span className="font-bold text-green-600 text-[0.88rem]">{fmt(flip.assignmentFee ?? 0)}</span>
                </div>
              </div>

              {/* Flip P&L Section */}
              <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[rgba(5,14,36,0.4)] mb-3 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" /> Flip Analysis
              </div>
              <div className="space-y-2 mb-3">
                <div className="flex justify-between text-[0.8rem]">
                  <span className="text-gray-500">Repair Cost</span>
                  <span className="text-gray-700 font-medium">{fmt(flip.repairCost)}</span>
                </div>
                <div className="flex justify-between text-[0.8rem]">
                  <span className="text-gray-500">Holding Costs ({flip.holdingCosts.months} mo)</span>
                  <span className="text-gray-700 font-medium">{fmt(flip.holdingCosts.total)}</span>
                </div>
                <div className="flex justify-between text-[0.8rem]">
                  <span className="text-gray-500">Closing Costs</span>
                  <span className="text-gray-700 font-medium">{fmt(flip.closingCosts.total)}</span>
                </div>
                <div className="flex justify-between text-[0.8rem]">
                  <span className="text-gray-500">Total Investment</span>
                  <span className="text-gray-700 font-medium">{fmt(flip.totalInvestment)}</span>
                </div>
                <div className="flex justify-between text-[0.8rem] pt-2 border-t border-gray-100">
                  <span className="text-gray-700 font-medium">Net Profit</span>
                  <span className={`font-bold ${flip.netProfit >= 0 ? 'text-[#2563EB]' : 'text-red-600'}`}>
                    {fmt(flip.netProfit)}
                  </span>
                </div>
                <div className="text-[0.7rem] text-gray-400 text-right">
                  Range: {fmt(flip.netProfitLow)} &ndash; {fmt(flip.netProfitHigh)}
                </div>
                <div className="flex justify-between text-[0.8rem]">
                  <span className="text-gray-500">ROI</span>
                  <span className={`font-bold ${flip.roi >= 0 ? 'text-[#2563EB]' : 'text-red-600'}`}>{flip.roi}%</span>
                </div>
                <div className="flex justify-between text-[0.8rem]">
                  <span className="text-gray-500">Annualized ROI</span>
                  <span className="text-gray-700 font-medium">{flip.roiAnnualized}%</span>
                </div>
                {flip.assignmentFee != null && (
                  <div className="flex justify-between text-[0.8rem]">
                    <span className="text-gray-500">End Buyer Profit</span>
                    <span className="text-gray-700 font-medium">{fmt(flip.endBuyerProfit)} ({flip.endBuyerROI}%)</span>
                  </div>
                )}
              </div>
              {/* Threshold badges */}
              <div className="flex gap-2 flex-wrap">
                <span className={`text-[0.66rem] font-medium px-2 py-0.5 rounded-full border ${meetsRule70 ? 'text-[#2563EB] bg-[rgba(37,99,235,0.08)] border-[#2563EB]' : 'text-red-700 bg-red-50 border-red-200'}`}>
                  {meetsRule70 ? '\u2713' : '\u2717'} 70% Rule
                </span>
                <span className={`text-[0.66rem] font-medium px-2 py-0.5 rounded-full border ${flip.meetsMinSpread ? 'text-[#2563EB] bg-[rgba(37,99,235,0.08)] border-[#2563EB]' : 'text-red-700 bg-red-50 border-red-200'}`}>
                  {flip.meetsMinSpread ? '\u2713' : '\u2717'} Min Spread
                </span>
                <span className={`text-[0.66rem] font-medium px-2 py-0.5 rounded-full border ${flip.meetsMinProfit ? 'text-[#2563EB] bg-[rgba(37,99,235,0.08)] border-[#2563EB]' : 'text-red-700 bg-red-50 border-red-200'}`}>
                  {flip.meetsMinProfit ? '\u2713' : '\u2717'} Min Profit
                </span>
                <span className={`text-[0.66rem] font-medium px-2 py-0.5 rounded-full border ${flip.meetsMinROI ? 'text-[#2563EB] bg-[rgba(37,99,235,0.08)] border-[#2563EB]' : 'text-red-700 bg-red-50 border-red-200'}`}>
                  {flip.meetsMinROI ? '\u2713' : '\u2717'} Min ROI
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-[rgba(5,14,36,0.06)] rounded-xl px-5 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[rgba(5,14,36,0.4)] mb-2 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" /> Flip Analysis
              </div>
              <p className="text-[0.8rem] text-gray-400">Enter an asking price to see flip projections.</p>
            </div>
          )}

          {/* Card 6: Rental Analysis */}
          {rental ? (
            <div className="bg-white border border-[rgba(5,14,36,0.06)] rounded-xl px-5 py-5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[rgba(5,14,36,0.4)] mb-4 flex items-center gap-1.5">
                <Home className="w-3.5 h-3.5" /> Rental Analysis
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[0.8rem]">
                  <span className="text-gray-500">Monthly Rent</span>
                  <span className="text-gray-700 font-medium">{fmt(rental.monthlyRent)}/mo</span>
                </div>
                <div className="text-[0.7rem] text-gray-400 text-right">
                  Range: {fmt(rental.monthlyRentRange.low)} &ndash; {fmt(rental.monthlyRentRange.high)}
                </div>
                <div className="flex justify-between text-[0.8rem]">
                  <span className="text-gray-500">Expenses</span>
                  <span className="text-gray-700 font-medium">{fmt(rental.monthlyExpenses.total)}/mo</span>
                </div>
                <div className="pl-3 space-y-1 text-[0.72rem] text-gray-400">
                  <div className="flex justify-between"><span>Mortgage</span><span>{fmt(rental.monthlyExpenses.mortgage)}</span></div>
                  <div className="flex justify-between"><span>Taxes</span><span>{fmt(rental.monthlyExpenses.taxes)}</span></div>
                  <div className="flex justify-between"><span>Insurance</span><span>{fmt(rental.monthlyExpenses.insurance)}</span></div>
                  <div className="flex justify-between"><span>Maintenance</span><span>{fmt(rental.monthlyExpenses.maintenance)}</span></div>
                  <div className="flex justify-between"><span>Vacancy</span><span>{fmt(rental.monthlyExpenses.vacancy)}</span></div>
                  <div className="flex justify-between"><span>Management</span><span>{fmt(rental.monthlyExpenses.propertyManagement)}</span></div>
                </div>
                <div className="flex justify-between text-[0.8rem] pt-2 border-t border-gray-100">
                  <span className="text-gray-700 font-medium">Monthly Cash Flow</span>
                  <span className={`font-bold ${rental.monthlyCashFlow >= 0 ? 'text-[#2563EB]' : 'text-red-600'}`}>
                    {fmt(rental.monthlyCashFlow)}/mo
                  </span>
                </div>
                <div className="flex justify-between text-[0.8rem]">
                  <span className="text-gray-500">Annual Cash Flow</span>
                  <span className={`font-bold ${rental.annualCashFlow >= 0 ? 'text-[#2563EB]' : 'text-red-600'}`}>
                    {fmt(rental.annualCashFlow)}
                  </span>
                </div>
                <div className="flex justify-between text-[0.8rem]">
                  <span className="text-gray-500">Cap Rate</span>
                  <span className="text-gray-700 font-medium">{rental.capRate}%</span>
                </div>
                <div className="flex justify-between text-[0.8rem]">
                  <span className="text-gray-500">Cash-on-Cash</span>
                  <span className="text-gray-700 font-medium">{rental.cashOnCashReturn}%</span>
                </div>
                <div className="flex justify-between text-[0.8rem]">
                  <span className="text-gray-500">Break-even Rent</span>
                  <span className="text-gray-700 font-medium">{fmt(rental.breakEvenRent)}/mo</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-[rgba(5,14,36,0.06)] rounded-xl px-5 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[rgba(5,14,36,0.4)] mb-2 flex items-center gap-1.5">
                <Home className="w-3.5 h-3.5" /> Rental Analysis
              </div>
              <p className="text-[0.8rem] text-gray-400">Enter an asking price to see rental projections.</p>
            </div>
          )}

          {/* Card 7: Market Intelligence */}
          {market && (
            <div className="bg-white border border-[rgba(5,14,36,0.06)] rounded-xl px-5 py-5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[rgba(5,14,36,0.4)] mb-4 flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5" /> Market Intelligence
              </div>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[0.8rem] text-gray-500">Market Health</span>
                  <span className={`text-[0.72rem] font-medium px-2.5 py-0.5 rounded-full ${marketLevelBadge(market.assessment.level)}`}>
                    {market.assessment.level.charAt(0).toUpperCase() + market.assessment.level.slice(1)} ({market.assessment.score}/100)
                  </span>
                </div>
                {market.priceTrends.medianPrice != null && (
                  <div className="flex items-center justify-between">
                    <span className="text-[0.8rem] text-gray-500">Median Price</span>
                    <span className="text-[0.88rem] font-semibold text-gray-900">{fmt(market.priceTrends.medianPrice)}</span>
                  </div>
                )}
                {market.priceTrends.avgPricePerSqft != null && (
                  <div className="flex items-center justify-between">
                    <span className="text-[0.8rem] text-gray-500">Avg $/sqft</span>
                    <span className="text-[0.82rem] text-gray-700">{fmt(market.priceTrends.avgPricePerSqft)}</span>
                  </div>
                )}
                {market.priceTrends.priceChange6Month != null && (
                  <div className="flex items-center justify-between">
                    <span className="text-[0.8rem] text-gray-500 flex items-center gap-1.5">
                      {market.priceTrends.trend === 'rising' ? (
                        <TrendingUp className="w-3.5 h-3.5 text-[#2563EB]" />
                      ) : market.priceTrends.trend === 'falling' ? (
                        <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                      ) : null}
                      6-Month Trend
                    </span>
                    <span className={`text-[0.88rem] font-semibold ${
                      market.priceTrends.priceChange6Month >= 0 ? 'text-[#2563EB]' : 'text-red-600'
                    }`}>
                      {market.priceTrends.priceChange6Month >= 0 ? '+' : ''}{market.priceTrends.priceChange6Month}%
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-[0.8rem] text-gray-500 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-gray-400" /> Active Buyers
                  </span>
                  <span className="text-[0.88rem] font-semibold text-[#2563EB]">
                    {market.demand.activeBuyerCount}
                    <span className="text-[0.72rem] text-gray-400 font-normal ml-1">
                      ({market.demand.highConfidenceBuyerCount} high-conf)
                    </span>
                  </span>
                </div>
                {market.macro.mortgageRate30yr != null && (
                  <div className="flex items-center justify-between">
                    <span className="text-[0.8rem] text-gray-500">30yr Mortgage</span>
                    <span className="text-[0.82rem] text-gray-700">
                      {market.macro.mortgageRate30yr}% ({market.macro.mortgageRateTrend})
                    </span>
                  </div>
                )}
              </div>
              {/* Sparkline from monthly medians */}
              {market.priceTrends.monthlyMedians.length >= 2 && (
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[rgba(5,14,36,0.4)]">Price Trend</span>
                    <span className="text-[0.68rem] text-gray-400">{market.priceTrends.dataPoints} data points</span>
                  </div>
                  <Sparkline
                    data={market.priceTrends.monthlyMedians.map((m) => m.median)}
                    color={market.priceTrends.trend === 'falling' ? '#EF4444' : '#2563EB'}
                  />
                </div>
              )}
              {/* Market signals */}
              {market.assessment.signals.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
                  {market.assessment.signals.slice(0, 4).map((s, i) => (
                    <div key={i} className={`flex items-start gap-2 text-[0.72rem] ${
                      s.type === 'positive' ? 'text-[#2563EB]' :
                      s.type === 'negative' ? 'text-red-700' : 'text-gray-500'
                    }`}>
                      <span className="mt-0.5">
                        {s.type === 'positive' ? '\u2191' : s.type === 'negative' ? '\u2193' : '\u2192'}
                      </span>
                      {s.signal}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Card 8: Neighborhood Intelligence */}
          {neighborhood && <NeighborhoodCard data={neighborhood} />}

          {/* Buyer Preview */}
          <BuyerPreviewCard
            data={buyerPreview}
            loading={buyerPreviewLoading}
            city={p.city ?? ''}
            onSaveAndMatch={saveAndMatchAll}
            savingAndMatching={savingAndMatching}
          />
        </div>
      </div>

      {/* Recommendations */}
      <RecommendationsPanel
        data={recommendations}
        loading={recommendationsLoading}
        onCta={handleCta}
        onAnalyzeAddress={onAnalyzeAddress}
      />

      {/* Action Bar */}
      <div className="bg-white border border-[rgba(5,14,36,0.06)] rounded-xl px-5 py-3.5 flex items-center gap-2.5 flex-wrap">
        <button
          onClick={listingCreated ? undefined : listOnMarketplace}
          disabled={listingLoading || listingCreated}
          className={`flex items-center gap-1.5 border-0 rounded-[8px] px-4 py-2.5 text-[0.82rem] font-medium cursor-pointer transition-colors disabled:cursor-not-allowed ${
            listingCreated
              ? 'bg-[rgba(37,99,235,0.08)] text-[#2563EB] border border-[#2563EB]'
              : 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white disabled:opacity-60'
          }`}
        >
          {listingLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : listingCreated ? <Check className="w-4 h-4" /> : <Store className="w-4 h-4" />}
          {listingCreated ? 'Listed' : 'List on Marketplace'}
        </button>
        <button
          onClick={matchBuyers}
          disabled={matching}
          className="flex items-center gap-1.5 bg-white border border-[rgba(5,14,36,0.15)] hover:bg-[#F9FAFB] text-[#374151] rounded-[8px] px-4 py-2.5 text-[0.82rem] font-medium cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {matching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
          {matchCount !== null ? `Matched ${matchCount} Buyers` : 'Match to Buyers'}
        </button>
        <button
          onClick={contractCreated ? undefined : generateContract}
          disabled={contractLoading || contractCreated}
          className={`flex items-center gap-1.5 rounded-[8px] px-4 py-2.5 text-[0.82rem] font-medium cursor-pointer transition-colors disabled:cursor-not-allowed ${
            contractCreated
              ? 'bg-[rgba(37,99,235,0.08)] text-[#2563EB] border border-[#2563EB]'
              : 'bg-white border border-[#D1D5DB] hover:bg-[#F9FAFB] text-[#374151] disabled:opacity-60'
          }`}
        >
          {contractLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : contractCreated ? <Check className="w-4 h-4" /> : <FileSignature className="w-4 h-4" />}
          {contractCreated ? 'Contract Created' : 'Generate Contract'}
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 bg-white border border-[rgba(5,14,36,0.15)] hover:bg-[#F9FAFB] text-[#374151] rounded-[8px] px-4 py-2.5 text-[0.82rem] font-medium cursor-pointer transition-colors no-print"
        >
          <Download className="w-4 h-4" /> Export PDF
        </button>
        {savedDealId ? (
          <Link
            href={`/deals/${savedDealId}`}
            className="flex items-center gap-1.5 bg-[rgba(37,99,235,0.08)] border border-[#2563EB] text-[#2563EB] rounded-[8px] px-4 py-2.5 text-[0.82rem] font-medium no-underline hover:bg-[#EFF6FF] transition-colors ml-auto"
          >
            <Check className="w-4 h-4" /> View Deal <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        ) : (
          <button
            onClick={saveDeal}
            disabled={saving}
            className="flex items-center gap-1.5 bg-white border border-[rgba(5,14,36,0.15)] hover:bg-[#F9FAFB] text-[#374151] rounded-[8px] px-4 py-2.5 text-[0.82rem] font-medium cursor-pointer transition-colors ml-auto disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bookmark className="w-4 h-4" />}
            Save as Deal
          </button>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   BUYER PREVIEW CARD
   ═══════════════════════════════════════════════ */

function matchScoreColor(score: number): string {
  if (score >= 80) return 'text-white bg-[#2563EB] border-[#2563EB]'
  if (score >= 60) return 'text-[#2563EB] bg-[rgba(37,99,235,0.08)] border-[#2563EB]'
  if (score >= 40) return 'text-amber-700 bg-amber-50 border-amber-200'
  return 'text-gray-700 bg-gray-50 border-gray-200'
}

function strategyLabel(s: string | null): string {
  if (!s) return 'N/A'
  if (s === 'BOTH') return 'Flip/Hold'
  return s.charAt(0) + s.slice(1).toLowerCase()
}

function BuyerPreviewCard({
  data,
  loading,
  city,
  onSaveAndMatch,
  savingAndMatching,
}: {
  data: BuyerPreviewData | null
  loading: boolean
  city: string
  onSaveAndMatch: () => void
  savingAndMatching: boolean
}) {
  if (loading) {
    return (
      <div className="bg-white border border-[rgba(5,14,36,0.06)] rounded-xl px-5 py-5">
        <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[rgba(5,14,36,0.4)] mb-4 flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" /> Matching Buyers in Your CRM
        </div>
        <div className="flex items-center gap-2 text-[0.82rem] text-gray-400 py-4">
          <Loader2 className="w-4 h-4 animate-spin" /> Finding matching buyers...
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="bg-white border border-[rgba(5,14,36,0.06)] rounded-xl px-5 py-5">
      <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[rgba(5,14,36,0.4)] mb-1 flex items-center gap-1.5">
        <Users className="w-3.5 h-3.5" /> Matching Buyers in Your CRM
      </div>
      {data.matchedCount > 0 ? (
        <>
          <p className="text-[0.8rem] text-gray-500 mb-4">
            <span className="font-semibold text-gray-800">{data.matchedCount} buyer{data.matchedCount !== 1 ? 's' : ''}</span>{' '}
            match this deal <span className="text-gray-400">out of {data.totalBuyers} in your CRM</span>
          </p>
          <div className="space-y-2.5">
            {data.matches.map((m) => (
              <div key={m.buyerId} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/crm/${m.buyerId}`}
                    className="text-[0.82rem] font-medium text-gray-800 hover:text-[#2563EB] no-underline transition-colors truncate block"
                  >
                    {m.name}
                  </Link>
                  <div className="flex items-center gap-2 text-[0.7rem] text-gray-400 mt-0.5 flex-wrap">
                    <span className={`px-1.5 py-0.5 rounded text-[0.64rem] font-medium ${
                      m.strategy === 'FLIP' ? 'text-purple-700 bg-purple-50' :
                      m.strategy === 'HOLD' ? 'text-blue-700 bg-blue-50' :
                      'text-indigo-700 bg-indigo-50'
                    }`}>{strategyLabel(m.strategy)}</span>
                    <span>{m.priceRange}</span>
                    {m.closeSpeed && <span>&middot; {m.closeSpeed}</span>}
                    {m.proofOfFunds && <span className="text-[#2563EB]" title="Proof of funds verified"><Shield className="w-3 h-3 inline" /></span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[0.68rem] text-gray-400">{m.lastContacted}</span>
                  <span className={`text-[0.68rem] font-bold px-2 py-0.5 rounded-full border ${matchScoreColor(m.matchScore)}`}>
                    {m.matchScore}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={onSaveAndMatch}
            disabled={savingAndMatching}
            className="w-full mt-4 flex items-center justify-center gap-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white border-0 rounded-[8px] px-4 py-2.5 text-[0.82rem] font-medium cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {savingAndMatching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {savingAndMatching ? 'Saving & Matching...' : 'Save & Match All'}
          </button>
        </>
      ) : (
        <div className="py-4">
          <p className="text-[0.82rem] text-gray-500 mb-3">
            No buyers in your CRM match this deal&apos;s criteria. Consider adjusting your buyer list or finding new buyers in the {city} market.
          </p>
          <Link
            href={`/discovery?market=${encodeURIComponent(city)}`}
            className="inline-flex items-center gap-1.5 text-[0.82rem] text-[#2563EB] hover:text-[#1D4ED8] no-underline font-medium transition-colors"
          >
            Find Buyers <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════
   PHOTO UPLOAD ZONE
   ═══════════════════════════════════════════════ */

function PhotoUploadZone({
  photos,
  onAdd,
  onRemove,
}: {
  photos: File[]
  onAdd: (files: File[]) => void
  onRemove: (index: number) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [previews, setPreviews] = useState<string[]>([])

  useEffect(() => {
    const urls = photos.map((f) => URL.createObjectURL(f))
    setPreviews(urls)
    return () => urls.forEach((u) => URL.revokeObjectURL(u))
  }, [photos])

  function handleFiles(fileList: FileList | null) {
    if (!fileList) return
    const accepted = Array.from(fileList).filter(
      (f) => ['image/jpeg', 'image/png', 'image/webp'].includes(f.type) && f.size <= 5 * 1024 * 1024,
    )
    const remaining = 6 - photos.length
    onAdd(accepted.slice(0, remaining))
  }

  return (
    <div>
      <div className="text-[0.78rem] font-medium text-gray-600 mb-2 flex items-center gap-1.5">
        <Camera className="w-3.5 h-3.5 text-gray-400" /> Property Photos <span className="text-gray-400 font-normal">(optional)</span>
      </div>
      {photos.length < 6 && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-[8px] px-4 py-4 text-center cursor-pointer transition-colors ${
            dragOver ? 'border-[#2563EB] bg-[#EFF6FF]' : 'border-gray-200 hover:border-gray-300 bg-gray-50'
          }`}
        >
          <Upload className="w-5 h-5 text-gray-400 mx-auto mb-1.5" />
          <p className="text-[0.78rem] text-gray-500">
            Drop photos here or <span className="text-[#2563EB] font-medium">browse</span>
          </p>
          <p className="text-[0.66rem] text-gray-400 mt-0.5">JPG, PNG, WebP &middot; Max 5MB each &middot; Up to {6 - photos.length} more</p>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
      )}
      {photos.length > 0 && (
        <div className="flex gap-2 mt-3 flex-wrap">
          {previews.map((url, i) => (
            <div key={i} className="relative w-[72px] h-[72px] rounded-[8px] overflow-hidden border border-gray-200 flex-shrink-0 group">
              <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
              <button
                onClick={(e) => { e.stopPropagation(); onRemove(i) }}
                className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border-0 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      {photos.length > 0 && (
        <p className="text-[0.68rem] text-gray-400 mt-1.5">
          {photos.length}/6 photo{photos.length !== 1 ? 's' : ''} &middot; AI condition assessment will run with analysis
        </p>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════
   PHOTO ANALYSIS CARD
   ═══════════════════════════════════════════════ */

function conditionColor(condition: string): string {
  switch (condition.toLowerCase()) {
    case 'excellent': case 'good': return 'text-[#2563EB] bg-[rgba(37,99,235,0.08)] border-[#2563EB]'
    case 'fair': return 'text-amber-700 bg-amber-50 border-amber-200'
    case 'poor': case 'distressed': return 'text-red-700 bg-red-50 border-red-200'
    default: return 'text-gray-700 bg-gray-50 border-gray-200'
  }
}

function urgencyDot(urgency: string): string {
  if (urgency === 'high') return 'bg-red-500'
  if (urgency === 'medium') return 'bg-amber-500'
  return 'bg-[#2563EB]'
}

function PhotoAnalysisCard({
  photoAnalysis,
  photos,
  loading,
  repairEstimate,
  onUpdateCondition,
}: {
  photoAnalysis: PhotoAnalysis | null
  photos: File[]
  loading: boolean
  repairEstimate: number | null
  onUpdateCondition: (condition: string) => void
}) {
  const [expandedPhoto, setExpandedPhoto] = useState<number | null>(null)
  const [previews, setPreviews] = useState<string[]>([])

  useEffect(() => {
    const urls = photos.map((f) => URL.createObjectURL(f))
    setPreviews(urls)
    return () => urls.forEach((u) => URL.revokeObjectURL(u))
  }, [photos])

  if (loading) {
    return (
      <div className="bg-white border border-[rgba(5,14,36,0.06)] rounded-xl px-5 py-5">
        <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[rgba(5,14,36,0.4)] mb-4 flex items-center gap-1.5">
          <Camera className="w-3.5 h-3.5" /> Photo Condition Analysis
        </div>
        <div className="flex items-center gap-2 text-[0.82rem] text-gray-400 py-4">
          <Loader2 className="w-4 h-4 animate-spin" /> Analyzing property photos...
        </div>
      </div>
    )
  }

  if (!photoAnalysis) return null

  const pa = photoAnalysis
  const photoRepairMid = pa.estimatedRepairTotal.mid
  const higherEstimate = repairEstimate && photoRepairMid > 0
    ? Math.max(repairEstimate, photoRepairMid)
    : null

  return (
    <div className="bg-white border border-[rgba(5,14,36,0.06)] rounded-xl px-5 py-5">
      <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[rgba(5,14,36,0.4)] mb-4 flex items-center gap-1.5">
        <Camera className="w-3.5 h-3.5" /> Photo Condition Analysis
      </div>

      {/* Overall condition */}
      <div className="flex items-center gap-3 mb-3">
        <span className={`text-[0.76rem] font-bold px-2.5 py-1 rounded-[8px] border ${conditionColor(pa.overallCondition)}`}>
          {pa.overallCondition.charAt(0).toUpperCase() + pa.overallCondition.slice(1)}
        </span>
        <span className="text-[0.82rem] font-semibold text-gray-800">{pa.overallConditionScore}/100</span>
      </div>

      {/* Summary */}
      <p className="text-[0.82rem] text-gray-700 leading-relaxed mb-2">{pa.conditionSummary}</p>
      <p className="text-[0.72rem] text-gray-400 italic mb-4">{pa.confidenceNote}</p>

      {/* Photo thumbnails */}
      {previews.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-3 photo-thumbs-scroll">
          {previews.map((url, i) => (
            <button
              key={i}
              onClick={() => setExpandedPhoto(expandedPhoto === i ? null : i)}
              className={`w-[64px] h-[64px] rounded-[8px] overflow-hidden flex-shrink-0 border-2 cursor-pointer transition-colors ${
                expandedPhoto === i ? 'border-[#2563EB]' : 'border-transparent hover:border-gray-300'
              }`}
            >
              <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Expanded photo assessment */}
      {expandedPhoto !== null && pa.photos[expandedPhoto] && (
        <div className="bg-gray-50 rounded-[8px] p-3 mb-3">
          {previews[expandedPhoto] && (
            <img
              src={previews[expandedPhoto]}
              alt={pa.photos[expandedPhoto].description}
              className="w-full max-h-[200px] object-cover rounded-[8px] mb-2"
            />
          )}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[0.78rem] font-medium text-gray-700">{pa.photos[expandedPhoto].area}</span>
            <span className={`text-[0.66rem] font-medium px-2 py-0.5 rounded-full border ${conditionColor(pa.photos[expandedPhoto].condition)}`}>
              {pa.photos[expandedPhoto].condition}
            </span>
          </div>
          {pa.photos[expandedPhoto].issues.length > 0 && (
            <ul className="space-y-1 mb-2">
              {pa.photos[expandedPhoto].issues.map((issue, j) => (
                <li key={j} className="text-[0.74rem] text-gray-600 flex items-start gap-1.5">
                  <span className="text-gray-400 mt-0.5">&bull;</span> {issue}
                </li>
              ))}
            </ul>
          )}
          {pa.photos[expandedPhoto].repairItems.length > 0 && (
            <div className="space-y-1.5">
              {pa.photos[expandedPhoto].repairItems.map((item, j) => (
                <div key={j} className="flex items-center gap-2 text-[0.74rem]">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${urgencyDot(item.urgency)}`} />
                  <span className="text-gray-700 flex-1">{item.item}</span>
                  <span className="text-gray-500 flex-shrink-0">{item.estimatedCost}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Major issues */}
      {pa.majorIssues.length > 0 && (
        <div className="mb-3">
          <div className="text-[0.72rem] font-medium text-gray-500 mb-1.5">Major Issues</div>
          <ul className="space-y-1">
            {pa.majorIssues.map((issue, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[0.76rem] text-amber-700">
                <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" /> {issue}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Repair estimate from photos */}
      {pa.estimatedRepairTotal.mid > 0 && (
        <div className="bg-gray-50 rounded-[8px] p-3 mb-3">
          <div className="text-[0.72rem] font-medium text-gray-500 mb-1">Photo-Based Repair Estimate</div>
          <div className="text-[1rem] font-semibold text-gray-900">
            ${pa.estimatedRepairTotal.low.toLocaleString()} &ndash; ${pa.estimatedRepairTotal.high.toLocaleString()}
          </div>
          {repairEstimate != null && repairEstimate > 0 && (
            <div className="text-[0.72rem] text-gray-500 mt-1.5">
              Photo analysis: <span className="font-medium">${photoRepairMid.toLocaleString()}</span>
              {' '}&middot; Comp-based estimate: <span className="font-medium">${repairEstimate.toLocaleString()}</span>
              {higherEstimate && higherEstimate !== repairEstimate && (
                <span className="text-amber-700 font-medium">
                  {' '}&middot; Recommended: use ${higherEstimate.toLocaleString()}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Condition suggestion */}
      {pa.overallCondition && (
        <button
          onClick={() => onUpdateCondition(pa.overallCondition)}
          className="text-[0.74rem] text-[#2563EB] hover:text-[#1D4ED8] bg-transparent border-0 cursor-pointer transition-colors p-0"
        >
          Use &ldquo;{pa.overallCondition}&rdquo; as condition input for more accurate estimates &rarr;
        </button>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════
   NEIGHBORHOOD INTELLIGENCE CARD
   ═══════════════════════════════════════════════ */

function signalDot(type: string): string {
  if (type === 'opportunity') return 'bg-[#2563EB]'
  if (type === 'caution') return 'bg-amber-500'
  return 'bg-blue-400'
}

function trendIcon(trend: string) {
  if (trend === 'rising') return <TrendingUp className="w-3.5 h-3.5 text-[#2563EB]" />
  if (trend === 'falling') return <TrendingDown className="w-3.5 h-3.5 text-red-500" />
  return null
}

function demandBadge(level: string): string {
  if (level === 'undersupplied') return 'text-[#2563EB] bg-[rgba(37,99,235,0.08)]'
  if (level === 'oversupplied') return 'text-red-700 bg-red-50'
  return 'text-gray-700 bg-gray-50'
}

function competitionBadge(level: string): string {
  if (level === 'low') return 'text-[#2563EB] bg-[rgba(37,99,235,0.08)]'
  if (level === 'high') return 'text-red-700 bg-red-50'
  return 'text-amber-700 bg-amber-50'
}

function NeighborhoodCard({ data }: { data: NeighborhoodIntelligence }) {
  return (
    <div className="bg-white border border-[rgba(5,14,36,0.06)] rounded-xl px-5 py-5">
      <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[rgba(5,14,36,0.4)] mb-4 flex items-center gap-1.5">
        <MapPin className="w-3.5 h-3.5" /> Neighborhood &mdash; {data.zip}
      </div>

      {/* Zip vs City price comparison bar */}
      {data.zipPricing.medianPrice != null && (
        <div className="mb-4">
          <div className="text-[0.72rem] font-medium text-gray-500 mb-2">Zip vs City Median Price</div>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <div className="text-[0.68rem] text-gray-400 mb-1">Zip {data.zip}</div>
              <div className="h-6 rounded bg-[#2563EB] relative" style={{ width: '100%' }}>
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[0.66rem] text-white font-medium">
                  {fmt(data.zipPricing.medianPrice)}
                </span>
              </div>
            </div>
            {data.zipPricing.comparedToCity != null && (
              <div className="flex-1">
                <div className="text-[0.68rem] text-gray-400 mb-1">City avg</div>
                <div
                  className="h-6 rounded bg-gray-300 relative"
                  style={{ width: `${Math.min(100, Math.max(30, 100 / (1 + (data.zipPricing.comparedToCity ?? 0) / 100)))}%` }}
                >
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[0.66rem] text-gray-600 font-medium">
                    {data.zipPricing.comparedToCity > 0 ? `${data.zipPricing.comparedToCity}% above` : data.zipPricing.comparedToCity < 0 ? `${Math.abs(data.zipPricing.comparedToCity)}% below` : 'Same'}
                  </span>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 mt-2">
            {data.zipPricing.avgPricePerSqft != null && (
              <span className="text-[0.72rem] text-gray-500">Avg {fmt(data.zipPricing.avgPricePerSqft)}/sqft</span>
            )}
            {data.zipPricing.trend !== 'unknown' && (
              <span className="flex items-center gap-1 text-[0.72rem] text-gray-500">
                {trendIcon(data.zipPricing.trend)}
                {data.zipPricing.priceChange6Month != null && (
                  <span className={data.zipPricing.priceChange6Month >= 0 ? 'text-[#2563EB]' : 'text-red-600'}>
                    {data.zipPricing.priceChange6Month >= 0 ? '+' : ''}{data.zipPricing.priceChange6Month}% (6mo)
                  </span>
                )}
              </span>
            )}
            <span className="text-[0.68rem] text-gray-400">{data.zipPricing.saleVolume} sales</span>
          </div>
        </div>
      )}

      {/* Buyer demand */}
      <div className="flex items-center justify-between py-2.5 border-t border-gray-100">
        <span className="text-[0.8rem] text-gray-500 flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-gray-400" /> Buyer Demand
        </span>
        <div className="flex items-center gap-2">
          <span className={`text-[0.72rem] font-medium px-2 py-0.5 rounded-full ${demandBadge(data.buyerDemand.demandVsSupply)}`}>
            {data.buyerDemand.demandVsSupply === 'unknown' ? 'N/A' : data.buyerDemand.demandVsSupply.charAt(0).toUpperCase() + data.buyerDemand.demandVsSupply.slice(1)}
          </span>
          <span className="text-[0.82rem] font-semibold text-gray-800">
            {data.buyerDemand.buyersTargetingZip}
            <span className="text-[0.72rem] text-gray-400 font-normal ml-1">
              in zip ({data.buyerDemand.highConfidenceInZip} high-conf)
            </span>
          </span>
        </div>
      </div>

      {data.buyerDemand.buyersTargetingCity > 0 && (
        <div className="flex items-center justify-between py-1 pl-6">
          <span className="text-[0.72rem] text-gray-400">City-level buyers</span>
          <span className="text-[0.72rem] text-gray-600">{data.buyerDemand.buyersTargetingCity}</span>
        </div>
      )}

      {data.buyerDemand.recentPurchasesInZip > 0 && (
        <div className="flex items-center justify-between py-1 pl-6">
          <span className="text-[0.72rem] text-gray-400">Recent purchases in zip</span>
          <span className="text-[0.72rem] text-gray-600">{data.buyerDemand.recentPurchasesInZip}</span>
        </div>
      )}

      {/* Platform activity */}
      <div className="flex items-center justify-between py-2.5 border-t border-gray-100 mt-1">
        <span className="text-[0.8rem] text-gray-500 flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-gray-400" /> Platform Activity
        </span>
        <span className={`text-[0.72rem] font-medium px-2 py-0.5 rounded-full ${competitionBadge(data.platformActivity.competitionLevel)}`}>
          {data.platformActivity.competitionLevel.charAt(0).toUpperCase() + data.platformActivity.competitionLevel.slice(1)} competition
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 pl-6 text-[0.72rem]">
        <div className="flex justify-between">
          <span className="text-gray-400">Active deals</span>
          <span className="text-gray-600">{data.platformActivity.activeDealsInZip}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Listings</span>
          <span className="text-gray-600">{data.platformActivity.marketplaceListingsInZip}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Recent offers</span>
          <span className="text-gray-600">{data.platformActivity.recentOffersInZip}</span>
        </div>
        {data.platformActivity.avgDealScoreInZip != null && (
          <div className="flex justify-between">
            <span className="text-gray-400">Avg deal score</span>
            <span className="text-gray-600">{data.platformActivity.avgDealScoreInZip}/100</span>
          </div>
        )}
      </div>

      {/* Nearby sales */}
      {data.surroundingProperties.nearbyRecentSales > 0 && (
        <div className="mt-3 pt-2.5 border-t border-gray-100">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[0.8rem] text-gray-500 flex items-center gap-1.5">
              <Home className="w-3.5 h-3.5 text-gray-400" /> Nearby Sales (0.5mi)
            </span>
            <span className="text-[0.82rem] font-semibold text-gray-800">{data.surroundingProperties.nearbyRecentSales} sales</span>
          </div>
          <div className="pl-6 space-y-1 text-[0.72rem]">
            {data.surroundingProperties.nearbyMedianPrice != null && (
              <div className="flex justify-between">
                <span className="text-gray-400">Neighborhood median</span>
                <span className="text-gray-600">{fmt(data.surroundingProperties.nearbyMedianPrice)}</span>
              </div>
            )}
            {data.surroundingProperties.nearbyPricePerSqft != null && (
              <div className="flex justify-between">
                <span className="text-gray-400">Nearby $/sqft</span>
                <span className="text-gray-600">{fmt(data.surroundingProperties.nearbyPricePerSqft)}</span>
              </div>
            )}
            {data.surroundingProperties.priceVsNeighborhood != null && (
              <div className="flex justify-between">
                <span className="text-gray-400">This property vs neighbors</span>
                <span className={`font-medium ${data.surroundingProperties.priceVsNeighborhood < 0 ? 'text-[#2563EB]' : data.surroundingProperties.priceVsNeighborhood > 10 ? 'text-red-600' : 'text-gray-600'}`}>
                  {data.surroundingProperties.priceVsNeighborhood > 0 ? '+' : ''}{data.surroundingProperties.priceVsNeighborhood}%
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Investment signals */}
      {data.signals.length > 0 && (
        <div className="mt-3 pt-2.5 border-t border-gray-100">
          <div className="text-[0.72rem] font-medium text-gray-500 mb-2">Investment Signals</div>
          <div className="space-y-1.5">
            {data.signals.slice(0, 5).map((s, i) => (
              <div key={i} className="flex items-start gap-2 text-[0.74rem]">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${signalDot(s.type)}`} />
                <div>
                  <span className={
                    s.type === 'opportunity' ? 'text-[#2563EB]' :
                    s.type === 'caution' ? 'text-amber-700' : 'text-gray-600'
                  }>{s.signal}</span>
                  {s.detail && <span className="text-gray-400 ml-1">&mdash; {s.detail}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Narrative */}
      {data.narrative && (
        <div className="mt-3 pt-2.5 border-t border-gray-100">
          <div className="text-[0.72rem] font-medium text-gray-500 mb-1.5 flex items-center gap-1">
            <Brain className="w-3 h-3" /> AI Neighborhood Summary
          </div>
          <p className="text-[0.78rem] text-gray-700 leading-relaxed">{data.narrative}</p>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════
   RECOMMENDATIONS PANEL
   ═══════════════════════════════════════════════ */

function priorityDot(p: string): string {
  if (p === 'high') return 'bg-red-500'
  if (p === 'medium') return 'bg-amber-500'
  return 'bg-gray-400'
}

function urgencyIndicator(u: string) {
  if (u === 'now') return <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
  if (u === 'soon') return <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
  return <span className="w-2 h-2 rounded-full bg-gray-400 flex-shrink-0" />
}

function ctaStyle(actionType: string): string {
  if (actionType === 'list_marketplace') return 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white'
  if (actionType === 'analyze_property') return 'bg-[#0B1224] hover:bg-[#1a2744] text-white'
  return 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white'
}

function insightIcon(category: string) {
  switch (category) {
    case 'pricing': return <DollarSign className="w-4 h-4" />
    case 'timing': return <Clock className="w-4 h-4" />
    case 'competition': return <Users className="w-4 h-4" />
    case 'market': return <BarChart3 className="w-4 h-4" />
    case 'strategy': return <Lightbulb className="w-4 h-4" />
    default: return <Lightbulb className="w-4 h-4" />
  }
}

function insightConfidenceBadge(c: string): string {
  if (c === 'high') return 'text-[#2563EB] bg-[rgba(37,99,235,0.08)]'
  if (c === 'medium') return 'text-amber-700 bg-amber-50'
  return 'text-gray-700 bg-gray-50'
}

function RecommendationsPanel({
  data,
  loading,
  onCta,
  onAnalyzeAddress,
}: {
  data: DealRecommendations | null
  loading: boolean
  onCta: (actionType: string, meta?: Record<string, string>) => void
  onAnalyzeAddress: (address: string) => void
}) {
  const [nearbyOpen, setNearbyOpen] = useState(false)

  if (loading) {
    return (
      <div className="bg-[#F8FAFF] border border-[#D4E0FF] rounded-xl px-6 py-5 mb-5">
        <div className="text-xs font-medium text-[#2563EB] uppercase tracking-[0.05em] mb-3 flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5" /> Recommendations
        </div>
        <div className="flex items-center gap-2 text-[0.82rem] text-gray-400 py-3">
          <Loader2 className="w-4 h-4 animate-spin" /> Generating recommendations...
        </div>
      </div>
    )
  }

  if (!data) return null

  const hasActions = data.actions.length > 0
  const hasBuyers = data.buyerActions.length > 0
  const hasNearby = data.nearbyOpportunities.length > 0
  const hasInsights = data.strategicInsights.length > 0

  if (!hasActions && !hasBuyers && !hasNearby && !hasInsights) return null

  return (
    <div className="bg-[#F8FAFF] border border-[#D4E0FF] rounded-xl px-6 py-5 mb-5">
      <div className="text-xs font-medium text-[#2563EB] uppercase tracking-[0.05em] mb-4 flex items-center gap-1.5">
        <Zap className="w-3.5 h-3.5" /> Recommended Next Steps
      </div>

      {/* Section 1: Actions */}
      {hasActions && (
        <div className="mb-5">
          <div className="space-y-2.5">
            {data.actions.map((a, i) => (
              <div key={i} className="flex items-start gap-3 bg-white rounded-xl px-4 py-3 border border-[rgba(5,14,36,0.06)]">
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5 ${priorityDot(a.priority)}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-[0.84rem] text-gray-800 font-medium">{a.action}</div>
                  <div className="text-[0.74rem] text-gray-500 mt-0.5">{a.reason}</div>
                </div>
                <button
                  onClick={() => onCta(a.cta.actionType)}
                  className={`flex items-center gap-1.5 border-0 rounded-[8px] px-3.5 py-2 text-[0.78rem] font-medium cursor-pointer transition-colors flex-shrink-0 ${ctaStyle(a.cta.actionType)}`}
                >
                  {a.cta.label}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 2: Buyers to Contact */}
      {hasBuyers && (
        <div className="mb-5">
          <div className="text-[0.72rem] font-medium text-gray-500 uppercase tracking-[0.05em] mb-2 flex items-center gap-1.5">
            <Phone className="w-3 h-3" /> Buyers to Contact
          </div>
          <div className="space-y-1.5">
            {data.buyerActions.map((b) => (
              <div key={b.buyerId} className="flex items-center gap-3 bg-white rounded-xl px-4 py-2.5 border border-[rgba(5,14,36,0.06)]">
                {urgencyIndicator(b.urgency)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/crm/${b.buyerId}`}
                      className="text-[0.82rem] font-medium text-gray-800 hover:text-[#2563EB] no-underline transition-colors truncate"
                    >
                      {b.name}
                    </Link>
                    <span className={`text-[0.64rem] font-bold px-1.5 py-0.5 rounded-full border ${matchScoreColor(b.matchScore)}`}>
                      {b.matchScore}
                    </span>
                    {b.proofOfFunds && <Shield className="w-3 h-3 text-[#2563EB]" />}
                    {b.strategy && (
                      <span className={`text-[0.62rem] font-medium px-1.5 py-0.5 rounded ${
                        b.strategy === 'FLIP' ? 'text-purple-700 bg-purple-50' :
                        b.strategy === 'HOLD' ? 'text-blue-700 bg-blue-50' :
                        'text-indigo-700 bg-indigo-50'
                      }`}>{strategyLabel(b.strategy)}</span>
                    )}
                  </div>
                  <div className="text-[0.72rem] text-gray-500 mt-0.5">{b.action}</div>
                </div>
                <button
                  onClick={() => onCta('contact_buyer', { buyerId: b.buyerId })}
                  className="flex items-center gap-1 text-[0.74rem] text-[#2563EB] hover:text-[#1D4ED8] bg-transparent border-0 cursor-pointer transition-colors flex-shrink-0 font-medium"
                >
                  <Send className="w-3 h-3" /> Send Deal
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 3: Nearby Opportunities (collapsible) */}
      {hasNearby && (
        <div className="mb-5">
          <button
            onClick={() => setNearbyOpen(!nearbyOpen)}
            className="flex items-center gap-1.5 text-[0.72rem] font-medium text-gray-500 uppercase tracking-[0.05em] mb-2 bg-transparent border-0 cursor-pointer hover:text-gray-700 transition-colors p-0"
          >
            <MapPin className="w-3 h-3" />
            Nearby Properties to Investigate ({data.nearbyOpportunities.length})
            {nearbyOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          {nearbyOpen && (
            <div className="space-y-2">
              {data.nearbyOpportunities.map((opp, i) => (
                <div key={i} className="flex items-start gap-3 bg-white rounded-xl px-4 py-3 border border-[rgba(5,14,36,0.06)]">
                  <div className="flex-1 min-w-0">
                    <div className="text-[0.82rem] text-gray-800 font-medium">{opp.address}</div>
                    <div className="text-[0.7rem] text-gray-400 mb-1">
                      {opp.city}, {opp.state} {opp.zip}
                      {opp.distanceFromSubject != null && ` · ${opp.distanceFromSubject.toFixed(1)} mi`}
                    </div>
                    <div className="flex items-center gap-3 text-[0.72rem] text-gray-500">
                      {opp.lastSalePrice != null && <span>Bought {fmt(opp.lastSalePrice)}{opp.lastSaleDate ? ` (${opp.lastSaleDate.slice(0, 4)})` : ''}</span>}
                      {opp.estimatedValue != null && <span>Est. value {fmt(opp.estimatedValue)}</span>}
                      {opp.sqft != null && <span>{opp.sqft.toLocaleString()} sqft</span>}
                    </div>
                    <div className="text-[0.72rem] text-gray-500 mt-1">{opp.opportunityReason}</div>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className={`text-[0.64rem] font-bold px-2 py-0.5 rounded-full border ${
                      opp.score >= 70 ? 'text-white bg-[#2563EB] border-[#2563EB]' :
                      opp.score >= 50 ? 'text-amber-700 bg-amber-50 border-amber-200' :
                      'text-gray-700 bg-gray-50 border-gray-200'
                    }`}>
                      {opp.score}
                    </span>
                    <button
                      onClick={() => onAnalyzeAddress(`${opp.address}, ${opp.city}, ${opp.state} ${opp.zip}`)}
                      className="flex items-center gap-1 text-[0.72rem] text-[#2563EB] hover:text-[#1D4ED8] bg-transparent border-0 cursor-pointer transition-colors font-medium"
                    >
                      Analyze <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Section 4: Strategic Insights */}
      {hasInsights && (
        <div>
          <div className="text-[0.72rem] font-medium text-gray-500 uppercase tracking-[0.05em] mb-2 flex items-center gap-1.5">
            <Lightbulb className="w-3 h-3" /> Strategic Insights
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {data.strategicInsights.map((ins, i) => (
              <div key={i} className="bg-white rounded-xl px-4 py-3 border border-[rgba(5,14,36,0.06)]">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-gray-400">{insightIcon(ins.category)}</span>
                  <span className="text-[0.66rem] font-medium text-gray-400 uppercase tracking-wider">{ins.category}</span>
                  <span className={`text-[0.6rem] font-medium px-1.5 py-0.5 rounded-full ml-auto ${insightConfidenceBadge(ins.confidence)}`}>
                    {ins.confidence}
                  </span>
                </div>
                <p className="text-[0.78rem] text-gray-700 leading-relaxed">{ins.insight}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════
   COMPARISON VIEW
   ═══════════════════════════════════════════════ */

function ComparisonView({
  items,
  onClose,
}: {
  items: [HistoryItem, HistoryItem]
  onClose: () => void
}) {
  const [a, b] = items

  function better(aVal: number | null, bVal: number | null, higher: boolean): [string, string] {
    if (aVal == null || bVal == null) return ['', '']
    if (aVal === bVal) return ['', '']
    const aWins = higher ? aVal > bVal : aVal < bVal
    return aWins ? ['text-[#2563EB] font-semibold', ''] : ['', 'text-[#2563EB] font-semibold']
  }

  const rows: Array<{ label: string; aVal: string; bVal: string; aClass: string; bClass: string }> = [
    { label: 'Deal Score', aVal: a.dealScore != null ? `${a.dealScore}/100 (${a.dealGrade})` : 'N/A', bVal: b.dealScore != null ? `${b.dealScore}/100 (${b.dealGrade})` : 'N/A', ...(() => { const [ac, bc] = better(a.dealScore, b.dealScore, true); return { aClass: ac, bClass: bc } })() },
    { label: 'ARV', aVal: fmt(a.arv), bVal: fmt(b.arv), ...(() => { const [ac, bc] = better(a.arv, b.arv, true); return { aClass: ac, bClass: bc } })() },
    { label: 'Asking Price', aVal: fmt(a.askingPrice), bVal: fmt(b.askingPrice), ...(() => { const [ac, bc] = better(a.askingPrice, b.askingPrice, false); return { aClass: ac, bClass: bc } })() },
    { label: 'Flip Profit', aVal: fmt(a.flipProfit), bVal: fmt(b.flipProfit), ...(() => { const [ac, bc] = better(a.flipProfit, b.flipProfit, true); return { aClass: ac, bClass: bc } })() },
    { label: 'Monthly Cash Flow', aVal: fmt(a.monthlyCashFlow), bVal: fmt(b.monthlyCashFlow), ...(() => { const [ac, bc] = better(a.monthlyCashFlow, b.monthlyCashFlow, true); return { aClass: ac, bClass: bc } })() },
    { label: 'Comp Count', aVal: a.compCount != null ? `${a.compCount}` : 'N/A', bVal: b.compCount != null ? `${b.compCount}` : 'N/A', ...(() => { const [ac, bc] = better(a.compCount, b.compCount, true); return { aClass: ac, bClass: bc } })() },
    { label: 'Recommendation', aVal: a.recommendation ? recLabel(a.recommendation).text : 'N/A', bVal: b.recommendation ? recLabel(b.recommendation).text : 'N/A', aClass: '', bClass: '' },
  ]

  return (
    <div className="bg-white border border-[rgba(5,14,36,0.06)] rounded-xl px-5 py-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[rgba(5,14,36,0.4)] flex items-center gap-1.5">
          <Columns2 className="w-3.5 h-3.5" /> Deal Comparison
        </div>
        <button
          onClick={onClose}
          className="text-[0.76rem] text-gray-400 hover:text-gray-600 bg-transparent border-0 cursor-pointer transition-colors"
        >
          Close
        </button>
      </div>
      <table className="w-full text-[0.8rem]">
        <thead>
          <tr style={{ backgroundColor: 'rgba(5,14,36,0.02)' }}>
            <th className="text-left py-2 px-2 w-[140px]" style={{ fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(5,14,36,0.4)' }}>&nbsp;</th>
            <th className="text-left py-2 px-2 truncate max-w-[200px]" style={{ fontWeight: 600, fontSize: '13px', color: '#0B1224' }}>{a.address}</th>
            <th className="text-left py-2 px-2 truncate max-w-[200px]" style={{ fontWeight: 600, fontSize: '13px', color: '#0B1224' }}>{b.address}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="bg-white hover:bg-[rgba(37,99,235,0.02)]" style={{ borderBottom: '1px solid rgba(5,14,36,0.04)' }}>
              <td className="py-2 px-2" style={{ fontWeight: 400, fontSize: '12px', color: 'rgba(5,14,36,0.4)' }}>{row.label}</td>
              <td className={`py-2 px-2 ${row.aClass}`}>{row.aVal}</td>
              <td className={`py-2 px-2 ${row.bClass}`}>{row.bVal}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   EXPIRED PROMPT
   ═══════════════════════════════════════════════ */

function ExpiredPrompt({
  item,
  onViewAnyway,
  onReanalyze,
  onDismiss,
}: {
  item: HistoryItem
  onViewAnyway: () => void
  onReanalyze: () => void
  onDismiss: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={onDismiss}>
      <div className="bg-white rounded-xl px-6 py-5 max-w-[400px] shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <span className="text-[0.92rem] font-medium text-gray-800">Stale Analysis</span>
        </div>
        <p className="text-[0.82rem] text-gray-600 mb-4 leading-relaxed">
          This analysis of <span className="font-medium">{item.address}</span> is from {relativeTime(item.analyzedAt)}. The data may be outdated.
        </p>
        <div className="flex gap-2">
          <button
            onClick={onViewAnyway}
            className="flex-1 bg-white border border-[rgba(5,14,36,0.15)] hover:bg-[#F9FAFB] text-[#374151] rounded-[8px] py-2 text-[0.82rem] font-medium cursor-pointer transition-colors"
          >
            View Anyway
          </button>
          <button
            onClick={onReanalyze}
            className="flex-1 bg-[#2563EB] hover:bg-[#1D4ED8] text-white border-0 rounded-[8px] py-2 text-[0.82rem] font-medium cursor-pointer transition-colors"
          >
            Re-analyze
          </button>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════ */

export default function PropertyAnalyzerPage() {
  const toast = useToast()
  const router = useRouter()
  const [page, setPage] = useState<PageState>('input')
  const [analysis, setAnalysis] = useState<FullDealAnalysis | null>(null)
  const [loadingAddress, setLoadingAddress] = useState('')
  const [error, setError] = useState<string | null>(null)

  // History state
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [todayCount, setTodayCount] = useState(0)
  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null)
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([])
  const [showComparison, setShowComparison] = useState(false)
  const [expiredPrompt, setExpiredPrompt] = useState<HistoryItem | null>(null)

  // Photo state
  const [photos, setPhotos] = useState<File[]>([])
  const [photoAnalysis, setPhotoAnalysis] = useState<PhotoAnalysis | null>(null)
  const [photoAnalysisLoading, setPhotoAnalysisLoading] = useState(false)

  // Buyer preview state
  const [buyerPreview, setBuyerPreview] = useState<BuyerPreviewData | null>(null)
  const [buyerPreviewLoading, setBuyerPreviewLoading] = useState(false)

  // Recommendations state
  const [recommendations, setRecommendations] = useState<DealRecommendations | null>(null)
  const [recommendationsLoading, setRecommendationsLoading] = useState(false)

  // Fetch history on mount
  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/analysis/history?limit=50')
      if (!res.ok) return
      const data = await res.json()
      setHistory(data.history ?? [])
      setTodayCount(data.todayCount ?? 0)
    } catch { /* silent */ }
  }, [])

  // Discovery/deal source tracking
  const [sourcePropertyId, setSourcePropertyId] = useState<string | null>(null)

  useEffect(() => { fetchHistory() }, [fetchHistory])

  // Pick up pre-loaded analysis from deal detail "Re-analyze" button
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('analyzer_result')
      if (raw) {
        sessionStorage.removeItem('analyzer_result')
        sessionStorage.removeItem('analyzer_address')
        const result = JSON.parse(raw) as FullDealAnalysis
        setAnalysis(result)
        setPage('results')
        fetchBuyerPreview(result)
        fetchRecommendations(result)
        return
      }
    } catch { /* ignore */ }

    // Handle URL params from Discovery: ?address=...&propertyId=...
    try {
      const params = new URLSearchParams(window.location.search)
      const address = params.get('address')
      const propertyId = params.get('propertyId')
      if (address) {
        if (propertyId) setSourcePropertyId(propertyId)
        window.history.replaceState({}, '', window.location.pathname)
        runAnalysis(decodeURIComponent(address))
      }
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Run analysis (fresh)
  async function runAnalysis(
    address: string,
    askingPrice?: number,
    condition?: string,
    repairCost?: number,
  ) {
    setLoadingAddress(address)
    setPage('loading')
    setError(null)
    setCurrentHistoryId(null)

    try {
      const res = await fetch('/api/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          askingPrice: askingPrice || undefined,
          condition: condition || undefined,
          repairCost: repairCost || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Analysis failed (${res.status})`)
      }

      const data = await res.json()
      const result = data.analysis as FullDealAnalysis
      setAnalysis(result)
      setPage('results')
      fetchHistory() // refresh history in background
      fetchBuyerPreview(result) // auto-fetch buyer matches
      fetchRecommendations(result) // auto-fetch recommendations
      if (photos.length > 0) runPhotoAnalysis() // auto-run photo analysis if photos uploaded
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Analysis failed'
      setError(msg)
      setPage('input')
      toast(msg)
    }
  }

  // Fetch buyer preview for an analysis
  async function fetchBuyerPreview(result: FullDealAnalysis) {
    setBuyerPreviewLoading(true)
    setBuyerPreview(null)
    try {
      const p = result.property.property
      const res = await fetch('/api/analysis/buyer-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: p.city,
          state: p.state,
          zip: p.zip,
          propertyType: p.propertyType,
          askingPrice: result.flip?.purchasePrice ?? null,
          arv: result.arv.arv,
          condition: null,
          beds: p.beds,
          baths: p.baths,
          sqft: p.sqft,
          yearBuilt: p.yearBuilt,
        }),
      })
      if (!res.ok) return
      const data = await res.json()
      setBuyerPreview(data)
    } catch { /* silent */ }
    finally { setBuyerPreviewLoading(false) }
  }

  // Fetch recommendations for an analysis
  async function fetchRecommendations(result: FullDealAnalysis) {
    setRecommendationsLoading(true)
    setRecommendations(null)
    try {
      const res = await fetch('/api/analysis/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysis: result }),
      })
      if (!res.ok) return
      const data = await res.json()
      setRecommendations(data.recommendations)
    } catch { /* silent — recommendations are nice-to-have */ }
    finally { setRecommendationsLoading(false) }
  }

  // Run photo analysis
  async function runPhotoAnalysis() {
    if (photos.length === 0) return
    setPhotoAnalysisLoading(true)
    setPhotoAnalysis(null)
    try {
      // Resize images client-side if > 2MB
      const processedFiles: File[] = []
      for (const photo of photos) {
        if (photo.size > 2 * 1024 * 1024) {
          const resized = await resizeImage(photo, 1600)
          processedFiles.push(resized)
        } else {
          processedFiles.push(photo)
        }
      }

      const formData = new FormData()
      for (const file of processedFiles) {
        formData.append('photos', file)
      }
      if (analysis?.property.property.propertyType) {
        formData.append('propertyType', analysis.property.property.propertyType)
      }
      if (analysis?.property.property.sqft) {
        formData.append('sqft', String(analysis.property.property.sqft))
      }
      if (analysis?.property.property.yearBuilt) {
        formData.append('yearBuilt', String(analysis.property.property.yearBuilt))
      }

      const res = await fetch('/api/analysis/photo-analysis', {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Photo analysis failed')
      }
      const data = await res.json()
      setPhotoAnalysis(data.photoAnalysis)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Photo analysis failed')
    } finally {
      setPhotoAnalysisLoading(false)
    }
  }

  // Client-side image resize using canvas
  function resizeImage(file: File, maxDim: number): Promise<File> {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        let { width, height } = img
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, width, height)
        canvas.toBlob(
          (blob) => {
            resolve(new File([blob!], file.name, { type: 'image/jpeg' }))
          },
          'image/jpeg',
          0.85,
        )
        URL.revokeObjectURL(img.src)
      }
      img.src = URL.createObjectURL(file)
    })
  }

  // Photo management
  function addPhotos(files: File[]) {
    setPhotos((prev) => [...prev, ...files].slice(0, 6))
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index))
  }

  // Update condition from photo analysis suggestion
  function handleUpdateCondition(condition: string) {
    if (!analysis) return
    toast(`Condition updated to "${condition}". Re-run analysis to apply.`)
    // Re-run with the photo-suggested condition
    const p = analysis.property.property
    const addr = `${p.address}, ${p.city}, ${p.state} ${p.zip}`
    runAnalysis(addr, analysis.flip?.purchasePrice, condition)
  }

  // Load a cached analysis from history
  async function loadHistoryItem(id: string, force = false) {
    const item = history.find((h) => h.id === id)
    if (!item) return

    // Show expired prompt if stale and not forced
    if (item.isExpired && !force) {
      setExpiredPrompt(item)
      return
    }

    try {
      const res = await fetch(`/api/analysis/history/${id}`)
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()

      // Check if the cached result is a FullDealAnalysis (has arv field)
      const result = data.analysis
      if (!result || !result.arv) {
        // Old PropertyAnalysis-only cache entry — re-analyze instead
        toast('Cached data incomplete \u2014 running fresh analysis')
        runAnalysis(data.rawAddress ?? item.address)
        return
      }

      const fullResult = result as FullDealAnalysis
      setAnalysis(fullResult)
      setCurrentHistoryId(id)
      setPage('results')
      fetchBuyerPreview(fullResult) // auto-fetch buyer preview
      fetchRecommendations(fullResult) // auto-fetch recommendations
    } catch {
      toast('Failed to load analysis')
    }
  }

  // Delete a history item
  async function deleteHistoryItem(id: string) {
    try {
      const res = await fetch(`/api/analysis/history/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setHistory((prev) => prev.filter((h) => h.id !== id))
      setSelectedForCompare((prev) => prev.filter((s) => s !== id))
      toast('Analysis removed')
    } catch {
      toast('Failed to delete')
    }
  }

  // Clear all history
  async function clearHistory() {
    try {
      const res = await fetch('/api/analysis/history', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clearAll: true }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setHistory([])
      setSelectedForCompare([])
      toast(`Cleared ${data.deleted} analyses`)
    } catch {
      toast('Failed to clear history')
    }
  }

  // Toggle compare selection (max 2)
  function toggleCompare(id: string) {
    setSelectedForCompare((prev) => {
      if (prev.includes(id)) return prev.filter((s) => s !== id)
      if (prev.length >= 2) return [prev[1], id]
      return [...prev, id]
    })
  }

  // Open comparison view
  function openComparison() {
    if (selectedForCompare.length !== 2) return
    setShowComparison(true)
  }

  // Navigate history from ResultsState
  function navigateHistory(id: string) {
    loadHistoryItem(id, true) // force-load even if expired when navigating
  }

  // Compute history nav for ResultsState
  const historyNav = currentHistoryId && history.length > 1 ? (() => {
    const idx = history.findIndex((h) => h.id === currentHistoryId)
    if (idx === -1) return null
    return {
      prevId: idx > 0 ? history[idx - 1].id : null,
      nextId: idx < history.length - 1 ? history[idx + 1].id : null,
      currentAddress: history[idx].address,
      total: history.length,
    }
  })() : null

  // Get comparison items
  const comparisonItems = showComparison && selectedForCompare.length === 2
    ? [
        history.find((h) => h.id === selectedForCompare[0]),
        history.find((h) => h.id === selectedForCompare[1]),
      ].filter(Boolean) as [HistoryItem, HistoryItem]
    : null

  return (
    <div className="p-4 sm:p-8 max-w-[1200px] bg-[#F9FAFB]">
      {/* Back to My Deals */}
      <Link
        href="/deals"
        className="inline-flex items-center gap-1.5 text-[0.78rem] text-[rgba(5,14,36,0.45)] hover:text-[rgba(5,14,36,0.7)] no-underline transition-colors mb-4"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to My Deals
      </Link>

      {/* Header + API Usage */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1
            style={{ fontWeight: 700, fontSize: '24px', color: '#0B1224', letterSpacing: '-0.02em' }}
            className="mb-1"
          >
            Analyze Deal
          </h1>
          <p style={{ fontWeight: 400, fontSize: '14px', color: 'rgba(5,14,36,0.5)' }}>
            Instant ARV, comps, and deal scoring for any property.
          </p>
        </div>
        {todayCount > 0 && (
          <div className={`flex items-center gap-1.5 text-[0.76rem] px-3 py-1.5 rounded-[8px] ${
            todayCount > 25 ? 'text-amber-700 bg-amber-50 border border-amber-200' : 'text-gray-500 bg-gray-50'
          }`}>
            <Activity className="w-3.5 h-3.5" />
            {todayCount} analys{todayCount === 1 ? 'is' : 'es'} today
            {todayCount > 25 && <span className="font-medium ml-1">&middot; Approaching limit</span>}
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-5 flex items-center gap-2 text-[0.84rem]">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Comparison view */}
      {comparisonItems && (
        <ComparisonView
          items={comparisonItems}
          onClose={() => setShowComparison(false)}
        />
      )}

      {page === 'input' && (
        <InputState
          onAnalyze={runAnalysis}
          history={history}
          onLoadHistory={(id) => loadHistoryItem(id)}
          onReanalyze={(address) => runAnalysis(address)}
          onDeleteHistory={deleteHistoryItem}
          onClearHistory={clearHistory}
          selectedForCompare={selectedForCompare}
          onToggleCompare={toggleCompare}
          onCompare={openComparison}
          photos={photos}
          onAddPhotos={addPhotos}
          onRemovePhoto={removePhoto}
        />
      )}
      {page === 'loading' && <LoadingState address={loadingAddress} />}
      {page === 'results' && analysis && (
        <ResultsState
          analysis={analysis}
          onBack={() => {
            setPage('input')
            setAnalysis(null)
            setCurrentHistoryId(null)
            setBuyerPreview(null)
            setPhotoAnalysis(null)
            setRecommendations(null)
          }}
          historyNav={historyNav}
          onNavigateHistory={navigateHistory}
          buyerPreview={buyerPreview}
          buyerPreviewLoading={buyerPreviewLoading}
          photoAnalysis={photoAnalysis}
          photoAnalysisLoading={photoAnalysisLoading}
          photos={photos}
          onAddPhotos={addPhotos}
          onRemovePhoto={removePhoto}
          onRunPhotoAnalysis={runPhotoAnalysis}
          onUpdateCondition={handleUpdateCondition}
          recommendations={recommendations}
          recommendationsLoading={recommendationsLoading}
          sourcePropertyId={sourcePropertyId}
          onAnalyzeAddress={(address) => {
            setPage('input')
            setAnalysis(null)
            setRecommendations(null)
            setBuyerPreview(null)
            setPhotoAnalysis(null)
            // Pre-fill and run
            runAnalysis(address)
          }}
        />
      )}

      {/* Expired prompt modal */}
      {expiredPrompt && (
        <ExpiredPrompt
          item={expiredPrompt}
          onViewAnyway={() => {
            const id = expiredPrompt.id
            setExpiredPrompt(null)
            loadHistoryItem(id, true)
          }}
          onReanalyze={() => {
            const addr = expiredPrompt.address
            setExpiredPrompt(null)
            runAnalysis(addr)
          }}
          onDismiss={() => setExpiredPrompt(null)}
        />
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 999px) {
          .analyzer-results-grid { grid-template-columns: 1fr !important; }
          .analyzer-input-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 900px) {
          .analyzer-manual-grid { grid-template-columns: 1fr !important; }
          .analyzer-options-grid { grid-template-columns: 1fr !important; }
          .analyzer-history-grid { grid-template-columns: 1fr !important; }
          .analyzer-loading-steps { grid-template-columns: repeat(3, 1fr) !important; }
        }
        @media (max-width: 640px) {
          .analyzer-preview-card { display: none !important; }
          .analyzer-loading-steps { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (min-width: 901px) and (max-width: 1100px) {
          .analyzer-history-grid { grid-template-columns: 1fr 1fr !important; }
        }
        .photo-thumbs-scroll::-webkit-scrollbar { height: 4px; }
        .photo-thumbs-scroll::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 2px; }
        @media print {
          nav, aside, .sidebar, .no-print, header, footer { display: none !important; }
          body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .analyzer-results-grid { grid-template-columns: 1fr 1fr !important; }
          .bg-\\[\\#F9FAFB\\] { background: white !important; }
          .rounded-xl { border: 1px solid #e5e7eb !important; page-break-inside: avoid; }
          * { box-shadow: none !important; }
        }
      ` }} />
    </div>
  )
}
