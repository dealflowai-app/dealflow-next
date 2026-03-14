'use client'

import { useState } from 'react'
import {
  Search,
  SlidersHorizontal,
  X,
  MapPin,
  Home,
  Building2,
  LandPlot,
  Warehouse,
  BedDouble,
  Bath,
  Ruler,
  Calendar,
  Percent,
  UserCircle,
  Lock,
  Plus,
  BarChart3,
  PhoneOutgoing,
  Map as MapIcon,
  Eye,
  Flame,
  Clock,
  AlertTriangle,
  Mail,
  Phone,
  Sparkles,
} from 'lucide-react'

/* ═══════════════════════════════════════════════
   MOCK DATA:PROPERTIES
   ═══════════════════════════════════════════════ */
const properties = [
  {
    id: 1,
    address: '4217 Magnolia Ave',
    city: 'Dallas',
    zip: '75215',
    type: 'SFR',
    beds: 3,
    baths: 2,
    sqft: 1840,
    lotSize: '6,200 sqft',
    yearBuilt: 1978,
    value: 285000,
    equity: 82,
    lastSaleDate: 'Jun 2018',
    lastSalePrice: 165000,
    taxAssessed: 248000,
    owner: 'John D.',
    ownerFull: 'John Delacroix',
    ownerType: 'Individual',
    mailingAddress: '901 Commerce St, Apt 4B, Dallas TX 75202',
    ownershipYears: 6,
    phone: '●●●-●●●-4821',
    email: 'j●●●●@gmail.com',
    absentee: true,
    taxDelinquent: false,
    preForeclosure: false,
    probate: false,
    pinX: 28,
    pinY: 35,
  },
  {
    id: 2,
    address: '1502 Canton St',
    city: 'Dallas',
    zip: '75201',
    type: 'Multi-Family',
    beds: 6,
    baths: 4,
    sqft: 3200,
    lotSize: '8,100 sqft',
    yearBuilt: 1965,
    value: 420000,
    equity: 45,
    lastSaleDate: 'Mar 2021',
    lastSalePrice: 310000,
    taxAssessed: 385000,
    owner: 'Oakwood LLC',
    ownerFull: 'Oakwood Properties LLC',
    ownerType: 'LLC/Corp',
    mailingAddress: 'PO Box 4418, Dallas TX 75208',
    ownershipYears: 3,
    phone: '●●●-●●●-7793',
    email: 'o●●●●@oakwoodprop.com',
    absentee: true,
    taxDelinquent: true,
    preForeclosure: false,
    probate: false,
    pinX: 35,
    pinY: 28,
  },
  {
    id: 3,
    address: '8901 Bruton Rd',
    city: 'Dallas',
    zip: '75217',
    type: 'SFR',
    beds: 4,
    baths: 2,
    sqft: 2100,
    lotSize: '7,500 sqft',
    yearBuilt: 1982,
    value: 195000,
    equity: 91,
    lastSaleDate: 'Aug 2010',
    lastSalePrice: 92000,
    taxAssessed: 178000,
    owner: 'Maria G.',
    ownerFull: 'Maria Gonzalez',
    ownerType: 'Individual',
    mailingAddress: '8901 Bruton Rd, Dallas TX 75217',
    ownershipYears: 14,
    phone: '●●●-●●●-2105',
    email: 'm●●●●@yahoo.com',
    absentee: false,
    taxDelinquent: false,
    preForeclosure: true,
    probate: false,
    pinX: 72,
    pinY: 55,
  },
  {
    id: 4,
    address: '3340 W Illinois Ave',
    city: 'Dallas',
    zip: '75211',
    type: 'SFR',
    beds: 3,
    baths: 1,
    sqft: 1420,
    lotSize: '5,800 sqft',
    yearBuilt: 1955,
    value: 165000,
    equity: 100,
    lastSaleDate: 'Dec 2003',
    lastSalePrice: 68000,
    taxAssessed: 152000,
    owner: 'Estate of R. Williams',
    ownerFull: 'Estate of Robert Williams',
    ownerType: 'Trust',
    mailingAddress: '2200 Ross Ave, Ste 300, Dallas TX 75201',
    ownershipYears: 21,
    phone: '●●●-●●●-8837',
    email: 'r●●●●@probatelaw.com',
    absentee: true,
    taxDelinquent: true,
    preForeclosure: false,
    probate: true,
    pinX: 18,
    pinY: 62,
  },
  {
    id: 5,
    address: '6728 Greenville Ave',
    city: 'Dallas',
    zip: '75231',
    type: 'Condo',
    beds: 2,
    baths: 2,
    sqft: 1150,
    lotSize: 'N/A',
    yearBuilt: 2008,
    value: 310000,
    equity: 55,
    lastSaleDate: 'Nov 2019',
    lastSalePrice: 240000,
    taxAssessed: 295000,
    owner: 'James T.',
    ownerFull: 'James Thornton',
    ownerType: 'Individual',
    mailingAddress: '1414 Elm St, Apt 12, Austin TX 78701',
    ownershipYears: 5,
    phone: '●●●-●●●-5519',
    email: 'j●●●●@icloud.com',
    absentee: true,
    taxDelinquent: false,
    preForeclosure: false,
    probate: false,
    pinX: 55,
    pinY: 20,
  },
  {
    id: 6,
    address: 'Lot 8, Chalk Hill Rd',
    city: 'Dallas',
    zip: '75212',
    type: 'Land',
    beds: 0,
    baths: 0,
    sqft: 0,
    lotSize: '12,400 sqft',
    yearBuilt: 0,
    value: 78000,
    equity: 100,
    lastSaleDate: 'Apr 2015',
    lastSalePrice: 32000,
    taxAssessed: 65000,
    owner: 'Horizon Dev.',
    ownerFull: 'Horizon Development Group LLC',
    ownerType: 'LLC/Corp',
    mailingAddress: '500 N Akard St, Ste 2100, Dallas TX 75201',
    ownershipYears: 9,
    phone: '●●●-●●●-6601',
    email: 'i●●●●@horizondev.com',
    absentee: true,
    taxDelinquent: false,
    preForeclosure: false,
    probate: false,
    pinX: 22,
    pinY: 48,
  },
  {
    id: 7,
    address: '2914 Pine St',
    city: 'Dallas',
    zip: '75226',
    type: 'SFR',
    beds: 3,
    baths: 2,
    sqft: 1680,
    lotSize: '6,000 sqft',
    yearBuilt: 1972,
    value: 230000,
    equity: 73,
    lastSaleDate: 'Jan 2017',
    lastSalePrice: 128000,
    taxAssessed: 210000,
    owner: 'Patricia M.',
    ownerFull: 'Patricia Moreno',
    ownerType: 'Individual',
    mailingAddress: '2914 Pine St, Dallas TX 75226',
    ownershipYears: 7,
    phone: '●●●-●●●-3342',
    email: 'p●●●●@hotmail.com',
    absentee: false,
    taxDelinquent: false,
    preForeclosure: false,
    probate: false,
    pinX: 48,
    pinY: 40,
  },
  {
    id: 8,
    address: '5100 Samuell Blvd',
    city: 'Dallas',
    zip: '75228',
    type: 'SFR',
    beds: 4,
    baths: 3,
    sqft: 2400,
    lotSize: '9,200 sqft',
    yearBuilt: 1990,
    value: 340000,
    equity: 38,
    lastSaleDate: 'Sep 2022',
    lastSalePrice: 295000,
    taxAssessed: 320000,
    owner: 'DBR Capital',
    ownerFull: 'DBR Capital Holdings LLC',
    ownerType: 'LLC/Corp',
    mailingAddress: '3500 Maple Ave, Ste 400, Dallas TX 75219',
    ownershipYears: 2,
    phone: '●●●-●●●-9014',
    email: 'a●●●●@dbrcapital.com',
    absentee: true,
    taxDelinquent: false,
    preForeclosure: false,
    probate: false,
    pinX: 65,
    pinY: 65,
  },
  {
    id: 9,
    address: '1847 Oak Lawn Ave',
    city: 'Dallas',
    zip: '75219',
    type: 'Multi-Family',
    beds: 8,
    baths: 6,
    sqft: 4800,
    lotSize: '10,500 sqft',
    yearBuilt: 1958,
    value: 580000,
    equity: 67,
    lastSaleDate: 'Jul 2016',
    lastSalePrice: 320000,
    taxAssessed: 540000,
    owner: 'Vera S.',
    ownerFull: 'Vera Stanton',
    ownerType: 'Individual',
    mailingAddress: '4200 Cedar Springs Rd, Dallas TX 75219',
    ownershipYears: 8,
    phone: '●●●-●●●-7720',
    email: 'v●●●●@gmail.com',
    absentee: true,
    taxDelinquent: false,
    preForeclosure: true,
    probate: false,
    pinX: 38,
    pinY: 18,
  },
  {
    id: 10,
    address: '7622 Military Pkwy',
    city: 'Dallas',
    zip: '75227',
    type: 'SFR',
    beds: 3,
    baths: 2,
    sqft: 1550,
    lotSize: '5,500 sqft',
    yearBuilt: 1968,
    value: 175000,
    equity: 88,
    lastSaleDate: 'Feb 2012',
    lastSalePrice: 75000,
    taxAssessed: 160000,
    owner: 'Anthony B.',
    ownerFull: 'Anthony Brooks',
    ownerType: 'Individual',
    mailingAddress: '210 E Davis St, Mesquite TX 75149',
    ownershipYears: 12,
    phone: '●●●-●●●-1456',
    email: 'a●●●●@att.net',
    absentee: true,
    taxDelinquent: true,
    preForeclosure: false,
    probate: false,
    pinX: 78,
    pinY: 50,
  },
]

type Property = typeof properties[number]

/* ═══════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════ */
function typeIcon(type: string) {
  switch (type) {
    case 'SFR': return <Home className="w-3.5 h-3.5" />
    case 'Multi-Family': return <Building2 className="w-3.5 h-3.5" />
    case 'Land': return <LandPlot className="w-3.5 h-3.5" />
    case 'Condo': return <Building2 className="w-3.5 h-3.5" />
    case 'Commercial': return <Warehouse className="w-3.5 h-3.5" />
    default: return <Home className="w-3.5 h-3.5" />
  }
}

function typeBadgeColor(_type: string) {
  return 'text-[#6B7280] bg-[#F3F4F6] border border-[#E5E7EB]'
}

function equityColor(pct: number) {
  if (pct >= 70) return 'bg-emerald-500'
  if (pct >= 40) return 'bg-amber-400'
  return 'bg-red-400'
}

function equityTextColor(pct: number) {
  if (pct >= 70) return 'text-emerald-600'
  if (pct >= 40) return 'text-amber-600'
  return 'text-red-500'
}

function pinColor(_type: string) {
  return '#4F46E5'
}

function ownerTypeBadge(_type: string) {
  return 'text-[#6B7280] bg-[#F3F4F6] border border-[#E5E7EB]'
}

/* ═══════════════════════════════════════════════
   MAP COMPONENT (styled placeholder)
   ═══════════════════════════════════════════════ */
function DiscoveryMap({ properties, onPinClick, activeId }: { properties: Property[]; onPinClick: (id: number) => void; activeId: number | null }) {
  const [layers, setLayers] = useState({ equity: false, distressed: false, cashBuyers: false, dom: false })

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden bg-[#1a1d23] border border-gray-800">
      {/* Grid pattern to simulate map */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#ffffff" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Simulated roads */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.08]">
        <line x1="0" y1="30%" x2="100%" y2="30%" stroke="#ffffff" strokeWidth="2" />
        <line x1="0" y1="60%" x2="100%" y2="55%" stroke="#ffffff" strokeWidth="1.5" />
        <line x1="25%" y1="0" x2="30%" y2="100%" stroke="#ffffff" strokeWidth="2" />
        <line x1="60%" y1="0" x2="55%" y2="100%" stroke="#ffffff" strokeWidth="1.5" />
        <line x1="0" y1="80%" x2="100%" y2="78%" stroke="#ffffff" strokeWidth="1" />
        <line x1="80%" y1="0" x2="82%" y2="100%" stroke="#ffffff" strokeWidth="1" />
        <line x1="10%" y1="0" x2="12%" y2="100%" stroke="#ffffff" strokeWidth="0.5" />
        <line x1="45%" y1="0" x2="43%" y2="100%" stroke="#ffffff" strokeWidth="0.5" />
        <line x1="0" y1="15%" x2="100%" y2="18%" stroke="#ffffff" strokeWidth="0.5" />
        <line x1="0" y1="45%" x2="100%" y2="42%" stroke="#ffffff" strokeWidth="0.5" />
      </svg>

      {/* Cash buyers heat overlay */}
      {layers.cashBuyers && (
        <div className="absolute inset-0">
          <div className="absolute w-[200px] h-[200px] rounded-full bg-indigo-500/10 blur-3xl" style={{ left: '20%', top: '15%' }} />
          <div className="absolute w-[280px] h-[280px] rounded-full bg-indigo-500/15 blur-3xl" style={{ left: '40%', top: '30%' }} />
          <div className="absolute w-[150px] h-[150px] rounded-full bg-indigo-400/10 blur-3xl" style={{ left: '65%', top: '50%' }} />
        </div>
      )}

      {/* Cluster indicator */}
      <div
        className="absolute flex items-center justify-center w-10 h-10 rounded-full bg-[#4F46E5]/80 border-2 border-[#818CF8]/50 cursor-pointer hover:scale-110 transition-transform"
        style={{ left: '42%', top: '42%' }}
      >
        <span className="text-[0.7rem] font-bold text-white">124</span>
      </div>
      <div
        className="absolute flex items-center justify-center w-8 h-8 rounded-full bg-violet-600/80 border-2 border-violet-400/50 cursor-pointer hover:scale-110 transition-transform"
        style={{ left: '15%', top: '72%' }}
      >
        <span className="text-[0.62rem] font-bold text-white">47</span>
      </div>

      {/* Property pins */}
      {properties.map(p => (
        <button
          key={p.id}
          onClick={() => onPinClick(p.id)}
          className="absolute cursor-pointer border-0 bg-transparent p-0 group"
          style={{ left: `${p.pinX}%`, top: `${p.pinY}%`, transform: 'translate(-50%, -100%)' }}
          title={p.address}
        >
          <div className="relative">
            <svg width="24" height="32" viewBox="0 0 24 32">
              <path
                d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20C24 5.4 18.6 0 12 0z"
                fill={activeId === p.id ? '#ffffff' : pinColor(p.type)}
                opacity={activeId === p.id ? 1 : 0.9}
              />
              <circle cx="12" cy="11" r="4.5" fill={activeId === p.id ? pinColor(p.type) : '#ffffff'} opacity="0.9" />
            </svg>
            {activeId === p.id && (
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-1 rounded-full bg-white/30 blur-sm" />
            )}
          </div>
        </button>
      ))}

      {/* Legend */}
      <div className="absolute bottom-3 left-3 bg-[#12141a]/90 backdrop-blur-sm rounded-lg px-3 py-2.5 border border-gray-700/50">
        <div className="text-[0.62rem] text-gray-400 uppercase tracking-wide mb-1.5">Legend</div>
        <div className="space-y-1">
          {[
            { label: 'SFR', color: '#4F46E5' },
            { label: 'Multi-Family', color: '#4F46E5' },
            { label: 'Land', color: '#4F46E5' },
            { label: 'Condo', color: '#4F46E5' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: l.color }} />
              <span className="text-[0.66rem] text-gray-300">{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Layer toggles */}
      <div className="absolute top-3 right-3 flex flex-col gap-1.5">
        {[
          { key: 'equity' as const, label: 'High Equity', icon: Percent },
          { key: 'distressed' as const, label: 'Distressed', icon: AlertTriangle },
          { key: 'cashBuyers' as const, label: 'Cash Buyers', icon: Flame },
          { key: 'dom' as const, label: 'Long DOM', icon: Clock },
        ].map(l => {
          const Icon = l.icon
          const active = layers[l.key]
          return (
            <button
              key={l.key}
              onClick={() => setLayers(prev => ({ ...prev, [l.key]: !prev[l.key] }))}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[0.68rem] font-medium border cursor-pointer transition-all ${
                active
                  ? 'bg-[#4F46E5] border-[#4F46E5] text-white'
                  : 'bg-[#12141a]/80 backdrop-blur-sm border-gray-700/50 text-gray-400 hover:text-gray-200 hover:border-gray-600'
              }`}
            >
              <Icon className="w-3 h-3" />
              {l.label}
            </button>
          )
        })}
      </div>

      {/* "Dallas, TX" label */}
      <div className="absolute top-3 left-3 bg-[#12141a]/80 backdrop-blur-sm rounded-md px-2.5 py-1.5 border border-gray-700/50">
        <span className="text-[0.72rem] text-gray-300 font-medium">Dallas, TX</span>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   FILTER PANEL
   ═══════════════════════════════════════════════ */
function FilterPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-lg px-5 py-5 mb-4">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[0.88rem] font-medium text-[#111827]">Filters</span>
        <button onClick={onClose} className="text-gray-400 hover:text-[#6B7280] cursor-pointer bg-transparent border-0 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6 disc-filter-grid">
        {/* Property Filters */}
        <div>
          <div className="text-xs font-medium text-[#6B7280] uppercase tracking-[0.05em] mb-3 font-medium">Property Filters</div>
          <div className="space-y-3">
            {/* Property Type */}
            <div>
              <label className="text-[0.76rem] text-[#6B7280] mb-1.5 block">Property Type</label>
              <div className="flex flex-wrap gap-1.5">
                {['SFR', 'Multi-Family', 'Condo', 'Land', 'Commercial'].map(t => (
                  <label key={t} className="flex items-center gap-1.5 text-[0.76rem] text-[#374151] bg-[#F3F4F6] border border-[#E5E7EB] rounded-md px-2.5 py-1.5 cursor-pointer hover:bg-[#F9FAFB] transition-colors">
                    <input type="checkbox" className="accent-[#4F46E5] w-3 h-3" defaultChecked={t === 'SFR'} />
                    {t}
                  </label>
                ))}
              </div>
            </div>
            {/* Bed/Bath/Sqft row */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Bedrooms', min: '0', max: 'Any' },
                { label: 'Bathrooms', min: '0', max: 'Any' },
                { label: 'Sq Ft', min: '0', max: 'Any' },
              ].map(f => (
                <div key={f.label}>
                  <label className="text-[0.72rem] text-gray-500 mb-1 block">{f.label}</label>
                  <div className="flex gap-1">
                    <input type="text" placeholder={f.min} className="w-full bg-white border border-[#E5E7EB] rounded px-2 py-1.5 text-[0.76rem] text-[#374151] outline-none focus:border-[#4F46E5]" />
                    <input type="text" placeholder={f.max} className="w-full bg-white border border-[#E5E7EB] rounded px-2 py-1.5 text-[0.76rem] text-[#374151] outline-none focus:border-[#4F46E5]" />
                  </div>
                </div>
              ))}
            </div>
            {/* Year Built */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[0.72rem] text-gray-500 mb-1 block">Year Built (min)</label>
                <input type="text" placeholder="1900" className="w-full bg-white border border-[#E5E7EB] rounded px-2 py-1.5 text-[0.76rem] text-[#374151] outline-none focus:border-[#4F46E5]" />
              </div>
              <div>
                <label className="text-[0.72rem] text-gray-500 mb-1 block">Year Built (max)</label>
                <input type="text" placeholder="2026" className="w-full bg-white border border-[#E5E7EB] rounded px-2 py-1.5 text-[0.76rem] text-[#374151] outline-none focus:border-[#4F46E5]" />
              </div>
            </div>
            {/* Value / Equity */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[0.72rem] text-gray-500 mb-1 block">Est. Value Range</label>
                <div className="flex gap-1">
                  <input type="text" placeholder="$0" className="w-full bg-white border border-[#E5E7EB] rounded px-2 py-1.5 text-[0.76rem] text-[#374151] outline-none focus:border-[#4F46E5]" />
                  <input type="text" placeholder="$1M+" className="w-full bg-white border border-[#E5E7EB] rounded px-2 py-1.5 text-[0.76rem] text-[#374151] outline-none focus:border-[#4F46E5]" />
                </div>
              </div>
              <div>
                <label className="text-[0.72rem] text-gray-500 mb-1 block">Equity %</label>
                <div className="flex gap-1">
                  <input type="text" placeholder="0%" className="w-full bg-white border border-[#E5E7EB] rounded px-2 py-1.5 text-[0.76rem] text-[#374151] outline-none focus:border-[#4F46E5]" />
                  <input type="text" placeholder="100%" className="w-full bg-white border border-[#E5E7EB] rounded px-2 py-1.5 text-[0.76rem] text-[#374151] outline-none focus:border-[#4F46E5]" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Owner Filters */}
        <div>
          <div className="text-xs font-medium text-[#6B7280] uppercase tracking-[0.05em] mb-3 font-medium">Owner Filters</div>
          <div className="space-y-3">
            <div>
              <label className="text-[0.76rem] text-[#6B7280] mb-1.5 block">Owner Type</label>
              <div className="flex flex-wrap gap-1.5">
                {['Individual', 'LLC/Corp', 'Trust', 'Bank-Owned'].map(t => (
                  <label key={t} className="flex items-center gap-1.5 text-[0.76rem] text-[#374151] bg-[#F3F4F6] border border-[#E5E7EB] rounded-md px-2.5 py-1.5 cursor-pointer hover:bg-[#F9FAFB] transition-colors">
                    <input type="checkbox" className="accent-[#4F46E5] w-3 h-3" />
                    {t}
                  </label>
                ))}
              </div>
            </div>
            {/* Toggles */}
            <div className="space-y-2.5 pt-1">
              {[
                { label: 'Absentee Owner', key: 'absentee' },
                { label: 'Tax Delinquent', key: 'tax' },
                { label: 'Pre-Foreclosure', key: 'prefc' },
                { label: 'Probate', key: 'probate' },
              ].map(tog => (
                <div key={tog.key} className="flex items-center justify-between">
                  <span className="text-[0.78rem] text-[#6B7280]">{tog.label}</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-9 h-5 bg-gray-200 peer-checked:bg-[#4F46E5] rounded-full transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
                  </label>
                </div>
              ))}
            </div>
            {/* Ownership length */}
            <div>
              <label className="text-[0.72rem] text-gray-500 mb-1 block">Min Ownership (years)</label>
              <input type="text" placeholder="Any" className="w-24 bg-white border border-[#E5E7EB] rounded px-2 py-1.5 text-[0.76rem] text-[#374151] outline-none focus:border-[#4F46E5]" />
            </div>
          </div>
        </div>
      </div>

      {/* Apply */}
      <div className="flex items-center justify-between mt-5 pt-4 border-t border-[#E5E7EB]">
        <button className="text-[0.78rem] text-gray-400 hover:text-[#6B7280] cursor-pointer bg-transparent border-0 transition-colors">
          Reset all filters
        </button>
        <button
          onClick={onClose}
          className="bg-[#4F46E5] hover:bg-[#4338CA] text-white font-medium border-0 rounded-md px-5 py-2 text-[0.82rem] cursor-pointer transition-colors"
        >
          Apply Filters
        </button>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   PROPERTY DETAIL PANEL
   ═══════════════════════════════════════════════ */
function PropertyDetail({ property, onClose }: { property: Property; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-fadeIn" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-[520px] h-full bg-white border border-[#E5E7EB] overflow-y-auto disc-detail-panel animate-slideInRight">
        {/* Header with mini map */}
        <div className="h-[160px] bg-[#1a1d23] relative">
          <svg className="absolute inset-0 w-full h-full opacity-[0.08]">
            <defs>
              <pattern id="detailGrid" width="30" height="30" patternUnits="userSpaceOnUse">
                <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#ffffff" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#detailGrid)" />
          </svg>
          <svg className="absolute inset-0 w-full h-full opacity-[0.06]">
            <line x1="0" y1="40%" x2="100%" y2="38%" stroke="#ffffff" strokeWidth="1.5" />
            <line x1="35%" y1="0" x2="38%" y2="100%" stroke="#ffffff" strokeWidth="1.5" />
            <line x1="0" y1="65%" x2="100%" y2="68%" stroke="#ffffff" strokeWidth="1" />
            <line x1="65%" y1="0" x2="62%" y2="100%" stroke="#ffffff" strokeWidth="1" />
          </svg>
          {/* Pin */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <svg width="32" height="42" viewBox="0 0 24 32">
              <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20C24 5.4 18.6 0 12 0z" fill={pinColor(property.type)} />
              <circle cx="12" cy="11" r="5" fill="#ffffff" opacity="0.9" />
            </svg>
          </div>
          {/* Close */}
          <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center cursor-pointer border-0 hover:bg-white/20 transition-colors">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="px-6 py-5">
          {/* Address */}
          <h2 className="text-2xl font-semibold text-[#111827] mb-0.5">
            {property.address}
          </h2>
          <p className="text-[0.82rem] text-gray-400 mb-4 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            {property.city}, TX {property.zip}
          </p>

          {/* Status flags */}
          <div className="flex flex-wrap gap-1.5 mb-5">
            <span className={`text-[0.68rem] font-medium px-2 py-0.5 rounded-full ${typeBadgeColor(property.type)}`}>
              {property.type}
            </span>
            {property.absentee && (
              <span className="text-[0.68rem] font-medium px-2 py-0.5 rounded-full text-amber-600 bg-amber-50/60">Absentee</span>
            )}
            {property.taxDelinquent && (
              <span className="text-[0.68rem] font-medium px-2 py-0.5 rounded-full text-red-600 bg-red-50/60">Tax Delinquent</span>
            )}
            {property.preForeclosure && (
              <span className="text-[0.68rem] font-medium px-2 py-0.5 rounded-full text-amber-600 bg-amber-50/60">Pre-Foreclosure</span>
            )}
            {property.probate && (
              <span className="text-[0.68rem] font-medium px-2 py-0.5 rounded-full text-violet-600 bg-violet-50/60">Probate</span>
            )}
          </div>

          {/* Property Characteristics */}
          <div className="mb-5">
            <div className="text-xs font-medium text-[#6B7280] uppercase tracking-[0.05em] mb-2.5 font-medium">Property Details</div>
            <div className="grid grid-cols-3 gap-y-3 gap-x-4">
              {property.beds > 0 && (
                <div className="flex items-center gap-1.5">
                  <BedDouble className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-[0.8rem] text-[#374151]">{property.beds} Beds</span>
                </div>
              )}
              {property.baths > 0 && (
                <div className="flex items-center gap-1.5">
                  <Bath className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-[0.8rem] text-[#374151]">{property.baths} Baths</span>
                </div>
              )}
              {property.sqft > 0 && (
                <div className="flex items-center gap-1.5">
                  <Ruler className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-[0.8rem] text-[#374151]">{property.sqft.toLocaleString()} sqft</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <LandPlot className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-[0.8rem] text-[#374151]">{property.lotSize}</span>
              </div>
              {property.yearBuilt > 0 && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-[0.8rem] text-[#374151]">Built {property.yearBuilt}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                {typeIcon(property.type)}
                <span className="text-[0.8rem] text-gray-400">{property.type}</span>
              </div>
            </div>
          </div>

          {/* Valuation */}
          <div className="mb-5">
            <div className="text-xs font-medium text-[#6B7280] uppercase tracking-[0.05em] mb-2.5 font-medium">Valuation</div>
            <div className="bg-[#FAFAFA] rounded-lg px-4 py-3 space-y-2.5 border border-[#E5E7EB]">
              <div className="flex items-center justify-between">
                <span className="text-[0.78rem] text-gray-500">Estimated Value</span>
                <span className="text-[0.88rem] font-semibold text-[#111827]">
                  ${property.value.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[0.78rem] text-gray-500">Estimated Equity</span>
                <span className={`text-[0.88rem] font-semibold ${equityTextColor(property.equity)}`}>
                  {property.equity}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[0.78rem] text-gray-500">Last Sale</span>
                <span className="text-[0.82rem] text-[#374151]">{property.lastSaleDate} for ${property.lastSalePrice.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[0.78rem] text-gray-500">Tax Assessed</span>
                <span className="text-[0.82rem] text-[#374151]">${property.taxAssessed.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Owner Information */}
          <div className="mb-5">
            <div className="text-xs font-medium text-[#6B7280] uppercase tracking-[0.05em] mb-2.5 font-medium">Owner Information</div>
            <div className="bg-[#FAFAFA] rounded-lg px-4 py-3 space-y-2.5 border border-[#E5E7EB]">
              <div className="flex items-center justify-between">
                <span className="text-[0.78rem] text-gray-500">Name</span>
                <span className="text-[0.82rem] font-medium text-[#111827]">{property.ownerFull}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[0.78rem] text-gray-500">Owner Type</span>
                <span className={`text-[0.72rem] font-medium px-2 py-0.5 rounded-full ${ownerTypeBadge(property.ownerType)}`}>
                  {property.ownerType}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[0.78rem] text-gray-500">Mailing Address</span>
                <span className="text-[0.78rem] text-[#374151] text-right max-w-[60%]">{property.mailingAddress}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[0.78rem] text-gray-500">Ownership</span>
                <span className="text-[0.82rem] text-[#374151]">{property.ownershipYears} years</span>
              </div>
              {/* Locked fields */}
              <div className="flex items-center justify-between">
                <span className="text-[0.78rem] text-gray-500 flex items-center gap-1">
                  <Phone className="w-3 h-3" /> Phone
                </span>
                <span className="flex items-center gap-1.5 text-[0.78rem] text-gray-400">
                  {property.phone}
                  <Lock className="w-3 h-3 text-gray-300" />
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[0.78rem] text-gray-500 flex items-center gap-1">
                  <Mail className="w-3 h-3" /> Email
                </span>
                <span className="flex items-center gap-1.5 text-[0.78rem] text-gray-400">
                  {property.email}
                  <Lock className="w-3 h-3 text-gray-300" />
                </span>
              </div>
              {/* Upgrade banner */}
              <div className="flex items-center gap-2 bg-[#EEF2FF] border border-[#C7D2FE] rounded-lg px-3 py-2 mt-1">
                <Sparkles className="w-4 h-4 text-[#4F46E5] flex-shrink-0" />
                <span className="text-[0.74rem] text-[#4338CA]">
                  <strong>Upgrade to Pro</strong> to unlock full contact info
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-2.5">
            <button className="flex items-center justify-center gap-1.5 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-medium border-0 rounded-md py-2.5 text-[0.82rem] cursor-pointer transition-colors">
              <Plus className="w-4 h-4" />
              Add to CRM
            </button>
            <button className="flex items-center justify-center gap-1.5 bg-white text-[#374151] border border-[#D1D5DB] hover:bg-[#F9FAFB] rounded-md py-2.5 text-[0.82rem] font-medium cursor-pointer transition-colors">
              <BarChart3 className="w-4 h-4" />
              Run Analysis
            </button>
            <button className="flex items-center justify-center gap-1.5 bg-white text-[#374151] border border-[#D1D5DB] hover:bg-[#F9FAFB] rounded-md py-2.5 text-[0.82rem] font-medium cursor-pointer transition-colors">
              <PhoneOutgoing className="w-4 h-4" />
              Start Outreach
            </button>
            <button className="flex items-center justify-center gap-1.5 bg-white text-[#374151] border border-[#D1D5DB] hover:bg-[#F9FAFB] rounded-md py-2.5 text-[0.82rem] font-medium cursor-pointer transition-colors">
              <MapIcon className="w-4 h-4" />
              View on Map
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .disc-detail-panel { width: 100% !important; }
        }
      `}</style>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   MAIN DISCOVERY PAGE
   ═══════════════════════════════════════════════ */
export default function DiscoveryPage() {
  const [showFilters, setShowFilters] = useState(false)
  const [detailProperty, setDetailProperty] = useState<Property | null>(null)
  const [activePin, setActivePin] = useState<number | null>(null)
  const [searchValue, setSearchValue] = useState('Dallas, TX')

  function handleViewDetails(p: Property) {
    setDetailProperty(p)
    setActivePin(p.id)
  }

  function handlePinClick(id: number) {
    setActivePin(id === activePin ? null : id)
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#FAFAFA]">
      {/* Search bar + filters */}
      <div className="px-6 pt-5 pb-0 flex-shrink-0">
        <div className="flex items-center gap-3 mb-3">
          {/* Search */}
          <div className="relative flex-1 max-w-[420px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchValue}
              onChange={e => setSearchValue(e.target.value)}
              placeholder="Search city, county, or zip code..."
              className="w-full bg-white border border-[#E5E7EB] rounded-lg pl-10 pr-4 py-2.5 text-[0.84rem] text-[#374151] placeholder-gray-400 outline-none focus:border-[#4F46E5] transition-colors"
            />
          </div>
          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-[0.82rem] font-medium border cursor-pointer transition-colors ${
              showFilters
                ? 'bg-[#EEF2FF] border-[#C7D2FE] text-[#4F46E5]'
                : 'bg-white border-[#D1D5DB] text-[#374151] hover:bg-[#F9FAFB]'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
          </button>
          {/* Search count badge */}
          <div className="flex items-center gap-1.5 text-[0.78rem] text-gray-500 ml-auto">
            <span className="text-[0.82rem] font-medium text-[#374151]">2,847</span>
            properties in <span className="font-medium text-[#374151]">Dallas, TX</span>
          </div>
          {/* Free tier indicator */}
          <div className="flex items-center gap-1.5 text-sm text-[#9CA3AF] border border-[#E5E7EB] rounded-full px-3 py-1">
            <Eye className="w-3 h-3" />
            <span>72 / 100 free searches remaining</span>
          </div>
        </div>

        {/* Filter panel */}
        {showFilters && <FilterPanel onClose={() => setShowFilters(false)} />}
      </div>

      {/* Split screen: Map + List */}
      <div className="flex-1 flex gap-0 px-6 pb-5 pt-3 min-h-0 disc-split">
        {/* Map */}
        <div className="w-[55%] pr-3 disc-map-col">
          <DiscoveryMap properties={properties} onPinClick={handlePinClick} activeId={activePin} />
        </div>

        {/* Property list */}
        <div className="w-[45%] overflow-y-auto disc-list-col">
          <div className="space-y-2">
            {properties.map(p => (
              <div
                key={p.id}
                className={`bg-white border rounded-lg px-4 py-3.5 cursor-pointer transition-all ${
                  activePin === p.id ? 'border-[#4F46E5] ring-1 ring-[#EEF2FF]' : 'border-[#E5E7EB] hover:bg-[#F9FAFB]'
                }`}
                onClick={() => setActivePin(p.id === activePin ? null : p.id)}
              >
                <div className="flex items-start gap-3">
                  {/* Left content */}
                  <div className="flex-1 min-w-0">
                    {/* Address + type */}
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-[0.86rem] font-medium text-[#111827] truncate">{p.address}</h3>
                      <span className={`flex items-center gap-1 text-[0.66rem] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 ${typeBadgeColor(p.type)}`}>
                        {typeIcon(p.type)}
                        {p.type}
                      </span>
                    </div>
                    <div className="text-[0.74rem] text-gray-400 mb-2 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {p.city}, TX {p.zip}
                    </div>

                    {/* Property specs */}
                    {p.beds > 0 ? (
                      <div className="flex items-center gap-3 text-[0.76rem] text-gray-500 mb-2.5">
                        <span className="flex items-center gap-1"><BedDouble className="w-3 h-3 text-gray-400" />{p.beds} bd</span>
                        <span className="flex items-center gap-1"><Bath className="w-3 h-3 text-gray-400" />{p.baths} ba</span>
                        <span className="flex items-center gap-1"><Ruler className="w-3 h-3 text-gray-400" />{p.sqft.toLocaleString()} sqft</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 text-[0.76rem] text-gray-500 mb-2.5">
                        <span className="flex items-center gap-1"><LandPlot className="w-3 h-3 text-gray-400" />{p.lotSize}</span>
                      </div>
                    )}

                    {/* Value + Equity row */}
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="text-[0.64rem] text-[#9CA3AF] uppercase tracking-[0.05em]">Value</div>
                        <div className="text-[0.86rem] font-semibold text-[#111827]">
                          ${p.value.toLocaleString()}
                        </div>
                      </div>
                      <div className="flex-1 max-w-[120px]">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[0.64rem] text-[#9CA3AF] uppercase tracking-[0.05em]">Equity</span>
                          <span className={`text-[0.72rem] font-semibold ${equityTextColor(p.equity)}`}>{p.equity}%</span>
                        </div>
                        <div className="w-full h-[5px] bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${equityColor(p.equity)}`} style={{ width: `${p.equity}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right side: owner + actions */}
                  <div className="flex flex-col items-end gap-2 flex-shrink-0 ml-2">
                    {/* Owner */}
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-[0.76rem] text-[#6B7280]">
                        <UserCircle className="w-3.5 h-3.5 text-gray-400" />
                        {p.owner}
                      </div>
                      <span className={`text-[0.64rem] font-medium px-1.5 py-0.5 rounded-full ${ownerTypeBadge(p.ownerType)}`}>
                        {p.ownerType}
                      </span>
                    </div>
                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5 mt-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleViewDetails(p) }}
                        className="text-[0.72rem] text-[#4F46E5] hover:text-[#4338CA] bg-[#EEF2FF] hover:bg-[#E0E7FF] border-0 rounded-md px-2.5 py-1.5 cursor-pointer transition-colors font-medium"
                      >
                        View Details
                      </button>
                      <button
                        onClick={e => e.stopPropagation()}
                        className="text-[0.72rem] text-[#6B7280] hover:text-[#374151] bg-[#F3F4F6] hover:bg-[#F9FAFB] border border-[#E5E7EB] rounded-md px-2.5 py-1.5 cursor-pointer transition-colors font-medium flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        CRM
                      </button>
                    </div>
                  </div>
                </div>

                {/* Status flags inline */}
                {(p.absentee || p.taxDelinquent || p.preForeclosure || p.probate) && (
                  <div className="flex gap-1 mt-2 pt-2 border-t border-[#E5E7EB]">
                    {p.absentee && <span className="text-[0.62rem] font-medium px-1.5 py-0.5 rounded-full text-amber-600 bg-amber-50/60">Absentee</span>}
                    {p.taxDelinquent && <span className="text-[0.62rem] font-medium px-1.5 py-0.5 rounded-full text-red-600 bg-red-50/60">Tax Delinquent</span>}
                    {p.preForeclosure && <span className="text-[0.62rem] font-medium px-1.5 py-0.5 rounded-full text-amber-600 bg-amber-50/60">Pre-Foreclosure</span>}
                    {p.probate && <span className="text-[0.62rem] font-medium px-1.5 py-0.5 rounded-full text-violet-600 bg-violet-50/60">Probate</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detail panel */}
      {detailProperty && (
        <PropertyDetail property={detailProperty} onClose={() => setDetailProperty(null)} />
      )}

      <style>{`
        @media (max-width: 1000px) {
          .disc-split { flex-direction: column !important; }
          .disc-map-col { width: 100% !important; padding-right: 0 !important; height: 300px; margin-bottom: 12px; flex-shrink: 0; }
          .disc-list-col { width: 100% !important; }
        }
        @media (max-width: 900px) {
          .disc-filter-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
