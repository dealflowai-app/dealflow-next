'use client'

import { useState } from 'react'
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
  FileSignature,
  PhoneOutgoing,
  Send,
  Pencil,
  Archive,
  Tag,
  Download,
  X,
  Clock,
  Circle,
  Flame,
  UserPlus,
  Target,
  Zap,
} from 'lucide-react'

/* ═══════════════════════════════════════════════
   TYPES & HELPERS
   ═══════════════════════════════════════════════ */
interface Buyer {
  id: number
  name: string
  initials: string
  color: string
  phone: string
  email: string
  mailingAddress: string
  preferredContact: string
  markets: string[]
  buyBox: string
  propertyTypes: string[]
  priceRange: string
  priceMin: number
  priceMax: number
  targetZips: string
  strategy: string
  closingSpeed: string
  pofStatus: string
  pofDate: string
  fundingSource: string
  score: string
  status: string
  lastContact: string
  dealsClosed: number
  source: string
  stage: string
  daysInStage: number
  tags: string[]
  pinX: number
  pinY: number
}

function scoreColor(s: string) {
  switch (s) {
    case 'A': return 'text-emerald-700 bg-emerald-50 border-emerald-200'
    case 'B': return 'text-[#4F46E5] bg-[#EEF2FF] border-[#C7D2FE]'
    case 'C': return 'text-amber-700 bg-amber-50 border-amber-200'
    case 'D': return 'text-red-700 bg-red-50 border-red-200'
    default: return 'text-gray-600 bg-gray-100 border-gray-200'
  }
}

function scoreDot(s: string) {
  switch (s) {
    case 'A': return '#10b981'
    case 'B': return '#4F46E5'
    case 'C': return '#f59e0b'
    case 'D': return '#ef4444'
    default: return '#9ca3af'
  }
}

function statusStyle(s: string) {
  switch (s) {
    case 'Active': return 'text-emerald-700 bg-emerald-50'
    case 'Dormant': return 'text-[#6B7280] bg-gray-100'
    case 'New': return 'text-[#4F46E5] bg-[#EEF2FF]'
    case 'High-Confidence': return 'text-amber-700 bg-amber-50'
    case 'Recently Verified': return 'text-violet-700 bg-violet-50'
    default: return 'text-gray-500 bg-gray-100'
  }
}

function sourceIcon(s: string) {
  switch (s) {
    case 'AI Outreach': return <span title="AI Outreach"><Zap className="w-3 h-3 text-[#4F46E5]" /></span>
    case 'Manual Entry': return <span title="Manual Entry"><Pencil className="w-3 h-3 text-gray-400" /></span>
    case 'Discovery Import': return <span title="Discovery Import"><Target className="w-3 h-3 text-violet-500" /></span>
    case 'Marketplace': return <span title="Marketplace"><Home className="w-3 h-3 text-amber-500" /></span>
    default: return <Circle className="w-3 h-3 text-gray-300" />
  }
}

function tagColor(_t: string) {
  return 'bg-[#F3F4F6] text-[#6B7280] border-[#E5E7EB]'
}

/* ═══════════════════════════════════════════════
   MOCK DATA
   ═══════════════════════════════════════════════ */
const buyers: Buyer[] = [
  { id: 1, name: 'Marcus Thompson', initials: 'MT', color: '', phone: '(214) 555-0147', email: 'marcus.t@gmail.com', mailingAddress: '4510 Travis St, Dallas TX 75205', preferredContact: 'Phone', markets: ['Dallas', 'Fort Worth'], buyBox: 'SFR, $100K-$200K, Flip', propertyTypes: ['SFR'], priceRange: '$100K–$200K', priceMin: 100000, priceMax: 200000, targetZips: '75215, 75216, 75217, 75228', strategy: 'Flip', closingSpeed: '7 days', pofStatus: 'Verified', pofDate: 'Feb 28, 2026', fundingSource: 'Cash', score: 'A', status: 'Active', lastContact: 'Mar 11', dealsClosed: 8, source: 'AI Outreach', stage: 'Qualified', daysInStage: 3, tags: ['Dallas', 'Flip Buyer', 'Fast Closer', 'POF Verified', 'VIP'], pinX: 42, pinY: 38 },
  { id: 2, name: 'Jessica Rivera', initials: 'JR', color: '', phone: '(404) 555-0293', email: 'jrivera@investatlanta.com', mailingAddress: '890 Peachtree St NE, Atlanta GA 30308', preferredContact: 'Email', markets: ['Atlanta'], buyBox: 'Multi-Family, $200K-$400K, Rental', propertyTypes: ['Multi-Family'], priceRange: '$200K–$400K', priceMin: 200000, priceMax: 400000, targetZips: '30310, 30312, 30314, 30318', strategy: 'Rental', closingSpeed: '14 days', pofStatus: 'Verified', pofDate: 'Mar 1, 2026', fundingSource: 'Hard Money', score: 'A', status: 'High-Confidence', lastContact: 'Mar 12', dealsClosed: 5, source: 'Discovery Import', stage: 'Offer Sent', daysInStage: 2, tags: ['Atlanta', 'Multi-Family', 'POF Verified'], pinX: 55, pinY: 25 },
  { id: 3, name: 'David Chen', initials: 'DC', color: '', phone: '(602) 555-0184', email: 'dchen@azcashbuyers.com', mailingAddress: '1220 N Central Ave, Phoenix AZ 85004', preferredContact: 'Phone', markets: ['Phoenix', 'Scottsdale'], buyBox: 'SFR, $150K-$300K, Either', propertyTypes: ['SFR', 'Condo'], priceRange: '$150K–$300K', priceMin: 150000, priceMax: 300000, targetZips: '85003, 85006, 85008, 85014', strategy: 'Either', closingSpeed: '10 days', pofStatus: 'Verified', pofDate: 'Feb 15, 2026', fundingSource: 'Cash', score: 'A', status: 'Active', lastContact: 'Mar 10', dealsClosed: 12, source: 'Manual Entry', stage: 'Qualified', daysInStage: 5, tags: ['Phoenix', 'Flip Buyer', 'VIP', 'Fast Closer'], pinX: 30, pinY: 45 },
  { id: 4, name: 'Aisha Williams', initials: 'AW', color: '', phone: '(214) 555-0376', email: 'aisha.w@outlook.com', mailingAddress: '2300 Leonard St, Dallas TX 75201', preferredContact: 'Phone', markets: ['Dallas'], buyBox: 'SFR, $80K-$150K, Flip', propertyTypes: ['SFR'], priceRange: '$80K–$150K', priceMin: 80000, priceMax: 150000, targetZips: '75210, 75215, 75216', strategy: 'Flip', closingSpeed: '14 days', pofStatus: 'Verified', pofDate: 'Jan 20, 2026', fundingSource: 'Private Lending', score: 'B', status: 'Active', lastContact: 'Mar 8', dealsClosed: 3, source: 'AI Outreach', stage: 'Contacted', daysInStage: 4, tags: ['Dallas', 'Flip Buyer', 'POF Verified'], pinX: 48, pinY: 55 },
  { id: 5, name: 'Ryan Mitchell', initials: 'RM', color: '', phone: '(813) 555-0421', email: 'ryan.m@tampainvest.com', mailingAddress: '501 E Kennedy Blvd, Tampa FL 33602', preferredContact: 'Email', markets: ['Tampa', 'St. Petersburg'], buyBox: 'Land, $30K-$80K, Hold', propertyTypes: ['Land'], priceRange: '$30K–$80K', priceMin: 30000, priceMax: 80000, targetZips: '33602, 33605, 33610, 33612', strategy: 'Hold', closingSpeed: '30 days', pofStatus: 'Unverified', pofDate: '', fundingSource: 'Cash', score: 'B', status: 'Recently Verified', lastContact: 'Mar 9', dealsClosed: 1, source: 'Marketplace', stage: 'Contacted', daysInStage: 6, tags: ['Tampa', 'Land Buyer'], pinX: 65, pinY: 30 },
  { id: 6, name: 'Kevin Nguyen', initials: 'KN', color: '', phone: '(214) 555-0198', email: 'knguyen@rehabpros.com', mailingAddress: '3900 Elm St, Dallas TX 75226', preferredContact: 'Phone', markets: ['Dallas', 'Plano'], buyBox: 'SFR, $120K-$250K, Flip', propertyTypes: ['SFR'], priceRange: '$120K–$250K', priceMin: 120000, priceMax: 250000, targetZips: '75226, 75228, 75231, 75238', strategy: 'Flip', closingSpeed: '7 days', pofStatus: 'Verified', pofDate: 'Mar 5, 2026', fundingSource: 'Cash', score: 'A', status: 'High-Confidence', lastContact: 'Mar 12', dealsClosed: 15, source: 'Manual Entry', stage: 'Under Contract', daysInStage: 1, tags: ['Dallas', 'Flip Buyer', 'Fast Closer', 'VIP', 'POF Verified'], pinX: 38, pinY: 48 },
  { id: 7, name: 'Sarah Kim', initials: 'SK', color: '', phone: '(404) 555-0582', email: 'sarah.kim@gmail.com', mailingAddress: '200 Peachtree St NW, Atlanta GA 30303', preferredContact: 'Email', markets: ['Atlanta', 'Decatur'], buyBox: 'SFR, $100K-$180K, Rental', propertyTypes: ['SFR', 'Multi-Family'], priceRange: '$100K–$180K', priceMin: 100000, priceMax: 180000, targetZips: '30305, 30306, 30307, 30309', strategy: 'Rental', closingSpeed: '14 days', pofStatus: 'Verified', pofDate: 'Feb 10, 2026', fundingSource: 'Hard Money', score: 'B', status: 'Active', lastContact: 'Mar 7', dealsClosed: 2, source: 'Discovery Import', stage: 'Qualified', daysInStage: 8, tags: ['Atlanta', 'Rental Buyer', 'POF Verified'], pinX: 58, pinY: 62 },
  { id: 8, name: 'Carlos Medina', initials: 'CM', color: '', phone: '(602) 555-0744', email: 'cmedina@desertflip.com', mailingAddress: '3434 N 7th Ave, Phoenix AZ 85013', preferredContact: 'Phone', markets: ['Phoenix'], buyBox: 'SFR, $80K-$160K, Flip', propertyTypes: ['SFR'], priceRange: '$80K–$160K', priceMin: 80000, priceMax: 160000, targetZips: '85006, 85008, 85040, 85042', strategy: 'Flip', closingSpeed: '10 days', pofStatus: 'Unverified', pofDate: '', fundingSource: 'Cash', score: 'C', status: 'New', lastContact: 'Mar 13', dealsClosed: 0, source: 'AI Outreach', stage: 'New Lead', daysInStage: 1, tags: ['Phoenix', 'New Lead'], pinX: 25, pinY: 35 },
  { id: 9, name: 'Tanya Brooks', initials: 'TB', color: '', phone: '(214) 555-0831', email: 'tbrooks@yahoo.com', mailingAddress: '8100 Forest Ln, Dallas TX 75243', preferredContact: 'Phone', markets: ['Dallas'], buyBox: 'SFR, $60K-$120K, Flip', propertyTypes: ['SFR'], priceRange: '$60K–$120K', priceMin: 60000, priceMax: 120000, targetZips: '75217, 75227, 75228', strategy: 'Flip', closingSpeed: '21 days', pofStatus: 'Unverified', pofDate: '', fundingSource: 'Private Lending', score: 'C', status: 'Dormant', lastContact: 'Feb 14', dealsClosed: 1, source: 'Manual Entry', stage: 'Contacted', daysInStage: 28, tags: ['Dallas', 'Flip Buyer'], pinX: 52, pinY: 20 },
  { id: 10, name: 'Derrick Jones', initials: 'DJ', color: '', phone: '(404) 555-0962', email: 'djones@builditinv.com', mailingAddress: '430 Whitehall St, Atlanta GA 30303', preferredContact: 'Phone', markets: ['Atlanta'], buyBox: 'Multi-Family, $150K-$350K, Rental', propertyTypes: ['Multi-Family'], priceRange: '$150K–$350K', priceMin: 150000, priceMax: 350000, targetZips: '30310, 30311, 30314, 30318', strategy: 'Rental', closingSpeed: '14 days', pofStatus: 'Verified', pofDate: 'Mar 3, 2026', fundingSource: 'Cash', score: 'A', status: 'Active', lastContact: 'Mar 11', dealsClosed: 7, source: 'AI Outreach', stage: 'Offer Sent', daysInStage: 3, tags: ['Atlanta', 'Multi-Family', 'Fast Closer', 'VIP'], pinX: 72, pinY: 45 },
  { id: 11, name: 'Lisa Park', initials: 'LP', color: '', phone: '(813) 555-0137', email: 'lpark@tampaprops.com', mailingAddress: '201 N Franklin St, Tampa FL 33602', preferredContact: 'Email', markets: ['Tampa'], buyBox: 'SFR, $100K-$200K, Either', propertyTypes: ['SFR', 'Condo'], priceRange: '$100K–$200K', priceMin: 100000, priceMax: 200000, targetZips: '33602, 33605, 33607, 33609', strategy: 'Either', closingSpeed: '14 days', pofStatus: 'Verified', pofDate: 'Feb 22, 2026', fundingSource: 'Hard Money', score: 'B', status: 'Active', lastContact: 'Mar 6', dealsClosed: 4, source: 'Discovery Import', stage: 'Qualified', daysInStage: 10, tags: ['Tampa', 'POF Verified'], pinX: 78, pinY: 58 },
  { id: 12, name: 'Omar Bryant', initials: 'OB', color: '', phone: '(602) 555-0488', email: 'omar.b@proton.me', mailingAddress: '2901 E Thomas Rd, Phoenix AZ 85016', preferredContact: 'Phone', markets: ['Phoenix', 'Mesa'], buyBox: 'Land, $20K-$60K, Hold', propertyTypes: ['Land'], priceRange: '$20K–$60K', priceMin: 20000, priceMax: 60000, targetZips: '85003, 85006, 85040', strategy: 'Hold', closingSpeed: '30 days', pofStatus: 'Unverified', pofDate: '', fundingSource: 'Cash', score: 'C', status: 'New', lastContact: 'Mar 13', dealsClosed: 0, source: 'AI Outreach', stage: 'New Lead', daysInStage: 1, tags: ['Phoenix', 'Land Buyer', 'New Lead'], pinX: 15, pinY: 55 },
  { id: 13, name: 'Rachel Martinez', initials: 'RM2', color: '', phone: '(214) 555-0654', email: 'rachel.m@dallascash.com', mailingAddress: '1700 Pacific Ave, Dallas TX 75201', preferredContact: 'Phone', markets: ['Dallas'], buyBox: 'SFR, $150K-$280K, Flip', propertyTypes: ['SFR'], priceRange: '$150K–$280K', priceMin: 150000, priceMax: 280000, targetZips: '75201, 75204, 75226, 75231', strategy: 'Flip', closingSpeed: '10 days', pofStatus: 'Verified', pofDate: 'Mar 8, 2026', fundingSource: 'Cash', score: 'A', status: 'Recently Verified', lastContact: 'Mar 12', dealsClosed: 6, source: 'Manual Entry', stage: 'Under Contract', daysInStage: 2, tags: ['Dallas', 'Flip Buyer', 'POF Verified', 'Fast Closer'], pinX: 45, pinY: 30 },
  { id: 14, name: 'Travis King', initials: 'TK', color: '', phone: '(813) 555-0819', email: 'tking@kingproperties.com', mailingAddress: '2001 W Platt St, Tampa FL 33606', preferredContact: 'Phone', markets: ['Tampa', 'Clearwater'], buyBox: 'Multi-Family, $180K-$400K, Rental', propertyTypes: ['Multi-Family'], priceRange: '$180K–$400K', priceMin: 180000, priceMax: 400000, targetZips: '33602, 33604, 33605, 33610', strategy: 'Rental', closingSpeed: '21 days', pofStatus: 'Verified', pofDate: 'Jan 30, 2026', fundingSource: 'Private Lending', score: 'B', status: 'Active', lastContact: 'Mar 5', dealsClosed: 3, source: 'Marketplace', stage: 'Contacted', daysInStage: 9, tags: ['Tampa', 'Multi-Family', 'Rental Buyer'], pinX: 82, pinY: 40 },
  { id: 15, name: 'Angela Scott', initials: 'AS', color: '', phone: '(404) 555-0273', email: 'ascott@investwise.com', mailingAddress: '191 Peachtree St NE, Atlanta GA 30303', preferredContact: 'Email', markets: ['Atlanta'], buyBox: 'SFR, $80K-$140K, Flip', propertyTypes: ['SFR'], priceRange: '$80K–$140K', priceMin: 80000, priceMax: 140000, targetZips: '30310, 30312, 30315, 30316', strategy: 'Flip', closingSpeed: '7 days', pofStatus: 'Verified', pofDate: 'Mar 10, 2026', fundingSource: 'Cash', score: 'D', status: 'Dormant', lastContact: 'Jan 22', dealsClosed: 0, source: 'Discovery Import', stage: 'New Lead', daysInStage: 45, tags: ['Atlanta'], pinX: 62, pinY: 70 },
]

/* Activity timeline for the detail buyer (Marcus Thompson id=1) */
const timeline = [
  { date: 'Mar 11, 2026', time: '3:42 PM', type: 'phone', text: 'AI call completed, qualified. Prefers SFR under $200K in 75215-75217. Close in 7 days cash.' },
  { date: 'Mar 9, 2026', time: '11:15 AM', type: 'deal', text: 'Deal sent: 4217 Magnolia Ave, Dallas TX for $22,500 assignment fee' },
  { date: 'Mar 8, 2026', time: '2:30 PM', type: 'phone', text: 'Follow-up call, confirmed interest in Magnolia Ave property. Requested walkthrough photos.' },
  { date: 'Mar 6, 2026', time: '9:00 AM', type: 'email', text: 'Comp package sent for 4217 Magnolia Ave. ARV $285K, rehab est. $42K.' },
  { date: 'Mar 3, 2026', time: '4:20 PM', type: 'deal', text: 'Offer received: $260,000 on 4217 Magnolia Ave' },
  { date: 'Feb 28, 2026', time: '10:05 AM', type: 'contract', text: 'Contract signed: 2740 Elm St, $15,000 assignment fee. Closed in 6 days.' },
  { date: 'Feb 20, 2026', time: '1:45 PM', type: 'phone', text: 'Initial AI outreach, spoke for 4:12. Qualified as Flip buyer, cash, DFW market.' },
]

/* ═══════════════════════════════════════════════
   FILTER SELECT
   ═══════════════════════════════════════════════ */
function FilterSelect({ label, options }: { label: string; options: string[] }) {
  return (
    <div className="relative">
      <select className="appearance-none bg-white border border-gray-200 rounded-lg pl-3 pr-7 py-2 text-[0.78rem] text-gray-600 outline-none focus:border-[#4F46E5] transition-colors cursor-pointer">
        <option value="">{label}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
    </div>
  )
}

/* ═══════════════════════════════════════════════
   LIST VIEW
   ═══════════════════════════════════════════════ */
function ListView({ onOpenDetail }: { onOpenDetail: (b: Buyer) => void }) {
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [sortCol, setSortCol] = useState<string>('score')
  const [menuOpen, setMenuOpen] = useState<number | null>(null)

  const allSelected = selected.size === buyers.length
  function toggleAll() { setSelected(allSelected ? new Set() : new Set(buyers.map(b => b.id))) }
  function toggle(id: number) { setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n }) }

  return (
    <div>
      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 bg-[#EEF2FF] border border-[#C7D2FE] rounded-lg px-4 py-2.5 mb-3">
          <span className="text-[0.8rem] text-[#4F46E5] font-medium">{selected.size} selected</span>
          <div className="flex items-center gap-1.5 ml-auto">
            {[
              { label: 'Send Campaign', icon: PhoneOutgoing },
              { label: 'Add Tag', icon: Tag },
              { label: 'Export', icon: Download },
              { label: 'Archive', icon: Archive },
            ].map(a => (
              <button key={a.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[0.76rem] font-medium text-[#4F46E5] hover:bg-[#E0E7FF] bg-transparent border-0 cursor-pointer transition-colors">
                <a.icon className="w-3.5 h-3.5" />
                {a.label}
              </button>
            ))}
          </div>
          <button onClick={() => setSelected(new Set())} className="text-[#818CF8] hover:text-[#4F46E5] bg-transparent border-0 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg shadow-none overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[1000px]">
          <thead>
            <tr className="border-b border-[#F3F4F6]">
              <th className="w-10 px-3 py-3">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} className="accent-[#4F46E5] w-3.5 h-3.5 cursor-pointer" />
              </th>
              {[
                { key: 'name', label: 'Buyer Name', align: 'left' },
                { key: 'phone', label: 'Phone', align: 'left' },
                { key: 'market', label: 'Market(s)', align: 'left' },
                { key: 'buybox', label: 'Buy Box', align: 'left' },
                { key: 'score', label: 'Score', align: 'center' },
                { key: 'status', label: 'Status', align: 'left' },
                { key: 'lastContact', label: 'Last Contact', align: 'left' },
                { key: 'deals', label: 'Closed', align: 'center' },
                { key: 'source', label: 'Src', align: 'center' },
                { key: 'actions', label: '', align: 'right' },
              ].map(col => (
                <th
                  key={col.key}
                  onClick={() => col.key !== 'actions' ? setSortCol(col.key) : null}
                  className={`px-3 py-3 text-xs uppercase tracking-wider text-[#6B7280] font-medium whitespace-nowrap ${
                    col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'
                  } ${col.key !== 'actions' ? 'cursor-pointer hover:text-gray-600 select-none' : ''}`}
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
            {buyers.map((b, i) => (
              <tr
                key={b.id}
                className={`${i < buyers.length - 1 ? 'border-b border-[#F3F4F6]' : ''} bg-white hover:bg-[#F9FAFB] transition-colors`}
              >
                <td className="px-3 py-3">
                  <input type="checkbox" checked={selected.has(b.id)} onChange={() => toggle(b.id)} className="accent-[#4F46E5] w-3.5 h-3.5 cursor-pointer" />
                </td>
                <td className="px-3 py-3">
                  <button onClick={() => onOpenDetail(b)} className="flex items-center gap-2 bg-transparent border-0 cursor-pointer text-left p-0 group">
                    <div className="w-7 h-7 rounded-full bg-[#F3F4F6] flex items-center justify-center flex-shrink-0">
                      <span className="text-[0.52rem] font-medium text-[#6B7280]">{b.initials}</span>
                    </div>
                    <span className="text-[0.82rem] font-medium text-gray-800 group-hover:text-[#4F46E5] transition-colors">{b.name}</span>
                  </button>
                </td>
                <td className="px-3 py-3 text-[0.78rem] text-gray-600 whitespace-nowrap">{b.phone}</td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap gap-1">
                    {b.markets.map(m => (
                      <span key={m} className="text-[0.66rem] text-gray-500 bg-gray-100 rounded-full px-1.5 py-0.5">{m}</span>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-3 text-[0.76rem] text-gray-600 max-w-[160px] truncate">{b.buyBox}</td>
                <td className="px-3 py-3 text-center">
                  <span className={`text-[0.72rem] font-bold px-2 py-0.5 rounded-full border ${scoreColor(b.score)}`}>{b.score}</span>
                </td>
                <td className="px-3 py-3">
                  <span className={`text-[0.68rem] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${statusStyle(b.status)}`}>{b.status}</span>
                </td>
                <td className="px-3 py-3 text-[0.78rem] text-gray-500 whitespace-nowrap">{b.lastContact}</td>
                <td className="px-3 py-3 text-center text-[0.82rem] text-gray-700 font-medium">{b.dealsClosed}</td>
                <td className="px-3 py-3 text-center">{sourceIcon(b.source)}</td>
                <td className="px-3 py-3 text-right relative">
                  <button
                    onClick={() => setMenuOpen(menuOpen === b.id ? null : b.id)}
                    className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 bg-transparent border-0 cursor-pointer transition-colors"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                  {menuOpen === b.id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
                      <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[160px]">
                        {[
                          { label: 'Edit', icon: Pencil },
                          { label: 'Start Outreach', icon: PhoneOutgoing },
                          { label: 'Match to Deal', icon: Target },
                          { label: 'Archive', icon: Archive },
                        ].map(a => (
                          <button
                            key={a.label}
                            onClick={() => setMenuOpen(null)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-[0.78rem] text-gray-600 hover:bg-gray-50 bg-transparent border-0 cursor-pointer transition-colors text-left"
                          >
                            <a.icon className="w-3.5 h-3.5 text-gray-400" />
                            {a.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
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
   PIPELINE VIEW
   ═══════════════════════════════════════════════ */
const stages = ['New Lead', 'Contacted', 'Qualified', 'Offer Sent', 'Under Contract', 'Closed']
const stageColors: Record<string, string> = {
  'New Lead': 'border-t-gray-400',
  'Contacted': 'border-t-indigo-400',
  'Qualified': 'border-t-violet-400',
  'Offer Sent': 'border-t-amber-400',
  'Under Contract': 'border-t-emerald-400',
  'Closed': 'border-t-green-500',
}

function PipelineView({ onOpenDetail }: { onOpenDetail: (b: Buyer) => void }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-4 crm-pipeline">
      {stages.map(stage => {
        const cards = buyers.filter(b => b.stage === stage)
        // Add some "closed" entries as mock
        const closedCards = stage === 'Closed'
          ? [
              { id: 100, name: 'Kevin Nguyen', initials: 'KN', color: '', markets: ['Dallas'], buyBox: 'SFR, $120K-$250K, Flip', score: 'A', daysInStage: 0 },
              { id: 101, name: 'Jessica Rivera', initials: 'JR', color: '', markets: ['Atlanta'], buyBox: 'MF, $200K-$400K, Rental', score: 'A', daysInStage: 0 },
              { id: 102, name: 'Marcus Thompson', initials: 'MT', color: '', markets: ['Dallas'], buyBox: 'SFR, $100K-$200K, Flip', score: 'A', daysInStage: 0 },
            ]
          : []
        const allCards = [...cards.map(c => ({ id: c.id, name: c.name, initials: c.initials, color: c.color, markets: c.markets, buyBox: c.buyBox, score: c.score, daysInStage: c.daysInStage })), ...closedCards]

        return (
          <div key={stage} className="flex-shrink-0 w-[210px]">
            <div className={`bg-gray-50 rounded-xl border-t-[3px] ${stageColors[stage]} p-3 min-h-[400px]`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[0.76rem] font-medium text-gray-700">{stage}</span>
                <span className="text-[0.68rem] font-medium text-gray-400 bg-white rounded-full px-2 py-0.5">{allCards.length}</span>
              </div>
              <div className="space-y-2">
                {allCards.map(c => (
                  <button
                    key={c.id}
                    onClick={() => { const full = buyers.find(b => b.id === c.id); if (full) onOpenDetail(full) }}
                    className="w-full bg-white border border-[#E5E7EB] rounded-lg px-3 py-2.5 text-left cursor-pointer hover:bg-[#F9FAFB] shadow-none transition-colors group"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-6 h-6 rounded-full bg-[#F3F4F6] flex items-center justify-center flex-shrink-0">
                        <span className="text-[0.46rem] font-medium text-[#6B7280]">{c.initials}</span>
                      </div>
                      <span className="text-[0.78rem] font-medium text-gray-800 truncate group-hover:text-[#4F46E5] transition-colors">{c.name}</span>
                    </div>
                    <div className="text-[0.68rem] text-gray-400 mb-1.5 flex gap-1 flex-wrap">
                      {c.markets.map(m => <span key={m}>{m}</span>)}
                    </div>
                    <div className="text-[0.7rem] text-gray-500 truncate mb-2">{c.buyBox}</div>
                    <div className="flex items-center justify-between">
                      <span className={`text-[0.64rem] font-bold px-1.5 py-0.5 rounded-full border ${scoreColor(c.score)}`}>{c.score}</span>
                      {c.daysInStage > 0 && (
                        <span className="text-[0.64rem] text-gray-400 flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" />{c.daysInStage}d
                        </span>
                      )}
                    </div>
                  </button>
                ))}
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
function MapView({ onOpenDetail }: { onOpenDetail: (b: Buyer) => void }) {
  const [hoverBuyer, setHoverBuyer] = useState<number | null>(null)
  const [heatmap, setHeatmap] = useState(false)

  return (
    <div className="relative w-full rounded-xl overflow-hidden bg-[#1a1d23] border border-gray-800" style={{ height: 560 }}>
      {/* Grid */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.06]">
        <defs>
          <pattern id="crmGrid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#ffffff" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#crmGrid)" />
      </svg>
      {/* Roads */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.08]">
        <line x1="0" y1="30%" x2="100%" y2="28%" stroke="#fff" strokeWidth="2" />
        <line x1="0" y1="55%" x2="100%" y2="58%" stroke="#fff" strokeWidth="1.5" />
        <line x1="30%" y1="0" x2="28%" y2="100%" stroke="#fff" strokeWidth="2" />
        <line x1="60%" y1="0" x2="62%" y2="100%" stroke="#fff" strokeWidth="1.5" />
        <line x1="0" y1="78%" x2="100%" y2="75%" stroke="#fff" strokeWidth="1" />
        <line x1="82%" y1="0" x2="80%" y2="100%" stroke="#fff" strokeWidth="1" />
      </svg>

      {/* Heat overlay */}
      {heatmap && (
        <div className="absolute inset-0">
          <div className="absolute w-[180px] h-[180px] rounded-full bg-emerald-500/12 blur-3xl" style={{ left: '35%', top: '30%' }} />
          <div className="absolute w-[220px] h-[220px] rounded-full bg-indigo-500/10 blur-3xl" style={{ left: '55%', top: '40%' }} />
          <div className="absolute w-[140px] h-[140px] rounded-full bg-amber-500/10 blur-3xl" style={{ left: '20%', top: '50%' }} />
          <div className="absolute w-[160px] h-[160px] rounded-full bg-emerald-400/08 blur-3xl" style={{ left: '70%', top: '55%' }} />
        </div>
      )}

      {/* Pins */}
      {buyers.map(b => (
        <div
          key={b.id}
          className="absolute cursor-pointer group"
          style={{ left: `${b.pinX}%`, top: `${b.pinY}%`, transform: 'translate(-50%, -50%)' }}
          onMouseEnter={() => setHoverBuyer(b.id)}
          onMouseLeave={() => setHoverBuyer(null)}
        >
          <div
            className="w-3 h-3 rounded-full border-2 border-white/60 group-hover:scale-150 transition-transform"
            style={{ background: scoreDot(b.score) }}
          />
          {/* Popup */}
          {hoverBuyer === b.id && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#12141a] border border-gray-700 rounded-lg px-3 py-2.5 shadow-xl z-10 min-w-[180px]">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-6 h-6 rounded-full bg-[#F3F4F6] flex items-center justify-center flex-shrink-0">
                  <span className="text-[0.46rem] font-medium text-[#6B7280]">{b.initials}</span>
                </div>
                <span className="text-[0.8rem] font-medium text-white">{b.name}</span>
                <span className={`text-[0.6rem] font-bold px-1.5 py-0.5 rounded-full border ${scoreColor(b.score)}`}>{b.score}</span>
              </div>
              <div className="text-[0.7rem] text-gray-400 mb-2">{b.buyBox}</div>
              <button
                onClick={() => onOpenDetail(b)}
                className="w-full text-[0.72rem] font-medium text-[#818CF8] hover:text-[#A5B4FC] bg-transparent border-0 cursor-pointer text-left transition-colors"
              >
                View Profile →
              </button>
              {/* Arrow */}
              <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 bg-[#12141a] border-r border-b border-gray-700 rotate-45" />
            </div>
          )}
        </div>
      ))}

      {/* Map label */}
      <div className="absolute top-3 left-3 bg-[#12141a]/80 backdrop-blur-sm rounded-md px-2.5 py-1.5 border border-gray-700/50">
        <span className="text-[0.72rem] text-gray-300 font-medium">All Markets</span>
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 bg-[#12141a]/90 backdrop-blur-sm rounded-lg px-3 py-2.5 border border-gray-700/50">
        <div className="text-[0.62rem] text-gray-400 uppercase tracking-wide mb-1.5">Buyer Score</div>
        <div className="space-y-1">
          {[
            { label: 'A: Top Buyer', color: '#10b981' },
            { label: 'B: Good', color: '#4F46E5' },
            { label: 'C: Fair', color: '#f59e0b' },
            { label: 'D: Low', color: '#ef4444' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: l.color }} />
              <span className="text-[0.66rem] text-gray-300">{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Heatmap toggle */}
      <div className="absolute top-3 right-3">
        <button
          onClick={() => setHeatmap(!heatmap)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[0.68rem] font-medium border cursor-pointer transition-all ${
            heatmap
              ? 'bg-[#4F46E5] border-[#4338CA] text-white'
              : 'bg-[#12141a]/80 backdrop-blur-sm border-gray-700/50 text-gray-400 hover:text-gray-200 hover:border-gray-600'
          }`}
        >
          <Flame className="w-3 h-3" />
          Buyer Density
        </button>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   BUYER DETAIL PANEL
   ═══════════════════════════════════════════════ */
function BuyerDetail({ buyer, onClose }: { buyer: Buyer; onClose: () => void }) {
  function tlIcon(type: string) {
    switch (type) {
      case 'phone': return <Phone className="w-3.5 h-3.5 text-[#4F46E5]" />
      case 'email': return <Mail className="w-3.5 h-3.5 text-violet-500" />
      case 'deal': return <Home className="w-3.5 h-3.5 text-amber-500" />
      case 'contract': return <FileSignature className="w-3.5 h-3.5 text-emerald-500" />
      default: return <Circle className="w-3.5 h-3.5 text-gray-400" />
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-fadeIn" onClick={onClose} />
      <div className="relative w-[520px] h-full bg-white shadow-none overflow-y-auto crm-detail-panel animate-slideInRight border-l border-[#E5E7EB]">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center cursor-pointer border-0 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-[#F3F4F6] flex items-center justify-center flex-shrink-0">
              <span className="text-[0.7rem] font-medium text-[#6B7280]">{buyer.initials}</span>
            </div>
            <div>
              <h2 className="text-[1.1rem] font-medium text-gray-900">
                {buyer.name}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[0.68rem] font-bold px-2 py-0.5 rounded-full border ${scoreColor(buyer.score)}`}>
                  Score: {buyer.score}
                </span>
                <span className={`text-[0.68rem] font-medium px-2 py-0.5 rounded-full ${statusStyle(buyer.status)}`}>
                  {buyer.status}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            {buyer.markets.map(m => (
              <span key={m} className="text-[0.68rem] text-gray-500 bg-gray-100 rounded-full px-2 py-0.5 flex items-center gap-1">
                <MapPin className="w-2.5 h-2.5" />{m}
              </span>
            ))}
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Contact Info */}
          <div>
            <div className="text-xs font-medium text-[#6B7280] uppercase tracking-[0.05em] mb-2.5">Contact Info</div>
            <div className="bg-gray-50 rounded-lg px-4 py-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[0.78rem] text-gray-500 flex items-center gap-1.5"><Phone className="w-3 h-3" />Phone</span>
                <span className="text-[0.82rem] text-gray-800">{buyer.phone}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[0.78rem] text-gray-500 flex items-center gap-1.5"><Mail className="w-3 h-3" />Email</span>
                <span className="text-[0.82rem] text-gray-800">{buyer.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[0.78rem] text-gray-500 flex items-center gap-1.5"><MapPin className="w-3 h-3" />Address</span>
                <span className="text-[0.78rem] text-gray-700 text-right max-w-[55%]">{buyer.mailingAddress}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[0.78rem] text-gray-500">Preferred</span>
                <span className="text-[0.78rem] text-gray-700">{buyer.preferredContact}</span>
              </div>
            </div>
          </div>

          {/* Buy Box */}
          <div>
            <div className="text-xs font-medium text-[#6B7280] uppercase tracking-[0.05em] mb-2.5">Buy Box</div>
            <div className="bg-gray-50 rounded-lg px-4 py-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[0.78rem] text-gray-500">Property Types</span>
                <span className="text-[0.82rem] text-gray-800">{buyer.propertyTypes.join(', ')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[0.78rem] text-gray-500">Price Range</span>
                <span className="text-[0.82rem] font-medium text-gray-800">{buyer.priceRange}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[0.78rem] text-gray-500">Target Zips</span>
                <span className="text-[0.78rem] text-gray-700">{buyer.targetZips}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[0.78rem] text-gray-500">Strategy</span>
                <span className="text-[0.82rem] text-gray-800">{buyer.strategy}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[0.78rem] text-gray-500">Closing Speed</span>
                <span className="text-[0.82rem] text-gray-800">{buyer.closingSpeed}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[0.78rem] text-gray-500">Proof of Funds</span>
                <span className={`text-[0.72rem] font-medium px-2 py-0.5 rounded-full ${
                  buyer.pofStatus === 'Verified' ? 'text-emerald-700 bg-emerald-50' : 'text-gray-500 bg-gray-200'
                }`}>
                  {buyer.pofStatus === 'Verified' ? `✓ Verified ${buyer.pofDate}` : 'Unverified'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[0.78rem] text-gray-500">Funding Source</span>
                <span className="text-[0.82rem] text-gray-800">{buyer.fundingSource}</span>
              </div>
            </div>
          </div>

          {/* Activity Timeline */}
          <div>
            <div className="text-xs font-medium text-[#6B7280] uppercase tracking-[0.05em] mb-2.5">Activity Timeline</div>
            <div className="relative pl-5">
              {/* Vertical line */}
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gray-200" />
              <div className="space-y-4">
                {timeline.map((e, i) => (
                  <div key={i} className="relative">
                    <div className="absolute left-[-20px] top-0.5 w-[15px] h-[15px] rounded-full bg-white border-2 border-gray-200 flex items-center justify-center">
                      {tlIcon(e.type)}
                    </div>
                    <div>
                      <div className="text-[0.68rem] text-gray-400 mb-0.5">{e.date} · {e.time}</div>
                      <div className="text-[0.78rem] text-gray-700 leading-relaxed">{e.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tags */}
          <div>
            <div className="text-xs font-medium text-[#6B7280] uppercase tracking-[0.05em] mb-2.5">Tags</div>
            <div className="flex flex-wrap gap-1.5">
              {buyer.tags.map(t => (
                <span key={t} className={`text-[0.72rem] font-medium px-2.5 py-1 rounded-full border ${tagColor(t)}`}>
                  {t}
                </span>
              ))}
              <button className="text-[0.72rem] text-gray-400 hover:text-[#4F46E5] border border-dashed border-gray-300 hover:border-[#4F46E5] rounded-full px-2.5 py-1 bg-transparent cursor-pointer transition-colors flex items-center gap-1">
                <Plus className="w-3 h-3" />
                Add Tag
              </button>
            </div>
          </div>
        </div>

        {/* Bottom actions */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4">
          <div className="grid grid-cols-2 gap-2.5">
            <button className="flex items-center justify-center gap-1.5 bg-[#4F46E5] hover:bg-[#4338CA] text-white border-0 rounded-md py-2.5 text-[0.82rem] font-medium cursor-pointer transition-colors">
              <PhoneOutgoing className="w-4 h-4" />
              Start Outreach
            </button>
            <button className="flex items-center justify-center gap-1.5 bg-white border border-[#D1D5DB] hover:bg-[#F9FAFB] text-[#374151] rounded-md py-2.5 text-[0.82rem] font-medium cursor-pointer transition-colors">
              <Send className="w-4 h-4" />
              Send Deal
            </button>
            <button className="flex items-center justify-center gap-1.5 bg-white border border-[#D1D5DB] hover:bg-[#F9FAFB] text-[#374151] rounded-md py-2.5 text-[0.82rem] font-medium cursor-pointer transition-colors">
              <Pencil className="w-4 h-4" />
              Edit Profile
            </button>
            <button className="flex items-center justify-center gap-1.5 bg-white border border-[#D1D5DB] hover:bg-[#F9FAFB] text-[#374151] rounded-md py-2.5 text-[0.82rem] font-medium cursor-pointer transition-colors">
              <Archive className="w-4 h-4" />
              Archive
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .crm-detail-panel { width: 100% !important; }
        }
      `}</style>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   MAIN CRM PAGE
   ═══════════════════════════════════════════════ */
export default function BuyerCrmPage() {
  const [view, setView] = useState<'list' | 'pipeline' | 'map'>('list')
  const [detailBuyer, setDetailBuyer] = useState<Buyer | null>(null)

  return (
    <div className="p-8 max-w-[1400px] bg-[#FAFAFA]">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1
            className="text-2xl font-semibold text-[#111827] mb-1"
          >
            Buyer CRM
          </h1>
          <p className="text-sm text-[#9CA3AF]">
            Manage your cash buyer relationships and pipeline.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 bg-white border border-[#D1D5DB] hover:bg-[#F9FAFB] text-[#374151] rounded-md px-4 py-2 text-[0.82rem] font-medium cursor-pointer transition-colors">
            <Upload className="w-4 h-4" />
            Import CSV
          </button>
          <button className="flex items-center gap-1.5 bg-[#4F46E5] hover:bg-[#4338CA] text-white border-0 rounded-md px-4 py-2 text-[0.82rem] font-medium cursor-pointer transition-colors">
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
            type="text"
            placeholder="Search name, phone, market, tag..."
            className="w-full bg-white border border-gray-200 rounded-lg pl-10 pr-4 py-2 text-[0.82rem] text-gray-700 placeholder-gray-400 outline-none focus:border-[#4F46E5] transition-colors"
          />
        </div>
        <FilterSelect label="Market" options={['Dallas', 'Atlanta', 'Phoenix', 'Tampa', 'All']} />
        <FilterSelect label="Score" options={['A', 'B', 'C', 'D']} />
        <FilterSelect label="Status" options={['Active', 'Dormant', 'New', 'High-Confidence', 'Recently Verified']} />
        <FilterSelect label="Strategy" options={['Flip', 'Rental', 'Either', 'Hold']} />
        <FilterSelect label="Type Pref" options={['SFR', 'Multi-Family', 'Land', 'Condo']} />
        <FilterSelect label="Source" options={['AI Outreach', 'Manual Entry', 'Discovery Import', 'Marketplace']} />

        {/* View toggle */}
        <div className="ml-auto flex items-center bg-gray-100 rounded-lg p-0.5">
          {[
            { key: 'list' as const, icon: List, label: 'List' },
            { key: 'pipeline' as const, icon: Columns3, label: 'Pipeline' },
            { key: 'map' as const, icon: MapPin, label: 'Map' },
          ].map(v => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[0.76rem] font-medium border-0 cursor-pointer transition-colors ${
                view === v.key
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'bg-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              <v.icon className="w-3.5 h-3.5" />
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-5 text-[0.78rem] text-gray-500 mb-5">
        <span><strong className="text-gray-700">847</strong> buyers</span>
        <span className="text-gray-300">|</span>
        <span><strong className="text-gray-700">312</strong> Active</span>
        <span className="text-gray-300">|</span>
        <span><strong className="text-gray-700">89</strong> High-Confidence</span>
        <span className="text-gray-300">|</span>
        <span><strong className="text-gray-700">147</strong> Recently Verified</span>
      </div>

      {/* Views */}
      {view === 'list' && <ListView onOpenDetail={setDetailBuyer} />}
      {view === 'pipeline' && <PipelineView onOpenDetail={setDetailBuyer} />}
      {view === 'map' && <MapView onOpenDetail={setDetailBuyer} />}

      {/* Detail panel */}
      {detailBuyer && <BuyerDetail buyer={detailBuyer} onClose={() => setDetailBuyer(null)} />}

      <style>{`
        @media (max-width: 1000px) {
          .crm-pipeline { overflow-x: auto; }
        }
      `}</style>
    </div>
  )
}
