'use client'

import { useState } from 'react'
import {
  Store,
  ClipboardList,
  Bookmark,
  ChevronDown,
  Star,
  Clock,
  Plus,
  Eye,
  MessageSquare,
  Pencil,
  Pause,
  Trash2,
  ArrowUpDown,
  BadgeCheck,
  ShieldAlert,
  MapPin,
  Home,
  TrendingUp,
  Filter,
} from 'lucide-react'

/* ═══════════════════════════════════════════════
   TABS
   ═══════════════════════════════════════════════ */
const tabs = [
  { key: 'deals', label: 'Deal Listings', icon: Store },
  { key: 'buyers', label: 'Buyer Board', icon: ClipboardList },
  { key: 'mine', label: 'My Listings', icon: Bookmark },
] as const

type Tab = (typeof tabs)[number]['key']

/* ═══════════════════════════════════════════════
   DEAL SCORE HELPERS
   ═══════════════════════════════════════════════ */
function scoreStyle(grade: string) {
  if (grade.startsWith('A')) return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (grade.startsWith('B')) return 'bg-blue-50 text-blue-700 border-blue-200'
  if (grade.startsWith('C')) return 'bg-amber-50 text-amber-700 border-amber-200'
  return 'bg-gray-50 text-gray-600 border-gray-200'
}

function cardGradient(i: number) {
  const gradients = [
    'from-slate-700 via-slate-600 to-slate-500',
    'from-stone-700 via-stone-600 to-stone-500',
    'from-zinc-700 via-zinc-600 to-zinc-500',
    'from-neutral-700 via-neutral-600 to-neutral-500',
    'from-gray-700 via-gray-600 to-gray-500',
    'from-slate-800 via-slate-700 to-slate-500',
    'from-stone-800 via-stone-700 to-stone-500',
    'from-zinc-800 via-zinc-700 to-zinc-500',
    'from-neutral-800 via-neutral-700 to-neutral-500',
    'from-gray-800 via-gray-700 to-gray-500',
  ]
  return gradients[i % gradients.length]
}

/* ═══════════════════════════════════════════════
   MOCK DATA:DEAL LISTINGS
   ═══════════════════════════════════════════════ */
const dealListings = [
  { id: 1, address: '4217 Magnolia Ave', city: 'Dallas', state: 'TX', type: 'SFR', asking: 22500, arv: 285000, profit: 47000, grade: 'A+', days: 1, seller: 'Marcus T.', rating: 4.9, reviews: 42 },
  { id: 2, address: '1083 Peachtree Ct', city: 'Atlanta', state: 'GA', type: 'SFR', asking: 18000, arv: 220000, profit: 32000, grade: 'A', days: 2, seller: 'Jessica R.', rating: 4.7, reviews: 28 },
  { id: 3, address: '902 Cactus Rd', city: 'Phoenix', state: 'AZ', type: 'SFR', asking: 25000, arv: 310000, profit: 55000, grade: 'A+', days: 1, seller: 'David C.', rating: 5.0, reviews: 63 },
  { id: 4, address: '5501 Bay Shore Dr', city: 'Tampa', state: 'FL', type: 'Multi-Family', asking: 35000, arv: 420000, profit: 68000, grade: 'A', days: 3, seller: 'Aisha W.', rating: 4.8, reviews: 35 },
  { id: 5, address: '2740 Elm St', city: 'Dallas', state: 'TX', type: 'SFR', asking: 15000, arv: 195000, profit: 28000, grade: 'B+', days: 5, seller: 'Ryan M.', rating: 4.5, reviews: 17 },
  { id: 6, address: 'Lot 14, County Rd 210', city: 'Phoenix', state: 'AZ', type: 'Land', asking: 8500, arv: 65000, profit: 18000, grade: 'B+', days: 4, seller: 'Carlos M.', rating: 4.6, reviews: 22 },
  { id: 7, address: '871 Dogwood Ln', city: 'Atlanta', state: 'GA', type: 'SFR', asking: 20000, arv: 260000, profit: 41000, grade: 'A', days: 2, seller: 'Sarah K.', rating: 4.9, reviews: 51 },
  { id: 8, address: '3300 Hillcrest Blvd', city: 'Tampa', state: 'FL', type: 'Multi-Family', asking: 42000, arv: 510000, profit: 82000, grade: 'A+', days: 1, seller: 'Kevin N.', rating: 4.4, reviews: 12 },
  { id: 9, address: '1925 Saguaro Way', city: 'Phoenix', state: 'AZ', type: 'SFR', asking: 19500, arv: 245000, profit: 38000, grade: 'B+', days: 7, seller: 'Lisa P.', rating: 4.7, reviews: 33 },
  { id: 10, address: '610 Lakewood Terrace', city: 'Dallas', state: 'TX', type: 'SFR', asking: 27000, arv: 340000, profit: 52000, grade: 'A', days: 3, seller: 'Marcus T.', rating: 4.9, reviews: 42 },
]

/* ═══════════════════════════════════════════════
   MOCK DATA:BUYER BOARD
   ═══════════════════════════════════════════════ */
const buyerPosts = [
  { id: 1, type: 'SFR', market: 'Atlanta 30310–30318', budget: 'Under $150K', strategy: 'Flip', speed: '10 days', pof: true, name: 'Derrick J.', initials: 'DJ', color: 'from-blue-500 to-blue-600' },
  { id: 2, type: 'Land', market: 'Maricopa County, AZ', budget: 'Under $80K', strategy: 'Hold', speed: '30 days', pof: true, name: 'Angela S.', initials: 'AS', color: 'from-emerald-500 to-teal-600' },
  { id: 3, type: 'Multi-Family', market: 'Tampa / Hillsborough County', budget: '$200K–$400K', strategy: 'Rental', speed: '14 days', pof: true, name: 'Omar B.', initials: 'OB', color: 'from-violet-500 to-purple-600' },
  { id: 4, type: 'SFR', market: 'Dallas / Fort Worth', budget: 'Under $200K', strategy: 'Flip', speed: '7 days', pof: true, name: 'Christine L.', initials: 'CL', color: 'from-rose-500 to-pink-600' },
  { id: 5, type: 'SFR', market: 'Phoenix Metro', budget: '$100K–$250K', strategy: 'Either', speed: '14 days', pof: false, name: 'Jamaal W.', initials: 'JW', color: 'from-amber-500 to-orange-600' },
  { id: 6, type: 'Land', market: 'Pinal County, AZ', budget: 'Under $40K', strategy: 'Hold', speed: '21 days', pof: true, name: 'Rachel M.', initials: 'RM', color: 'from-cyan-500 to-blue-600' },
  { id: 7, type: 'SFR', market: 'Atlanta 30305–30309', budget: '$150K–$300K', strategy: 'Rental', speed: '14 days', pof: true, name: 'Travis K.', initials: 'TK', color: 'from-indigo-500 to-blue-600' },
  { id: 8, type: 'Multi-Family', market: 'Dallas / Tarrant County', budget: '$300K–$600K', strategy: 'Rental', speed: '30 days', pof: false, name: 'Nina F.', initials: 'NF', color: 'from-fuchsia-500 to-purple-600' },
]

/* ═══════════════════════════════════════════════
   MOCK DATA:MY LISTINGS
   ═══════════════════════════════════════════════ */
const myListings = [
  { id: 1, title: '4217 Magnolia Ave, Dallas TX', kind: 'Deal', status: 'Active', views: 234, inquiries: 12, date: 'Mar 8, 2026' },
  { id: 2, title: 'Looking for SFR in Phoenix Metro', kind: 'Buy Box', status: 'Active', views: 89, inquiries: 5, date: 'Mar 5, 2026' },
  { id: 3, title: '2740 Elm St, Dallas TX', kind: 'Deal', status: 'Pending', views: 412, inquiries: 18, date: 'Feb 28, 2026' },
  { id: 4, title: 'Looking for Land in Maricopa County', kind: 'Buy Box', status: 'Expired', views: 156, inquiries: 3, date: 'Feb 10, 2026' },
]

/* ═══════════════════════════════════════════════
   SELECT DROPDOWN COMPONENT
   ═══════════════════════════════════════════════ */
function FilterSelect({ label, options }: { label: string; options: string[] }) {
  return (
    <div className="relative">
      <select
        className="appearance-none bg-white border border-gray-200 rounded-lg pl-3 pr-8 py-2 text-[0.8rem] text-gray-600 outline-none focus:border-blue-300 transition-colors cursor-pointer"
        defaultValue=""
      >
        <option value="" disabled>{label}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
    </div>
  )
}

/* ═══════════════════════════════════════════════
   STARS COMPONENT
   ═══════════════════════════════════════════════ */
function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star
          key={n}
          className="w-3 h-3"
          fill={n <= Math.round(rating) ? '#f59e0b' : 'none'}
          stroke={n <= Math.round(rating) ? '#f59e0b' : '#d1d5db'}
          strokeWidth={1.5}
        />
      ))}
    </span>
  )
}

/* ═══════════════════════════════════════════════
   DEAL LISTINGS SECTION
   ═══════════════════════════════════════════════ */
function DealListingsSection() {
  const [sort, setSort] = useState('Newest')

  return (
    <div>
      {/* Filters */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <div className="flex items-center gap-1.5 text-[0.76rem] text-gray-500 mr-1">
          <Filter className="w-3.5 h-3.5" />
          Filters:
        </div>
        <FilterSelect label="Market / City" options={['Dallas', 'Atlanta', 'Phoenix', 'Tampa', 'All Markets']} />
        <FilterSelect label="Property Type" options={['SFR', 'Multi-Family', 'Land', 'Commercial', 'All Types']} />
        <FilterSelect label="Price Range" options={['Under $15K', '$15K–$25K', '$25K–$40K', '$40K+', 'Any Price']} />
        <FilterSelect label="Deal Score" options={['A+ Only', 'A and above', 'B+ and above', 'All Scores']} />
        <div className="ml-auto">
          <div className="relative">
            <select
              value={sort}
              onChange={e => setSort(e.target.value)}
              className="appearance-none bg-white border border-gray-200 rounded-lg pl-3 pr-8 py-2 text-[0.8rem] text-gray-600 outline-none focus:border-blue-300 transition-colors cursor-pointer"
            >
              <option>Newest</option>
              <option>Highest Score</option>
              <option>Lowest Price</option>
            </select>
            <ArrowUpDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-4 mp-deals-grid">
        {dealListings.map((d, i) => (
          <div
            key={d.id}
            className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
          >
            {/* Photo placeholder */}
            <div className={`h-[140px] bg-gradient-to-br ${cardGradient(i)} relative`}>
              <div className="absolute inset-0 flex items-center justify-center opacity-20">
                <Home className="w-12 h-12 text-white" />
              </div>
              {/* Deal Score badge */}
              <div className="absolute top-3 right-3">
                <span className={`text-[0.72rem] font-bold px-2.5 py-1 rounded-lg border ${scoreStyle(d.grade)}`}>
                  {d.grade}
                </span>
              </div>
              {/* Days listed */}
              <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-black/50 backdrop-blur-sm text-white text-[0.68rem] px-2 py-0.5 rounded-full">
                <Clock className="w-3 h-3" />
                {d.days === 1 ? 'Listed today' : `${d.days}d ago`}
              </div>
              {/* Type badge */}
              <div className="absolute top-3 left-3">
                <span className="text-[0.66rem] font-medium bg-white/90 backdrop-blur-sm text-gray-700 px-2 py-0.5 rounded-full">
                  {d.type}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="px-4 py-3.5">
              <div className="flex items-start justify-between mb-1.5">
                <div className="min-w-0">
                  <h3 className="text-[0.88rem] font-medium text-gray-800 truncate group-hover:text-blue-600 transition-colors">
                    {d.address}
                  </h3>
                  <div className="flex items-center gap-1 text-[0.76rem] text-gray-400">
                    <MapPin className="w-3 h-3" />
                    {d.city}, {d.state}
                  </div>
                </div>
              </div>

              {/* Financials */}
              <div className="grid grid-cols-3 gap-2 mt-3 mb-3">
                <div>
                  <div className="text-[0.64rem] text-gray-400 uppercase tracking-wide">Asking</div>
                  <div className="text-[0.88rem] font-semibold text-gray-900" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                    ${d.asking.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-[0.64rem] text-gray-400 uppercase tracking-wide">ARV</div>
                  <div className="text-[0.88rem] font-medium text-gray-700" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                    ${d.arv.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-[0.64rem] text-gray-400 uppercase tracking-wide">Est. Profit</div>
                  <div className="text-[0.88rem] font-semibold text-emerald-600" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                    ${d.profit.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Seller */}
              <div className="flex items-center justify-between pt-2.5 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center">
                    <span className="text-[0.5rem] font-medium text-white">{d.seller.split(' ').map(w => w[0]).join('')}</span>
                  </div>
                  <span className="text-[0.76rem] text-gray-600">{d.seller}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Stars rating={d.rating} />
                  <span className="text-[0.68rem] text-gray-400">({d.reviews})</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   BUYER BOARD SECTION
   ═══════════════════════════════════════════════ */
function BuyerBoardSection() {
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <p className="text-[0.82rem] text-gray-500">Active buy box criteria posted by wholesalers for their verified buyers.</p>
        <button className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white border-0 rounded-lg px-4 py-2 text-[0.82rem] font-medium cursor-pointer transition-colors">
          <Plus className="w-4 h-4" />
          Post Buy Box
        </button>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 gap-4 mp-buyer-grid">
        {buyerPosts.map(b => (
          <div key={b.id} className="bg-white border border-gray-200 rounded-xl px-5 py-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-8 h-8 rounded-full bg-gradient-to-br ${b.color} flex items-center justify-center flex-shrink-0`}
                >
                  <span className="text-[0.52rem] font-medium text-white">{b.initials}</span>
                </div>
                <div>
                  <div className="text-[0.82rem] font-medium text-gray-800">{b.name}</div>
                </div>
              </div>
              <span
                className={`flex items-center gap-1 text-[0.68rem] font-medium px-2 py-0.5 rounded-full ${
                  b.pof
                    ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                    : 'text-gray-500 bg-gray-100 border border-gray-200'
                }`}
              >
                {b.pof ? <BadgeCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                {b.pof ? 'POF Verified' : 'Unverified'}
              </span>
            </div>

            {/* Criteria */}
            <div className="text-[0.78rem] font-medium text-gray-800 mb-2.5">Looking for {b.type}</div>
            <div className="space-y-1.5 mb-4">
              <div className="flex items-center gap-2 text-[0.78rem]">
                <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <span className="text-gray-600">{b.market}</span>
              </div>
              <div className="flex items-center gap-2 text-[0.78rem]">
                <span className="text-gray-400 font-medium w-3.5 text-center flex-shrink-0">$</span>
                <span className="text-gray-600">{b.budget}</span>
              </div>
              <div className="flex items-center gap-3 text-[0.78rem]">
                <span className="flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-gray-600">{b.strategy}</span>
                </span>
                <span className="text-gray-300">·</span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-gray-600">{b.speed}</span>
                </span>
              </div>
            </div>

            {/* CTA */}
            <button className="w-full py-2 rounded-lg text-[0.8rem] font-medium cursor-pointer transition-all border border-blue-600 text-blue-600 bg-white hover:bg-blue-50">
              Contact
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   MY LISTINGS SECTION
   ═══════════════════════════════════════════════ */
function statusStyle(status: string) {
  switch (status) {
    case 'Active': return 'text-emerald-700 bg-emerald-50'
    case 'Pending': return 'text-amber-700 bg-amber-50'
    case 'Closed': return 'text-blue-700 bg-blue-50'
    case 'Expired': return 'text-gray-500 bg-gray-100'
    default: return 'text-gray-500 bg-gray-100'
  }
}

function MyListingsSection() {
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <p className="text-[0.82rem] text-gray-500">Manage your deals and buy box posts.</p>
        <button className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white border-0 rounded-lg px-4 py-2 text-[0.82rem] font-medium cursor-pointer transition-colors">
          <Plus className="w-4 h-4" />
          List New Deal
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-5 py-3 text-[0.7rem] text-gray-400 uppercase tracking-wide font-medium">Property / Title</th>
              <th className="text-left px-4 py-3 text-[0.7rem] text-gray-400 uppercase tracking-wide font-medium">Type</th>
              <th className="text-left px-4 py-3 text-[0.7rem] text-gray-400 uppercase tracking-wide font-medium">Status</th>
              <th className="text-right px-4 py-3 text-[0.7rem] text-gray-400 uppercase tracking-wide font-medium">Views</th>
              <th className="text-right px-4 py-3 text-[0.7rem] text-gray-400 uppercase tracking-wide font-medium">Inquiries</th>
              <th className="text-left px-4 py-3 text-[0.7rem] text-gray-400 uppercase tracking-wide font-medium">Date Posted</th>
              <th className="text-right px-5 py-3 text-[0.7rem] text-gray-400 uppercase tracking-wide font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {myListings.map((item, i) => (
              <tr
                key={item.id}
                className={`${i < myListings.length - 1 ? 'border-b border-gray-50' : ''} hover:bg-gray-50 transition-colors`}
              >
                <td className="px-5 py-3.5">
                  <span className="text-[0.84rem] text-gray-800 font-medium">{item.title}</span>
                </td>
                <td className="px-4 py-3.5">
                  <span className={`text-[0.72rem] font-medium px-2 py-0.5 rounded-full ${
                    item.kind === 'Deal' ? 'text-blue-700 bg-blue-50' : 'text-violet-700 bg-violet-50'
                  }`}>
                    {item.kind}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <span className={`text-[0.72rem] font-medium px-2 py-0.5 rounded-full ${statusStyle(item.status)}`}>
                    {item.status}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-right">
                  <span className="text-[0.82rem] text-gray-600 flex items-center justify-end gap-1">
                    <Eye className="w-3 h-3 text-gray-400" />
                    {item.views}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-right">
                  <span className="text-[0.82rem] text-gray-600 flex items-center justify-end gap-1">
                    <MessageSquare className="w-3 h-3 text-gray-400" />
                    {item.inquiries}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <span className="text-[0.78rem] text-gray-500">{item.date}</span>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      title="Edit"
                      className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer bg-transparent border-0"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      title="Pause"
                      className="p-1.5 rounded-md text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer bg-transparent border-0"
                    >
                      <Pause className="w-3.5 h-3.5" />
                    </button>
                    <button
                      title="Remove"
                      className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer bg-transparent border-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   MAIN MARKETPLACE PAGE
   ═══════════════════════════════════════════════ */
export default function MarketplacePage() {
  const [activeTab, setActiveTab] = useState<Tab>('deals')

  return (
    <div className="p-8 max-w-[1200px]">
      {/* Header */}
      <div className="mb-5">
        <h1
          style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
          className="text-[1.45rem] font-medium text-gray-900 tracking-[-0.025em] mb-1"
        >
          Marketplace
        </h1>
        <p className="text-[0.84rem] text-gray-400">
          Browse deals, post listings, and connect with active buyers.
        </p>
      </div>

      {/* Activity stat bar */}
      <div className="flex items-center gap-6 bg-white border border-gray-200 rounded-xl px-5 py-3 mb-5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[0.82rem] text-gray-700 font-medium">142</span>
          <span className="text-[0.78rem] text-gray-400">Active Deals</span>
        </div>
        <div className="w-px h-4 bg-gray-200" />
        <div className="flex items-center gap-2">
          <span className="text-[0.82rem] text-gray-700 font-medium">89</span>
          <span className="text-[0.78rem] text-gray-400">Buy Box Posts</span>
        </div>
        <div className="w-px h-4 bg-gray-200" />
        <div className="flex items-center gap-2">
          <span className="text-[0.82rem] text-gray-700 font-medium">23</span>
          <span className="text-[0.78rem] text-gray-400">Deals Closed This Week</span>
        </div>
      </div>

      {/* Sub-section tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-gray-200 pb-0">
        {tabs.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-[0.82rem] font-medium cursor-pointer bg-transparent border-0 border-b-2 -mb-[1px] transition-colors ${
                isActive
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Content */}
      {activeTab === 'deals' && <DealListingsSection />}
      {activeTab === 'buyers' && <BuyerBoardSection />}
      {activeTab === 'mine' && <MyListingsSection />}

      <style>{`
        @media (max-width: 900px) {
          .mp-deals-grid { grid-template-columns: 1fr !important; }
          .mp-buyer-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
