'use client'

import { useState } from 'react'
import { useToast } from '@/components/toast'
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
  Clock,
  FileText,
  Download,
  Store,
  FileSignature,
  Bookmark,
  BarChart3,
  Target,
  DollarSign,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react'

/* ═══════════════════════════════════════════════
   RECENT ANALYSES
   ═══════════════════════════════════════════════ */
const recentAnalyses = [
  { address: '1847 Oak St, Dallas TX 75216', date: 'Mar 12, 2026', score: 'A-', scoreColor: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  { address: '5100 Samuell Blvd, Dallas TX 75228', date: 'Mar 10, 2026', score: 'B+', scoreColor: 'text-[#2563EB] bg-[#EFF6FF] border-[#BFDBFE]' },
  { address: '902 Cactus Rd, Phoenix AZ 85003', date: 'Mar 8, 2026', score: 'A', scoreColor: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  { address: '3340 W Illinois Ave, Dallas TX 75211', date: 'Mar 5, 2026', score: 'C+', scoreColor: 'text-amber-700 bg-amber-50 border-amber-200' },
  { address: '1083 Peachtree Ct, Atlanta GA 30310', date: 'Mar 2, 2026', score: 'A-', scoreColor: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
]

/* ═══════════════════════════════════════════════
   COMP DATA
   ═══════════════════════════════════════════════ */
const comps = [
  { address: '1823 Oak St', price: 252000, date: 'Feb 2026', distance: '0.1 mi', beds: 3, baths: 2, sqft: 1780, match: 94 },
  { address: '1910 Maple Ave', price: 238000, date: 'Jan 2026', distance: '0.3 mi', beds: 3, baths: 2, sqft: 1650, match: 91 },
  { address: '2004 Cedar Dr', price: 249000, date: 'Feb 2026', distance: '0.2 mi', beds: 3, baths: 2, sqft: 1820, match: 89 },
  { address: '1755 Birch Ln', price: 241000, date: 'Dec 2025', distance: '0.4 mi', beds: 3, baths: 1, sqft: 1590, match: 87 },
  { address: '1901 Elm Ct', price: 246000, date: 'Jan 2026', distance: '0.5 mi', beds: 4, baths: 2, sqft: 1900, match: 84 },
]

/* ═══════════════════════════════════════════════
   PRICE TREND DATA (sparkline)
   ═══════════════════════════════════════════════ */
const priceTrend = [210, 215, 218, 222, 225, 228]

/* ═══════════════════════════════════════════════
   INPUT STATE
   ═══════════════════════════════════════════════ */
function InputState({ onAnalyze }: { onAnalyze: () => void }) {
  const [showManual, setShowManual] = useState(false)
  const [searchVal, setSearchVal] = useState('')

  return (
    <div className="max-w-[720px] mx-auto pt-8">
      {/* Hero */}
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-[#F3F4F6] flex items-center justify-center mx-auto mb-4">
          <BarChart3 className="w-7 h-7 text-[#6B7280]" />
        </div>
        <h1 style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
          className="text-[1.5rem] font-normal text-[var(--navy-heading,#0B1224)] mb-2"
        >
          Analyze Any Deal in Seconds
        </h1>
        <p className="text-sm text-[#9CA3AF] max-w-[480px] mx-auto leading-relaxed">
          Enter a property address to get ARV, repair estimates, profit projections, and a deal score.
        </p>
      </div>

      {/* Search bar */}
      <div className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchVal}
            onChange={e => setSearchVal(e.target.value)}
            placeholder="Enter property address..."
            className="w-full bg-white border border-[#E5E7EB] rounded-lg pl-12 pr-4 py-3.5 text-[0.92rem] text-[#374151] placeholder-gray-400 outline-none focus:border-[#2563EB] transition-all"
          />
        </div>
        <button
          onClick={onAnalyze}
          className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white border-0 rounded-md px-7 py-3.5 text-[0.88rem] font-medium cursor-pointer transition-colors flex items-center gap-2"
        >
          Analyze
        </button>
      </div>

      {/* Manual entry toggle */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg mb-8">
        <button
          onClick={() => setShowManual(!showManual)}
          className="w-full flex items-center justify-between px-5 py-3.5 bg-transparent border-0 cursor-pointer text-left"
        >
          <span className="text-[0.84rem] text-gray-600 font-medium">Or enter details manually</span>
          {showManual ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>
        {showManual && (
          <div className="px-5 pb-5 pt-1 border-t border-gray-100">
            <div className="grid grid-cols-2 gap-3 mb-3 analyzer-manual-grid">
              <div className="col-span-2">
                <label className="text-[0.72rem] text-gray-500 mb-1 block">Address</label>
                <input type="text" placeholder="123 Main St" className="w-full bg-gray-50 border border-[#E5E7EB] rounded-lg px-3 py-2 text-[0.82rem] text-gray-700 outline-none focus:border-[#2563EB]" />
              </div>
              <div>
                <label className="text-[0.72rem] text-gray-500 mb-1 block">City</label>
                <input type="text" placeholder="Dallas" className="w-full bg-gray-50 border border-[#E5E7EB] rounded-lg px-3 py-2 text-[0.82rem] text-gray-700 outline-none focus:border-[#2563EB]" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[0.72rem] text-gray-500 mb-1 block">State</label>
                  <input type="text" placeholder="TX" className="w-full bg-gray-50 border border-[#E5E7EB] rounded-lg px-3 py-2 text-[0.82rem] text-gray-700 outline-none focus:border-[#2563EB]" />
                </div>
                <div>
                  <label className="text-[0.72rem] text-gray-500 mb-1 block">Zip</label>
                  <input type="text" placeholder="75216" className="w-full bg-gray-50 border border-[#E5E7EB] rounded-lg px-3 py-2 text-[0.82rem] text-gray-700 outline-none focus:border-[#2563EB]" />
                </div>
              </div>
              <div>
                <label className="text-[0.72rem] text-gray-500 mb-1 block">Property Type</label>
                <div className="relative">
                  <select className="appearance-none w-full bg-gray-50 border border-[#E5E7EB] rounded-lg pl-3 pr-8 py-2 text-[0.82rem] text-gray-700 outline-none focus:border-[#2563EB] cursor-pointer">
                    <option>SFR</option><option>Multi-Family</option><option>Condo</option><option>Land</option><option>Commercial</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[0.72rem] text-gray-500 mb-1 block">Beds</label>
                  <input type="text" placeholder="3" className="w-full bg-gray-50 border border-[#E5E7EB] rounded-lg px-3 py-2 text-[0.82rem] text-gray-700 outline-none focus:border-[#2563EB]" />
                </div>
                <div>
                  <label className="text-[0.72rem] text-gray-500 mb-1 block">Baths</label>
                  <input type="text" placeholder="2" className="w-full bg-gray-50 border border-[#E5E7EB] rounded-lg px-3 py-2 text-[0.82rem] text-gray-700 outline-none focus:border-[#2563EB]" />
                </div>
                <div>
                  <label className="text-[0.72rem] text-gray-500 mb-1 block">Sq Ft</label>
                  <input type="text" placeholder="1,750" className="w-full bg-gray-50 border border-[#E5E7EB] rounded-lg px-3 py-2 text-[0.82rem] text-gray-700 outline-none focus:border-[#2563EB]" />
                </div>
              </div>
              <div>
                <label className="text-[0.72rem] text-gray-500 mb-1 block">Year Built</label>
                <input type="text" placeholder="1978" className="w-full bg-gray-50 border border-[#E5E7EB] rounded-lg px-3 py-2 text-[0.82rem] text-gray-700 outline-none focus:border-[#2563EB]" />
              </div>
              <div>
                <label className="text-[0.72rem] text-gray-500 mb-1 block">Asking / Contract Price</label>
                <input type="text" placeholder="$142,000" className="w-full bg-gray-50 border border-[#E5E7EB] rounded-lg px-3 py-2 text-[0.82rem] text-gray-700 outline-none focus:border-[#2563EB]" />
              </div>
              <div className="col-span-2">
                <label className="text-[0.72rem] text-gray-500 mb-1 block">Estimated Repair Level</label>
                <div className="relative">
                  <select className="appearance-none w-full bg-gray-50 border border-[#E5E7EB] rounded-lg pl-3 pr-8 py-2 text-[0.82rem] text-gray-700 outline-none focus:border-[#2563EB] cursor-pointer">
                    <option>Cosmetic</option><option>Moderate</option><option>Full Rehab</option><option>Tear Down</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>
            <button
              onClick={onAnalyze}
              className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white border-0 rounded-md py-2.5 text-[0.84rem] font-medium cursor-pointer transition-colors flex items-center justify-center gap-2"
            >
              Run Analysis
            </button>
          </div>
        )}
      </div>

      {/* Recent Analyses */}
      <div>
        <div className="text-xs font-medium text-[#6B7280] uppercase tracking-[0.05em] mb-3">Recent Analyses</div>
        <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden">
          {recentAnalyses.map((a, i) => (
            <div
              key={a.address}
              className={`flex items-center justify-between px-5 py-3.5 ${i < recentAnalyses.length - 1 ? 'border-b border-gray-50' : ''} hover:bg-[#F9FAFB] transition-colors`}
            >
              <div className="flex items-center gap-3">
                <span className={`text-[0.72rem] font-bold px-2.5 py-1 rounded-lg border ${a.scoreColor}`}>{a.score}</span>
                <div>
                  <div className="text-[0.84rem] text-gray-800 font-medium">{a.address}</div>
                  <div className="text-[0.72rem] text-gray-400">{a.date}</div>
                </div>
              </div>
              <button
                onClick={onAnalyze}
                className="text-[0.76rem] text-[#2563EB] hover:text-[#1D4ED8] bg-transparent border-0 cursor-pointer transition-colors font-medium"
              >
                View Again
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   SPARKLINE
   ═══════════════════════════════════════════════ */
function Sparkline({ data, color = '#2563EB' }: { data: number[]; color?: string }) {
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
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#sparkGrad)" />
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* ═══════════════════════════════════════════════
   RESULTS STATE
   ═══════════════════════════════════════════════ */
function ResultsState({ onBack }: { onBack: () => void }) {
  const toast = useToast()
  /* Waterfall data for flip */
  const arv = 245000
  const contract = 142000
  const repair = 38000
  const holding = 4200
  const assignment = 25000
  const buyerProfit = 35800

  return (
    <div className="animate-fadeInUp">
      {/* Back */}
      <button onClick={onBack} className="flex items-center gap-1.5 text-[0.82rem] text-gray-500 hover:text-gray-700 mb-4 bg-transparent border-0 cursor-pointer transition-colors">
        <ArrowLeft className="w-4 h-4" /> New Analysis
      </button>

      {/* Property header */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg px-6 py-5 mb-5">
        <div className="flex items-start justify-between">
          <div>
            <h2
              className="text-[1.5rem] font-normal text-[var(--navy-heading,#0B1224)] mb-1"
            >
              1847 Oak Street
            </h2>
            <p className="text-sm text-[#9CA3AF] flex items-center gap-1 mb-3">
              <MapPin className="w-3.5 h-3.5" /> Dallas, TX 75216
            </p>
            <div className="flex items-center gap-4 text-[0.8rem] text-gray-500">
              <span className="flex items-center gap-1"><Home className="w-3.5 h-3.5 text-gray-400" /> SFR</span>
              <span className="flex items-center gap-1"><BedDouble className="w-3.5 h-3.5 text-gray-400" /> 3 Beds</span>
              <span className="flex items-center gap-1"><Bath className="w-3.5 h-3.5 text-gray-400" /> 2 Baths</span>
              <span className="flex items-center gap-1"><Ruler className="w-3.5 h-3.5 text-gray-400" /> 1,750 sqft</span>
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-gray-400" /> Built 1978</span>
            </div>
          </div>
          {/* Deal Score */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs font-medium text-[#6B7280] uppercase tracking-[0.05em] mb-1">Deal Score</div>
              <div className="text-[0.76rem] text-gray-500 max-w-[200px] leading-snug">Strong flip opportunity with high equity and reliable comps</div>
            </div>
            <div className="w-[72px] h-[72px] rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center flex-shrink-0">
              <span className="text-emerald-700 text-[1.6rem] font-bold">A-</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2x2 Grid */}
      <div className="grid grid-cols-2 gap-4 mb-5 analyzer-grid">
        {/* Section 1: Valuation */}
        <div className="bg-white border border-[#E5E7EB] rounded-lg px-5 py-5">
          <div className="text-xs font-medium text-[#6B7280] uppercase tracking-[0.05em] mb-4 flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5" /> Valuation
          </div>
          <div className="space-y-2.5 mb-5">
            <div className="flex items-center justify-between">
              <span className="text-[0.8rem] text-gray-500">Estimated ARV</span>
              <span className="text-[0.92rem] font-semibold text-gray-900">$245,000</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[0.8rem] text-gray-500">Contract Price</span>
              <span className="text-[0.92rem] font-semibold text-gray-900">$142,000</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[0.8rem] text-gray-500">Estimated Equity</span>
              <span className="text-[0.92rem] font-semibold text-emerald-600">42%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[0.8rem] text-gray-500">Last Sale</span>
              <span className="text-[0.82rem] text-gray-700">$98,000 · Mar 2019</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[0.8rem] text-gray-500">Tax Assessed</span>
              <span className="text-[0.82rem] text-gray-700">$156,200</span>
            </div>
          </div>
          {/* Bar visualization: Contract vs ARV */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs font-medium text-[#6B7280] uppercase tracking-[0.05em] mb-2">Contract vs ARV Spread</div>
            <div className="relative h-6 rounded-full bg-gray-200 overflow-hidden">
              <div className="absolute inset-y-0 left-0 bg-[#2563EB] rounded-full" style={{ width: `${(contract / arv) * 100}%` }} />
              <div className="absolute inset-y-0 left-0 flex items-center" style={{ width: `${(contract / arv) * 100}%`, paddingRight: 8 }}>
                <span className="text-[0.62rem] text-white font-bold ml-2">$142K</span>
              </div>
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[0.66rem] text-gray-400">Contract</span>
              <span className="text-[0.66rem] text-emerald-600 font-medium">$103K spread (42%)</span>
              <span className="text-[0.66rem] text-gray-400">ARV $245K</span>
            </div>
          </div>
        </div>

        {/* Section 2: Comparable Sales */}
        <div className="bg-white border border-[#E5E7EB] rounded-lg px-5 py-5">
          <div className="text-xs font-medium text-[#6B7280] uppercase tracking-[0.05em] mb-4 flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5" /> Comparable Sales
          </div>
          <div className="space-y-2">
            {comps.map((c, i) => (
              <div key={c.address} className={`flex items-center gap-3 py-2 ${i < comps.length - 1 ? 'border-b border-gray-50' : ''}`}>
                <div className="flex-1 min-w-0">
                  <div className="text-[0.8rem] text-gray-800 font-medium truncate">{c.address}</div>
                  <div className="flex items-center gap-2 text-[0.7rem] text-gray-400">
                    <span>{c.beds}bd/{c.baths}ba · {c.sqft.toLocaleString()} sqft</span>
                    <span>·</span>
                    <span>{c.distance}</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-[0.84rem] font-semibold text-gray-800">
                    ${c.price.toLocaleString()}
                  </div>
                  <div className="text-[0.66rem] text-gray-400">{c.date}</div>
                </div>
                <div className={`text-[0.64rem] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${
                  c.match >= 90 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' :
                  c.match >= 85 ? 'text-[#2563EB] bg-[#EFF6FF] border-[#BFDBFE]' :
                  'text-amber-700 bg-amber-50 border-amber-200'
                }`}>
                  {c.match}%
                </div>
              </div>
            ))}
          </div>
          {/* Confidence */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-[0.76rem] text-gray-600">Comp Confidence:</span>
            <span className="text-[0.72rem] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">High</span>
            <span className="text-[0.7rem] text-gray-400">5 comps within 0.5 mi in last 90 days</span>
          </div>
        </div>

        {/* Section 3: Profit Projections */}
        <div className="bg-white border border-[#E5E7EB] rounded-lg px-5 py-5">
          <div className="text-xs font-medium text-[#6B7280] uppercase tracking-[0.05em] mb-4 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" /> Profit Projections
          </div>
          <div className="grid grid-cols-2 gap-4">
            {/* Flip Scenario */}
            <div className="bg-gray-50 rounded-lg px-4 py-3.5">
              <div className="text-[0.72rem] font-semibold text-gray-700 uppercase tracking-wide mb-3">Flip Scenario</div>
              <div className="space-y-2 mb-3">
                <div className="flex justify-between text-[0.76rem]">
                  <span className="text-gray-500">Repair Cost</span>
                  <span className="text-gray-700 font-medium">$38,000</span>
                </div>
                <div className="flex justify-between text-[0.76rem]">
                  <span className="text-gray-500">Holding Costs</span>
                  <span className="text-gray-700 font-medium">$4,200</span>
                </div>
                <div className="flex justify-between text-[0.76rem]">
                  <span className="text-gray-500">Assignment Fee</span>
                  <span className="text-[#2563EB] font-semibold">$25,000</span>
                </div>
                <div className="flex justify-between text-[0.76rem] pt-1.5 border-t border-[#E5E7EB]">
                  <span className="text-gray-700 font-medium">Buyer Net Profit</span>
                  <span className="text-emerald-600 font-bold">$35,800</span>
                </div>
                <div className="flex justify-between text-[0.76rem]">
                  <span className="text-gray-500">ROI</span>
                  <span className="text-emerald-600 font-bold">25.2%</span>
                </div>
              </div>
              {/* Waterfall bar */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[0.58rem] text-gray-400 w-10 text-right">ARV</span>
                  <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-[#2563EB] rounded-full" style={{ width: '100%' }} />
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[0.58rem] text-gray-400 w-10 text-right">Cost</span>
                  <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full" style={{ width: `${((contract + repair + holding) / arv) * 100}%` }} />
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[0.58rem] text-gray-400 w-10 text-right">Profit</span>
                  <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${((buyerProfit + assignment) / arv) * 100}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Rental Scenario */}
            <div className="bg-gray-50 rounded-lg px-4 py-3.5">
              <div className="text-[0.72rem] font-semibold text-gray-700 uppercase tracking-wide mb-3">Rental Scenario</div>
              <div className="space-y-2 mb-3">
                <div className="flex justify-between text-[0.76rem]">
                  <span className="text-gray-500">Monthly Rent</span>
                  <span className="text-gray-700 font-medium">$1,850</span>
                </div>
                <div className="flex justify-between text-[0.76rem]">
                  <span className="text-gray-500">Monthly Expenses</span>
                  <span className="text-gray-700 font-medium">$620</span>
                </div>
                <div className="flex justify-between text-[0.76rem] pt-1.5 border-t border-[#E5E7EB]">
                  <span className="text-gray-700 font-medium">Monthly Cash Flow</span>
                  <span className="text-emerald-600 font-bold">$1,230</span>
                </div>
                <div className="flex justify-between text-[0.76rem]">
                  <span className="text-gray-500">Annual Cash Flow</span>
                  <span className="text-emerald-600 font-bold">$14,760</span>
                </div>
                <div className="flex justify-between text-[0.76rem]">
                  <span className="text-gray-500">Cap Rate</span>
                  <span className="text-emerald-600 font-bold">6.0%</span>
                </div>
              </div>
              {/* Income vs expense bar */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[0.58rem] text-gray-400 w-14 text-right">Income</span>
                  <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-[#2563EB] rounded-full" style={{ width: '100%' }} />
                  </div>
                  <span className="text-[0.58rem] text-gray-500 w-10">$1,850</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[0.58rem] text-gray-400 w-14 text-right">Expenses</span>
                  <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full" style={{ width: `${(620 / 1850) * 100}%` }} />
                  </div>
                  <span className="text-[0.58rem] text-gray-500 w-10">$620</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[0.58rem] text-gray-400 w-14 text-right">Cash Flow</span>
                  <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(1230 / 1850) * 100}%` }} />
                  </div>
                  <span className="text-[0.58rem] text-gray-500 w-10">$1,230</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Market Context */}
        <div className="bg-white border border-[#E5E7EB] rounded-lg px-5 py-5">
          <div className="text-xs font-medium text-[#6B7280] uppercase tracking-[0.05em] mb-4 flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5" /> Market Context: 75216
          </div>
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[0.8rem] text-gray-500 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-gray-400" /> Avg Days on Market
              </span>
              <span className="text-[0.88rem] font-semibold text-gray-900">18</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[0.8rem] text-gray-500 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-gray-400" /> Median Sale Price (6 mo)
              </span>
              <span className="text-[0.88rem] font-semibold text-gray-900">$228,000</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[0.8rem] text-gray-500 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> Price Trend (YoY)
              </span>
              <span className="text-[0.88rem] font-semibold text-emerald-600 flex items-center gap-1.5">
                +4.2%
                <TrendingUp className="w-4 h-4" />
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[0.8rem] text-gray-500 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-gray-400" /> Active Cash Buyers (this zip)
              </span>
              <span className="text-[0.88rem] font-semibold text-[#2563EB]">34</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[0.8rem] text-gray-500">Buyer Demand Level</span>
              <span className="text-[0.72rem] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">High</span>
            </div>
          </div>
          {/* Price trend sparkline */}
          <div className="mt-4 pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-[#6B7280] uppercase tracking-[0.05em]">6-Month Price Trend</span>
              <span className="text-[0.68rem] text-gray-400">Oct – Mar</span>
            </div>
            <div className="flex items-center gap-3">
              <Sparkline data={priceTrend} color="#10b981" />
              <div className="text-[0.72rem] text-gray-500">
                {priceTrend.map((v, i) => {
                  const months = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar']
                  if (i === 0 || i === priceTrend.length - 1) {
                    return <span key={i} className="mr-2">{months[i]}: ${v}K</span>
                  }
                  return null
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg px-5 py-3.5 flex items-center gap-2.5 flex-wrap">
        <button onClick={() => toast('Coming soon')} className="flex items-center gap-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white border-0 rounded-md px-4 py-2.5 text-[0.82rem] font-medium cursor-pointer transition-colors">
          <Store className="w-4 h-4" /> List on Marketplace
        </button>
        <button onClick={() => toast('Coming soon')} className="flex items-center gap-1.5 bg-white border border-[#D1D5DB] hover:bg-[#F9FAFB] text-[#374151] rounded-md px-4 py-2.5 text-[0.82rem] font-medium cursor-pointer transition-colors">
          <Users className="w-4 h-4" /> Match to 34 Buyers
        </button>
        <button onClick={() => toast('Coming soon')} className="flex items-center gap-1.5 bg-white border border-[#D1D5DB] hover:bg-[#F9FAFB] text-[#374151] rounded-md px-4 py-2.5 text-[0.82rem] font-medium cursor-pointer transition-colors">
          <FileSignature className="w-4 h-4" /> Generate Contract
        </button>
        <button onClick={() => toast('Coming soon')} className="flex items-center gap-1.5 bg-white border border-[#D1D5DB] hover:bg-[#F9FAFB] text-[#374151] rounded-md px-4 py-2.5 text-[0.82rem] font-medium cursor-pointer transition-colors">
          <Download className="w-4 h-4" /> Export as PDF
        </button>
        <button onClick={() => toast('Coming soon')} className="flex items-center gap-1.5 bg-white border border-[#D1D5DB] hover:bg-[#F9FAFB] text-[#374151] rounded-md px-4 py-2.5 text-[0.82rem] font-medium cursor-pointer transition-colors ml-auto">
          <Bookmark className="w-4 h-4" /> Save to Dashboard
        </button>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════ */
export default function PropertyAnalyzerPage() {
  const [showResults, setShowResults] = useState(false)

  return (
    <div className="p-8 max-w-[1200px] bg-[var(--cream,#FAF9F6)]">
      {/* Header */}
      <div className="mb-5">
        <h1 style={{ fontFamily: "'DM Serif Display', Georgia, serif" }} className="text-[1.5rem] font-normal text-[var(--navy-heading,#0B1224)] mb-1">
          Analyze Deal
        </h1>
        <p className="text-sm text-[#9CA3AF]">
          Instant ARV, comps, and deal scoring for any property.
        </p>
      </div>

      {showResults
        ? <ResultsState onBack={() => setShowResults(false)} />
        : <InputState onAnalyze={() => setShowResults(true)} />
      }

      <style>{`
        @media (max-width: 900px) {
          .analyzer-grid { grid-template-columns: 1fr !important; }
          .analyzer-manual-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
