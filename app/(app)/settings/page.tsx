'use client'

import { useState, useCallback, useRef } from 'react'
import {
  User,
  CreditCard,
  Users,
  Bell,
  Puzzle,
  Bot,
  Shield,
  Camera,
  X,
  Plus,
  Download,
  Upload,
  ExternalLink,
  Check,
  Play,
  Lock,
  AlertTriangle,
  Trash2,
  Search,
  Phone,
  Loader2,
} from 'lucide-react'

/* ── Section nav ── */
const sections = [
  { key: 'profile', label: 'Profile', icon: User },
  { key: 'billing', label: 'Billing & Plan', icon: CreditCard },
  { key: 'team', label: 'Team', icon: Users },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'integrations', label: 'Integrations', icon: Puzzle },
  { key: 'ai', label: 'AI Settings', icon: Bot },
  { key: 'privacy', label: 'Data & Privacy', icon: Shield },
] as const

type SectionKey = (typeof sections)[number]['key']

/* ── Mock data ── */
const mockProfile = {
  firstName: 'Jason',
  lastName: 'Rivera',
  company: 'RiverPoint Capital',
  email: 'jason@riverpointcapital.com',
  phone: '(214) 555-0187',
  timezone: 'America/Chicago',
  markets: ['Dallas', 'Phoenix'],
  companyType: 'Solo Wholesaler',
  yearsInBusiness: '4',
  dealsPerMonth: '3-5',
  website: 'https://riverpointcapital.com',
}

const plans = [
  {
    name: 'Starter',
    price: '$199',
    period: '/mo',
    limits: {
      markets: '1',
      aiCalls: '500',
      deals: '5',
      buyers: '500',
      contracts: 'Top 5 states',
      team: '1',
      dealFee: '$250',
    },
    current: false,
    action: 'Downgrade',
  },
  {
    name: 'Pro',
    price: '$349',
    period: '/mo',
    limits: {
      markets: '3',
      aiCalls: '2,000',
      deals: '20',
      buyers: '5,000',
      contracts: 'All 50 states',
      team: '3',
      dealFee: '$200',
    },
    current: true,
    action: 'Current Plan',
  },
  {
    name: 'Enterprise',
    price: '$499',
    period: '+/mo',
    limits: {
      markets: 'Unlimited',
      aiCalls: 'Unlimited',
      deals: 'Unlimited',
      buyers: 'Unlimited',
      contracts: 'All 50 + custom',
      team: 'Unlimited',
      dealFee: 'Negotiated',
    },
    current: false,
    action: 'Contact Sales',
  },
]

const usageStats = [
  { label: 'AI Calls', used: 1243, total: 2000 },
  { label: 'Active Deals', used: 12, total: 20 },
  { label: 'Buyer Database', used: 847, total: 5000 },
  { label: 'Markets', used: 2, total: 3 },
]

const billingHistory = [
  { date: 'Mar 1, 2026', desc: 'Pro Plan - Monthly', amount: '$349.00', status: 'Paid' },
  { date: 'Feb 22, 2026', desc: 'Transaction Fee - 2201 Elm Ave', amount: '$200.00', status: 'Paid' },
  { date: 'Feb 1, 2026', desc: 'Pro Plan - Monthly', amount: '$349.00', status: 'Paid' },
  { date: 'Jan 1, 2026', desc: 'Pro Plan - Monthly', amount: '$349.00', status: 'Paid' },
  { date: 'Dec 15, 2025', desc: 'Transaction Fee - 940 Birch Dr', amount: '$200.00', status: 'Paid' },
]

const teamMembers = [
  { name: 'Jason Rivera', email: 'jason@riverpointcapital.com', role: 'Admin', status: 'Active', date: 'Sep 12, 2025' },
  { name: 'Maria Chen', email: 'maria@riverpointcapital.com', role: 'Manager', status: 'Active', date: 'Nov 3, 2025' },
  { name: 'Tyler Brooks', email: 'tyler@riverpointcapital.com', role: 'Member', status: 'Invited', date: 'Mar 8, 2026' },
]

const notificationCategories = [
  {
    category: 'Deal Alerts',
    items: [
      { label: 'New offer received', on: true, sms: true },
      { label: 'Contract deadline approaching', on: true, sms: true },
      { label: 'Deal score updated', on: false, sms: false },
      { label: 'Deal matched to buyer', on: true, sms: false },
    ],
  },
  {
    category: 'Campaign Alerts',
    items: [
      { label: 'Campaign completed', on: true, sms: false },
      { label: 'Daily campaign summary', on: true, sms: false },
      { label: 'Buyer qualified via AI call', on: false, sms: false },
      { label: 'DNC request received', on: true, sms: false },
    ],
  },
  {
    category: 'Marketplace Alerts',
    items: [
      { label: 'New deal matching your criteria', on: true, sms: false },
      { label: 'Buyer board post in your market', on: false, sms: false },
      { label: 'Someone expressed interest in your listing', on: true, sms: false },
    ],
  },
  {
    category: 'Community Alerts',
    items: [
      { label: 'Reply to your post', on: true, sms: false },
      { label: 'New post in your groups', on: false, sms: false },
      { label: 'Direct message received', on: true, sms: false },
      { label: 'Platform announcement', on: true, sms: false },
    ],
  },
]

const integrationsData = {
  connected: [
    { name: 'Twilio', desc: 'SMS and voice communication', color: 'bg-red-500', letter: 'T' },
    { name: 'DocuSign', desc: 'E-signatures for contracts', color: 'bg-yellow-500', letter: 'D' },
    { name: 'ATTOM Data', desc: 'Property records and data', color: 'bg-blue-600', letter: 'A' },
  ],
  available: [
    { name: 'Google Calendar', desc: 'Sync closing dates', color: 'bg-blue-500', letter: 'G' },
    { name: 'Zapier', desc: 'Connect to 5,000+ apps', color: 'bg-orange-500', letter: 'Z' },
    { name: 'QuickBooks', desc: 'Track assignment fee income', color: 'bg-green-600', letter: 'Q' },
    { name: 'Podio', desc: 'Import existing CRM data', color: 'bg-purple-600', letter: 'P' },
    { name: 'Google Sheets', desc: 'Export reports', color: 'bg-green-500', letter: 'G' },
    { name: 'Slack', desc: 'Get deal alerts in your channel', color: 'bg-purple-500', letter: 'S' },
  ],
  comingSoon: [
    { name: 'Mailchimp', color: 'bg-yellow-600', letter: 'M' },
    { name: 'HubSpot', color: 'bg-orange-600', letter: 'H' },
    { name: 'Salesforce', color: 'bg-blue-500', letter: 'S' },
    { name: 'Privy', color: 'bg-teal-500', letter: 'P' },
  ],
}

const voiceOptions = [
  { name: 'Sarah', desc: 'Professional Female' },
  { name: 'James', desc: 'Professional Male' },
  { name: 'Maria', desc: 'Warm Female' },
  { name: 'David', desc: 'Casual Male' },
  { name: 'Custom', desc: 'Upload your own' },
]

const aiScript = `1. Introduce company: "Hi, this is [name] from RiverPoint Capital."
2. Confirm buyer is still active: "Are you still actively looking for investment properties?"
3. Ask property type preference: "What types of properties interest you most?"
4. Ask price range: "What price range are you typically looking at?"
5. Ask target markets/zip codes: "Which areas or zip codes are you focused on?"
6. Ask flip or rental strategy: "Are you looking to flip or hold for rental income?"
7. Ask closing speed: "How quickly can you typically close on a property?"
8. Ask funding source: "Do you use cash, hard money, or conventional financing?"
9. Thank and end call: "Thanks for your time, we'll send over anything that matches."`

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SectionKey>('profile')
  const [profile, setProfile] = useState(mockProfile)
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('Member')
  const [notifications, setNotifications] = useState(notificationCategories)
  const [selectedVoice, setSelectedVoice] = useState('Sarah')
  const [callDuration, setCallDuration] = useState(120)
  const [retryAttempts, setRetryAttempts] = useState('2')
  const [callStart, setCallStart] = useState('9:00 AM')
  const [callEnd, setCallEnd] = useState('6:00 PM')
  const [callDays, setCallDays] = useState({ Mon: true, Tue: true, Wed: true, Thu: true, Fri: true, Sat: false, Sun: false })
  const [dataRetention, setDataRetention] = useState('1 year')
  const [saved, setSaved] = useState(false)

  // DNC management state
  const [dncOpen, setDncOpen] = useState(false)
  const [dncEntries, setDncEntries] = useState<any[]>([])
  const [dncTotal, setDncTotal] = useState(0)
  const [dncLoading, setDncLoading] = useState(false)
  const [dncSearch, setDncSearch] = useState('')
  const [dncOffset, setDncOffset] = useState(0)
  const [addPhoneInput, setAddPhoneInput] = useState('')
  const [addPhoneReason, setAddPhoneReason] = useState('')
  const [addingPhone, setAddingPhone] = useState(false)
  const [dncMessage, setDncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchDNCList = useCallback(async (search?: string, offset?: number) => {
    setDncLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('limit', '50')
      params.set('offset', String(offset ?? 0))
      if (search) params.set('search', search)
      const res = await fetch(`/api/outreach/dnc?${params}`)
      if (res.ok) {
        const data = await res.json()
        setDncEntries(data.entries || [])
        setDncTotal(data.total || 0)
      }
    } catch {
      /* ignore */
    } finally {
      setDncLoading(false)
    }
  }, [])

  const openDNCList = () => {
    setDncOpen(true)
    setDncOffset(0)
    setDncSearch('')
    fetchDNCList()
  }

  const addPhoneToDNC = async () => {
    if (!addPhoneInput.trim()) return
    setAddingPhone(true)
    setDncMessage(null)
    try {
      const res = await fetch('/api/outreach/dnc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: addPhoneInput, reason: addPhoneReason || 'Manually added' }),
      })
      const data = await res.json()
      if (res.ok) {
        setDncMessage({ type: 'success', text: data.message })
        setAddPhoneInput('')
        setAddPhoneReason('')
        fetchDNCList(dncSearch, dncOffset)
      } else {
        setDncMessage({ type: 'error', text: data.error || 'Failed to add number' })
      }
    } catch {
      setDncMessage({ type: 'error', text: 'Network error' })
    } finally {
      setAddingPhone(false)
    }
  }

  const removeFromDNC = async (phone: string) => {
    try {
      const res = await fetch(`/api/outreach/dnc/${encodeURIComponent(phone)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true }),
      })
      if (res.ok) {
        setDncMessage({ type: 'success', text: 'Number removed from DNC list' })
        setConfirmRemove(null)
        fetchDNCList(dncSearch, dncOffset)
      } else {
        const data = await res.json()
        setDncMessage({ type: 'error', text: data.error || 'Failed to remove' })
      }
    } catch {
      setDncMessage({ type: 'error', text: 'Network error' })
    }
  }

  const handleDNCFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setDncMessage(null)
    try {
      const text = await file.text()
      const phones = text.split(/[\n\r,]+/).map(l => l.trim()).filter(Boolean)
      if (phones.length === 0) {
        setDncMessage({ type: 'error', text: 'No valid phone numbers found in file' })
        return
      }
      if (phones.length > 10000) {
        setDncMessage({ type: 'error', text: 'Maximum 10,000 numbers per import' })
        return
      }
      setDncLoading(true)
      const res = await fetch('/api/outreach/dnc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phones }),
      })
      const data = await res.json()
      if (res.ok) {
        setDncMessage({ type: 'success', text: data.message })
        fetchDNCList(dncSearch, dncOffset)
      } else {
        setDncMessage({ type: 'error', text: data.error || 'Import failed' })
      }
    } catch {
      setDncMessage({ type: 'error', text: 'Failed to read file' })
    } finally {
      setDncLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const formatPhoneDisplay = (phone: string) => {
    if (phone.length === 10) return `(${phone.slice(0,3)}) ${phone.slice(3,6)}-${phone.slice(6)}`
    return phone
  }

  const showSaved = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const toggleNotification = (catIdx: number, itemIdx: number) => {
    setNotifications(prev => {
      const next = [...prev]
      next[catIdx] = { ...next[catIdx], items: [...next[catIdx].items] }
      next[catIdx].items[itemIdx] = { ...next[catIdx].items[itemIdx], on: !next[catIdx].items[itemIdx].on }
      return next
    })
  }

  const getUsageColor = (used: number, total: number) => {
    const pct = (used / total) * 100
    if (pct >= 90) return 'bg-red-500'
    if (pct >= 70) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  return (
    <div className="flex h-[calc(100vh-0px)] overflow-hidden bg-[var(--cream,#FAF9F6)]">
      {/* ── Settings side nav ── */}
      <div className="w-[220px] bg-white border-r border-gray-200 flex flex-col py-6 flex-shrink-0">
        <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif" }} className="px-5 text-[1.5rem] font-normal text-[var(--navy-heading,#0B1224)] mb-5">
          Settings
        </h2>
        <nav className="flex-1 px-3 space-y-0.5">
          {sections.map(s => {
            const Icon = s.icon
            const isActive = activeSection === s.key
            return (
              <button
                key={s.key}
                onClick={() => setActiveSection(s.key)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                  isActive
                    ? 'bg-[#EFF6FF] text-[#2563EB] font-medium'
                    : 'text-[#6B7280] hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#2563EB]' : 'text-gray-400'}`} />
                {s.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* ── Content area ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-8 py-8">
          {/* ════════════ PROFILE ════════════ */}
          {activeSection === 'profile' && (
            <div>
              <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif" }} className="text-[1.5rem] font-normal text-[var(--navy-heading,#0B1224)] mb-1">Profile</h2>
              <p className="text-sm text-[#9CA3AF] mb-6">Manage your personal and business information.</p>

              {/* Avatar */}
              <div className="flex items-center gap-5 mb-8">
                <div className="relative group">
                  <div className="w-20 h-20 rounded-full bg-[#F3F4F6] flex items-center justify-center">
                    <span className="text-2xl font-semibold text-[#6B7280]">JR</span>
                  </div>
                  <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <Camera className="w-5 h-5 text-white" />
                    <span className="text-[10px] text-white ml-1">Change</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{profile.firstName} {profile.lastName}</p>
                  <p className="text-xs text-gray-500">{profile.company}</p>
                </div>
              </div>

              {/* Personal info */}
              <div className="bg-white rounded-lg border border-[#E5E7EB] p-6 mb-6">
                <h3 className="text-xs font-medium text-[#6B7280] uppercase tracking-[0.05em] mb-4">Personal Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">First Name</label>
                    <input
                      value={profile.firstName}
                      onChange={e => setProfile(p => ({ ...p, firstName: e.target.value }))}
                      className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-sm text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Last Name</label>
                    <input
                      value={profile.lastName}
                      onChange={e => setProfile(p => ({ ...p, lastName: e.target.value }))}
                      className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-sm text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Company Name</label>
                    <input
                      value={profile.company}
                      onChange={e => setProfile(p => ({ ...p, company: e.target.value }))}
                      className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-sm text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Email</label>
                    <input
                      value={profile.email}
                      onChange={e => setProfile(p => ({ ...p, email: e.target.value }))}
                      className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-sm text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Phone Number</label>
                    <input
                      value={profile.phone}
                      onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
                      className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-sm text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Time Zone</label>
                    <select
                      value={profile.timezone}
                      onChange={e => setProfile(p => ({ ...p, timezone: e.target.value }))}
                      className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-sm text-[#374151] bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB]"
                    >
                      <option value="America/New_York">Eastern (ET)</option>
                      <option value="America/Chicago">Central (CT)</option>
                      <option value="America/Denver">Mountain (MT)</option>
                      <option value="America/Los_Angeles">Pacific (PT)</option>
                      <option value="America/Phoenix">Arizona (AZ)</option>
                    </select>
                  </div>
                </div>
                {/* Markets */}
                <div className="mt-4">
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Markets Active In</label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {profile.markets.map((m, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#EFF6FF] text-[#2563EB] text-xs font-medium border border-blue-100">
                        {m}
                        <button
                          onClick={() => setProfile(p => ({ ...p, markets: p.markets.filter((_, idx) => idx !== i) }))}
                          className="hover:text-[#1E40AF]"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    <button className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-dashed border-gray-300 text-gray-500 text-xs hover:border-[#2563EB] hover:text-[#2563EB] transition-colors">
                      <Plus className="w-3 h-3" />
                      Add Market
                    </button>
                  </div>
                </div>
              </div>

              {/* Business details */}
              <div className="bg-white rounded-lg border border-[#E5E7EB] p-6 mb-6">
                <h3 className="text-xs font-medium text-[#6B7280] uppercase tracking-[0.05em] mb-4">Business Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Company Type</label>
                    <select
                      value={profile.companyType}
                      onChange={e => setProfile(p => ({ ...p, companyType: e.target.value }))}
                      className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-sm text-[#374151] bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB]"
                    >
                      <option>Solo Wholesaler</option>
                      <option>Small Team</option>
                      <option>Large Operation</option>
                      <option>Coaching Program</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Years in Business</label>
                    <input
                      value={profile.yearsInBusiness}
                      onChange={e => setProfile(p => ({ ...p, yearsInBusiness: e.target.value }))}
                      className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-sm text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Average Deals per Month</label>
                    <input
                      value={profile.dealsPerMonth}
                      onChange={e => setProfile(p => ({ ...p, dealsPerMonth: e.target.value }))}
                      className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-sm text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Website URL</label>
                    <input
                      value={profile.website}
                      onChange={e => setProfile(p => ({ ...p, website: e.target.value }))}
                      className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-sm text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB]"
                    />
                  </div>
                </div>
              </div>

              <button onClick={showSaved} className="px-5 py-2.5 bg-[#2563EB] text-white text-sm font-medium rounded-md hover:bg-[#1D4ED8] transition-colors">
                {saved ? '✓ Saved' : 'Save Changes'}
              </button>
            </div>
          )}

          {/* ════════════ BILLING & PLAN ════════════ */}
          {activeSection === 'billing' && (
            <div>
              <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif" }} className="text-[1.5rem] font-normal text-[var(--navy-heading,#0B1224)] mb-1">Billing & Plan</h2>
              <p className="text-sm text-[#9CA3AF] mb-6">Manage your subscription, payment methods, and view invoices.</p>

              {/* Current plan card */}
              <div className="bg-white rounded-lg border border-[#E5E7EB] p-6 mb-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold text-[#111827]">Pro Plan - $349/month</h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">Active</span>
                    </div>
                    <p className="text-sm text-gray-500 mb-1">Next billing date: <span className="font-medium text-gray-700">April 1, 2026</span></p>
                    <p className="text-sm text-gray-500">Payment method: <span className="font-medium text-gray-700">Visa ending in 4821</span></p>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-4 py-2 bg-white border border-[#D1D5DB] rounded-md text-sm text-[#374151] hover:bg-gray-50 transition-colors">Change Plan</button>
                    <button className="px-4 py-2 bg-white border border-[#D1D5DB] rounded-md text-sm text-[#374151] hover:bg-gray-50 transition-colors">Update Payment Method</button>
                  </div>
                </div>
              </div>

              {/* Plan comparison */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                {plans.map((plan, i) => (
                  <div
                    key={i}
                    className={`bg-white rounded-lg border-2 p-5 relative ${
                      plan.current ? 'border-[#2563EB]' : 'border-[#E5E7EB]'
                    }`}
                  >
                    {plan.current && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-bold bg-[#2563EB] text-white">
                        Current Plan
                      </span>
                    )}
                    <h4 className="text-lg font-semibold text-[#111827] mb-1">{plan.name}</h4>
                    <p className="mb-4">
                      <span className="text-[1.5rem] font-normal text-[var(--navy-heading,#0B1224)]">{plan.price}</span>
                      <span className="text-sm text-gray-500">{plan.period}</span>
                    </p>
                    <div className="space-y-2 text-sm mb-5">
                      {[
                        ['Markets Active', plan.limits.markets],
                        ['AI Calls / mo', plan.limits.aiCalls],
                        ['Active Deals', plan.limits.deals],
                        ['Buyer Database', plan.limits.buyers],
                        ['Contract Templates', plan.limits.contracts],
                        ['Team Users', plan.limits.team],
                        ['Per-Deal Fee', plan.limits.dealFee],
                      ].map(([label, val], j) => (
                        <div key={j} className="flex justify-between">
                          <span className="text-gray-500">{label}</span>
                          <span className="font-medium text-gray-800">{val}</span>
                        </div>
                      ))}
                    </div>
                    {plan.current ? (
                      <button className="w-full py-2 rounded-lg bg-gray-100 text-gray-500 text-sm font-medium cursor-default">Current Plan</button>
                    ) : plan.name === 'Enterprise' ? (
                      <button className="w-full py-2 rounded-md bg-[#2563EB] text-white text-sm font-medium hover:bg-[#1D4ED8] transition-colors">Contact Sales</button>
                    ) : (
                      <button className="w-full py-2 rounded-md bg-white border border-[#D1D5DB] text-[#374151] text-sm font-medium hover:bg-gray-50 transition-colors">Downgrade</button>
                    )}
                  </div>
                ))}
              </div>

              {/* Usage this month */}
              <div className="bg-white rounded-lg border border-[#E5E7EB] p-6 mb-6">
                <h3 className="text-xs font-medium text-[#6B7280] uppercase tracking-[0.05em] mb-4">Usage This Month</h3>
                <div className="grid grid-cols-4 gap-6">
                  {usageStats.map((stat, i) => {
                    const pct = Math.round((stat.used / stat.total) * 100)
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs text-gray-600">{stat.label}</span>
                          <span className="text-xs font-medium text-gray-800">{stat.used.toLocaleString()} / {stat.total.toLocaleString()}</span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${getUsageColor(stat.used, stat.total)}`} style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1">{pct}% used</p>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Billing history */}
              <div className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h3 className="text-xs font-medium text-[#6B7280] uppercase tracking-[0.05em]">Billing History</h3>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left">
                      <th className="px-6 py-3 text-xs font-medium text-gray-500">Date</th>
                      <th className="px-6 py-3 text-xs font-medium text-gray-500">Description</th>
                      <th className="px-6 py-3 text-xs font-medium text-gray-500">Amount</th>
                      <th className="px-6 py-3 text-xs font-medium text-gray-500">Status</th>
                      <th className="px-6 py-3 text-xs font-medium text-gray-500"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {billingHistory.map((row, i) => (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-6 py-3 text-gray-700">{row.date}</td>
                        <td className="px-6 py-3 text-gray-700">{row.desc}</td>
                        <td className="px-6 py-3 font-medium text-gray-900">{row.amount}</td>
                        <td className="px-6 py-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">{row.status}</span>
                        </td>
                        <td className="px-6 py-3">
                          <button className="text-xs text-[#2563EB] hover:text-[#1D4ED8] flex items-center gap-1">
                            <Download className="w-3 h-3" />
                            Invoice
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ════════════ TEAM ════════════ */}
          {activeSection === 'team' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif" }} className="text-[1.5rem] font-normal text-[var(--navy-heading,#0B1224)] mb-1">Team</h2>
                  <p className="text-sm text-[#9CA3AF]">Manage team members and permissions.</p>
                </div>
                <button
                  onClick={() => setShowInviteForm(!showInviteForm)}
                  className="flex items-center gap-2 px-4 py-2 bg-[#2563EB] text-white text-sm font-medium rounded-md hover:bg-[#1D4ED8] transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Invite Team Member
                </button>
              </div>

              {/* Invite form */}
              {showInviteForm && (
                <div className="bg-[#EFF6FF] border border-blue-200 rounded-lg p-5 mb-6">
                  <h4 className="text-sm font-semibold text-[#1E3A8A] mb-3">Invite a new team member</h4>
                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-[#1E40AF] mb-1">Email Address</label>
                      <input
                        value={inviteEmail}
                        onChange={e => setInviteEmail(e.target.value)}
                        placeholder="colleague@company.com"
                        className="w-full px-3 py-2 rounded-md border border-blue-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                      />
                    </div>
                    <div className="w-40">
                      <label className="block text-xs font-medium text-[#1E40AF] mb-1">Role</label>
                      <select
                        value={inviteRole}
                        onChange={e => setInviteRole(e.target.value)}
                        className="w-full px-3 py-2 rounded-md border border-blue-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                      >
                        <option>Admin</option>
                        <option>Manager</option>
                        <option>Member</option>
                      </select>
                    </div>
                    <button className="px-5 py-2 bg-[#2563EB] text-white text-sm font-medium rounded-md hover:bg-[#1D4ED8] transition-colors whitespace-nowrap">
                      Send Invite
                    </button>
                    <button onClick={() => setShowInviteForm(false)} className="px-3 py-2 text-[#2563EB] hover:text-[#1D4ED8]">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Team table */}
              <div className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left">
                      <th className="px-6 py-3 text-xs font-medium text-gray-500">Name</th>
                      <th className="px-6 py-3 text-xs font-medium text-gray-500">Email</th>
                      <th className="px-6 py-3 text-xs font-medium text-gray-500">Role</th>
                      <th className="px-6 py-3 text-xs font-medium text-gray-500">Status</th>
                      <th className="px-6 py-3 text-xs font-medium text-gray-500">Date Added</th>
                      <th className="px-6 py-3 text-xs font-medium text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamMembers.map((m, i) => (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-[#F3F4F6] flex items-center justify-center">
                              <span className="text-[10px] font-medium text-[#6B7280]">{m.name.split(' ').map(n => n[0]).join('')}</span>
                            </div>
                            <span className="font-medium text-gray-900">{m.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-3 text-gray-600">{m.email}</td>
                        <td className="px-6 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            m.role === 'Admin' ? 'bg-purple-100 text-purple-700' :
                            m.role === 'Manager' ? 'bg-[#EFF6FF] text-[#2563EB]' :
                            'bg-gray-100 text-gray-700'
                          }`}>{m.role}</span>
                        </td>
                        <td className="px-6 py-3">
                          <span className={`flex items-center gap-1 text-xs ${m.status === 'Active' ? 'text-green-600' : 'text-yellow-600'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${m.status === 'Active' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                            {m.status === 'Invited' ? 'Pending' : m.status}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-gray-500">{m.date}</td>
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2">
                            <button className="text-xs text-[#2563EB] hover:text-[#1D4ED8]">Edit Role</button>
                            {m.role !== 'Admin' && (
                              <button className="text-xs text-red-500 hover:text-red-700">Remove</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-xs text-gray-500 bg-gray-100 px-4 py-2.5 rounded-lg">
                Your plan allows up to <strong>3 team members</strong>. Upgrade to Enterprise for unlimited.
              </p>
            </div>
          )}

          {/* ════════════ NOTIFICATIONS ════════════ */}
          {activeSection === 'notifications' && (
            <div>
              <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif" }} className="text-[1.5rem] font-normal text-[var(--navy-heading,#0B1224)] mb-1">Notifications</h2>
              <p className="text-sm text-[#9CA3AF] mb-6">Choose what you want to be notified about and how.</p>

              <div className="space-y-6">
                {notifications.map((cat, ci) => (
                  <div key={ci} className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
                    <div className="px-6 py-3 border-b border-gray-100 bg-gray-50">
                      <h3 className="text-xs font-medium text-[#6B7280] uppercase tracking-[0.05em]">{cat.category}</h3>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {cat.items.map((item, ii) => (
                        <div key={ii} className="flex items-center justify-between px-6 py-3.5">
                          <span className="text-sm text-gray-700">{item.label}</span>
                          <div className="flex items-center gap-6">
                            {/* In-App */}
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-gray-400 w-10 text-right">In-App</span>
                              <button
                                onClick={() => toggleNotification(ci, ii)}
                                className={`w-9 h-5 rounded-full transition-colors relative ${item.on ? 'bg-[#2563EB]' : 'bg-gray-200'}`}
                              >
                                <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-[3px] transition-all ${item.on ? 'right-[3px]' : 'left-[3px]'}`} />
                              </button>
                            </div>
                            {/* Email */}
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-gray-400 w-8 text-right">Email</span>
                              <button className={`w-9 h-5 rounded-full transition-colors relative ${item.on ? 'bg-[#2563EB]' : 'bg-gray-200'}`}>
                                <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-[3px] transition-all ${item.on ? 'right-[3px]' : 'left-[3px]'}`} />
                              </button>
                            </div>
                            {/* SMS */}
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-gray-400 w-6 text-right">SMS</span>
                              <button className={`w-9 h-5 rounded-full transition-colors relative ${item.sms ? 'bg-[#2563EB]' : 'bg-gray-200'}`}>
                                <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-[3px] transition-all ${item.sms ? 'right-[3px]' : 'left-[3px]'}`} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <button onClick={showSaved} className="mt-6 px-5 py-2.5 bg-[#2563EB] text-white text-sm font-medium rounded-md hover:bg-[#1D4ED8] transition-colors">
                {saved ? '✓ Saved' : 'Save Notification Preferences'}
              </button>
            </div>
          )}

          {/* ════════════ INTEGRATIONS ════════════ */}
          {activeSection === 'integrations' && (
            <div>
              <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif" }} className="text-[1.5rem] font-normal text-[var(--navy-heading,#0B1224)] mb-1">Integrations</h2>
              <p className="text-sm text-[#9CA3AF] mb-6">Connect your favorite tools and services.</p>

              {/* Connected */}
              <h3 className="text-xs font-medium text-[#6B7280] uppercase tracking-[0.05em] mb-3">Connected</h3>
              <div className="grid grid-cols-3 gap-4 mb-8">
                {integrationsData.connected.map((int, i) => (
                  <div key={i} className="bg-white rounded-lg border border-[#E5E7EB] p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`w-10 h-10 rounded-lg ${int.color} flex items-center justify-center`}>
                        <span className="text-white font-bold text-sm">{int.letter}</span>
                      </div>
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Connected
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-[#111827] mb-0.5">{int.name}</h4>
                    <p className="text-xs text-[#9CA3AF] mb-4">{int.desc}</p>
                    <div className="flex gap-2">
                      <button className="text-xs text-[#2563EB] hover:text-[#1D4ED8] font-medium">Manage</button>
                      <button className="text-xs text-gray-500 hover:text-red-600 font-medium">Disconnect</button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Available */}
              <h3 className="text-xs font-medium text-[#6B7280] uppercase tracking-[0.05em] mb-3">Available</h3>
              <div className="grid grid-cols-3 gap-4 mb-8">
                {integrationsData.available.map((int, i) => (
                  <div key={i} className="bg-white rounded-lg border border-[#E5E7EB] p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`w-10 h-10 rounded-lg ${int.color} flex items-center justify-center`}>
                        <span className="text-white font-bold text-sm">{int.letter}</span>
                      </div>
                    </div>
                    <h4 className="text-sm font-semibold text-[#111827] mb-0.5">{int.name}</h4>
                    <p className="text-xs text-[#9CA3AF] mb-4">{int.desc}</p>
                    <button className="px-4 py-1.5 rounded-md border border-[#2563EB] text-[#2563EB] text-xs font-medium hover:bg-[#EFF6FF] transition-colors">
                      Connect
                    </button>
                  </div>
                ))}
              </div>

              {/* Coming Soon */}
              <h3 className="text-xs font-medium text-[#6B7280] uppercase tracking-[0.05em] mb-3">Coming Soon</h3>
              <div className="grid grid-cols-4 gap-4">
                {integrationsData.comingSoon.map((int, i) => (
                  <div key={i} className="bg-white rounded-lg border border-[#E5E7EB] p-5 opacity-50">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`w-10 h-10 rounded-lg ${int.color} flex items-center justify-center`}>
                        <span className="text-white font-bold text-sm">{int.letter}</span>
                      </div>
                      <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">Coming Soon</span>
                    </div>
                    <h4 className="text-sm font-semibold text-gray-900">{int.name}</h4>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ════════════ AI SETTINGS ════════════ */}
          {activeSection === 'ai' && (
            <div>
              <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif" }} className="text-[1.5rem] font-normal text-[var(--navy-heading,#0B1224)] mb-1">AI Settings</h2>
              <p className="text-sm text-[#9CA3AF] mb-6">Configure how the AI voice agent behaves on calls.</p>

              {/* Company Identity */}
              <div className="bg-white rounded-lg border border-[#E5E7EB] p-6 mb-6">
                <h3 className="text-xs font-medium text-[#6B7280] uppercase tracking-[0.05em] mb-4">Company Identity</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Company Name for Calls</label>
                    <input
                      defaultValue="RiverPoint Capital"
                      className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-sm text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Caller ID Name</label>
                    <input
                      defaultValue="RiverPoint Capital"
                      className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-sm text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Call-back Number</label>
                    <input
                      defaultValue="(214) 555-0187"
                      className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-sm text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB]"
                    />
                  </div>
                </div>
              </div>

              {/* Voice Settings */}
              <div className="bg-white rounded-lg border border-[#E5E7EB] p-6 mb-6">
                <h3 className="text-xs font-medium text-[#6B7280] uppercase tracking-[0.05em] mb-4">Voice Settings</h3>
                <div className="grid grid-cols-5 gap-3 mb-4">
                  {voiceOptions.map((v, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedVoice(v.name)}
                      className={`p-3 rounded-lg border-2 text-center transition-all ${
                        selectedVoice === v.name
                          ? 'border-[#2563EB] bg-[#EFF6FF]'
                          : 'border-[#E5E7EB] hover:border-gray-300'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center ${
                        selectedVoice === v.name ? 'bg-[#2563EB]' : 'bg-gray-200'
                      }`}>
                        <Play className={`w-4 h-4 ${selectedVoice === v.name ? 'text-white' : 'text-gray-500'}`} />
                      </div>
                      <p className="text-xs font-semibold text-gray-900">{v.name}</p>
                      <p className="text-[10px] text-gray-500">{v.desc}</p>
                    </button>
                  ))}
                </div>
                <button className="px-4 py-2 bg-white border border-[#D1D5DB] rounded-md text-xs text-[#374151] hover:bg-gray-50 transition-colors">
                  Preview Voice
                </button>
              </div>

              {/* Call Behavior */}
              <div className="bg-white rounded-lg border border-[#E5E7EB] p-6 mb-6">
                <h3 className="text-xs font-medium text-[#6B7280] uppercase tracking-[0.05em] mb-4">Call Behavior</h3>
                <div className="space-y-5">
                  {/* Duration slider */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-medium text-gray-600">Max Call Duration</label>
                      <span className="text-xs font-semibold text-gray-800">{Math.floor(callDuration / 60)}:{(callDuration % 60).toString().padStart(2, '0')}</span>
                    </div>
                    <input
                      type="range"
                      min={30}
                      max={300}
                      step={15}
                      value={callDuration}
                      onChange={e => setCallDuration(Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#2563EB]"
                    />
                    <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                      <span>30 sec</span>
                      <span>5 min</span>
                    </div>
                  </div>

                  {/* Retry attempts & time restrictions */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Max Retry Attempts</label>
                      <select
                        value={retryAttempts}
                        onChange={e => setRetryAttempts(e.target.value)}
                        className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-sm text-[#374151] bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB]"
                      >
                        <option>1</option>
                        <option>2</option>
                        <option>3</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Calling Hours Start</label>
                      <select
                        value={callStart}
                        onChange={e => setCallStart(e.target.value)}
                        className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-sm text-[#374151] bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB]"
                      >
                        {['8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM'].map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Calling Hours End</label>
                      <select
                        value={callEnd}
                        onChange={e => setCallEnd(e.target.value)}
                        className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-sm text-[#374151] bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB]"
                      >
                        {['5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', '8:00 PM'].map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Days of week */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">Active Days</label>
                    <div className="flex gap-2">
                      {Object.entries(callDays).map(([day, active]) => (
                        <button
                          key={day}
                          onClick={() => setCallDays(d => ({ ...d, [day]: !d[day as keyof typeof d] }))}
                          className={`w-11 h-11 rounded-lg text-xs font-medium transition-all ${
                            active ? 'bg-[#2563EB] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* DNC toggle */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-gray-500" />
                      <div>
                        <span className="text-sm text-gray-700">Respect DNC List</span>
                        <p className="text-[10px] text-gray-500">Required for TCPA compliance</p>
                      </div>
                    </div>
                    <div className="w-9 h-5 rounded-full bg-[#2563EB] relative cursor-not-allowed">
                      <div className="w-3.5 h-3.5 rounded-full bg-white absolute top-[3px] right-[3px]" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Qualification Script */}
              <div className="bg-white rounded-lg border border-[#E5E7EB] p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-medium text-[#6B7280] uppercase tracking-[0.05em]">Qualification Script</h3>
                  <button className="px-3 py-1.5 bg-white border border-[#D1D5DB] rounded-md text-xs text-[#374151] hover:bg-gray-50 transition-colors">
                    Edit Script
                  </button>
                </div>
                <textarea
                  defaultValue={aiScript}
                  rows={10}
                  className="w-full px-4 py-3 rounded-md border border-[#E5E7EB] text-sm text-[#374151] font-mono leading-relaxed bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] focus:bg-white resize-none"
                />
                <p className="text-[10px] text-gray-500 mt-2">Changes to the script will apply to all future campaigns.</p>
              </div>

              <button onClick={showSaved} className="px-5 py-2.5 bg-[#2563EB] text-white text-sm font-medium rounded-md hover:bg-[#1D4ED8] transition-colors">
                {saved ? '✓ Saved' : 'Save AI Settings'}
              </button>
            </div>
          )}

          {/* ════════════ DATA & PRIVACY ════════════ */}
          {activeSection === 'privacy' && (
            <div>
              <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif" }} className="text-[1.5rem] font-normal text-[var(--navy-heading,#0B1224)] mb-1">Data & Privacy</h2>
              <p className="text-sm text-[#9CA3AF] mb-6">Manage your data, exports, and privacy settings.</p>

              {/* Export Data */}
              <div className="bg-white rounded-lg border border-[#E5E7EB] p-6 mb-6">
                <h3 className="text-xs font-medium text-[#6B7280] uppercase tracking-[0.05em] mb-4">Export Data</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    'Export Buyer CRM as CSV',
                    'Export Deal History as CSV',
                    'Export Call Transcripts',
                    'Export Contracts',
                  ].map((label, i) => (
                    <button
                      key={i}
                      className="flex items-center gap-2 px-4 py-3 rounded-md bg-white border border-[#E5E7EB] text-sm text-[#374151] hover:bg-gray-50 hover:border-gray-300 transition-colors"
                    >
                      <Download className="w-4 h-4 text-gray-400" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Data Retention */}
              <div className="bg-white rounded-lg border border-[#E5E7EB] p-6 mb-6">
                <h3 className="text-xs font-medium text-[#6B7280] uppercase tracking-[0.05em] mb-4">Data Retention</h3>
                <div className="max-w-xs">
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Keep call recordings for</label>
                  <select
                    value={dataRetention}
                    onChange={e => setDataRetention(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-sm text-[#374151] bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB]"
                  >
                    <option>30 days</option>
                    <option>90 days</option>
                    <option>1 year</option>
                    <option>Forever</option>
                  </select>
                </div>
                <p className="text-[10px] text-gray-500 mt-2">Pro plan includes up to 50GB of recording storage. Upgrade to Enterprise for unlimited storage.</p>
              </div>

              {/* DNC Management */}
              <div className="bg-white rounded-lg border border-[#E5E7EB] p-6 mb-6">
                <h3 className="text-xs font-medium text-[#6B7280] uppercase tracking-[0.05em] mb-4">Do Not Call Management</h3>
                <div className="flex items-center gap-3 mb-3">
                  <button
                    onClick={openDNCList}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-[#D1D5DB] rounded-md text-sm text-[#374151] hover:bg-gray-50 transition-colors"
                  >
                    <Shield className="w-4 h-4 text-gray-400" />
                    View DNC List
                    {dncTotal > 0 && <span className="text-xs text-gray-400">({dncTotal} numbers)</span>}
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-[#D1D5DB] rounded-md text-sm text-[#374151] hover:bg-gray-50 transition-colors"
                  >
                    <Upload className="w-4 h-4 text-gray-400" />
                    Upload DNC List
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleDNCFileUpload}
                    className="hidden"
                  />
                </div>
                <p className="text-[10px] text-gray-500">Numbers on this list will be automatically excluded from all AI outreach campaigns.</p>

                {/* DNC Message */}
                {dncMessage && (
                  <div className={`mt-3 px-3 py-2 rounded-md text-sm ${
                    dncMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    {dncMessage.text}
                  </div>
                )}

                {/* DNC Panel */}
                {dncOpen && (
                  <div className="mt-4 border border-[#E5E7EB] rounded-lg overflow-hidden">
                    {/* Search & Add */}
                    <div className="p-4 bg-gray-50 border-b border-[#E5E7EB] space-y-3">
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="Search by phone number..."
                            value={dncSearch}
                            onChange={e => {
                              setDncSearch(e.target.value)
                              setDncOffset(0)
                              fetchDNCList(e.target.value, 0)
                            }}
                            className="w-full pl-9 pr-3 py-2 rounded-md border border-[#E5E7EB] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                          />
                        </div>
                        <button
                          onClick={() => setDncOpen(false)}
                          className="p-2 text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Phone number"
                          value={addPhoneInput}
                          onChange={e => setAddPhoneInput(e.target.value)}
                          className="flex-1 px-3 py-2 rounded-md border border-[#E5E7EB] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                        />
                        <input
                          type="text"
                          placeholder="Reason (optional)"
                          value={addPhoneReason}
                          onChange={e => setAddPhoneReason(e.target.value)}
                          className="flex-1 px-3 py-2 rounded-md border border-[#E5E7EB] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                        />
                        <button
                          onClick={addPhoneToDNC}
                          disabled={addingPhone || !addPhoneInput.trim()}
                          className="flex items-center gap-1.5 px-4 py-2 bg-[#2563EB] text-white text-sm font-medium rounded-md hover:bg-[#1D4ED8] disabled:opacity-50 transition-colors"
                        >
                          {addingPhone ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                          Add
                        </button>
                      </div>
                    </div>

                    {/* List */}
                    <div className="max-h-80 overflow-y-auto">
                      {dncLoading ? (
                        <div className="flex items-center justify-center py-8 text-gray-400 text-sm">
                          <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading...
                        </div>
                      ) : dncEntries.length === 0 ? (
                        <div className="flex items-center justify-center py-8 text-gray-400 text-sm">
                          No numbers on the DNC list
                        </div>
                      ) : (
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-[#E5E7EB] bg-gray-50">
                              <th className="text-left px-4 py-2 font-medium text-gray-600 text-xs">Phone</th>
                              <th className="text-left px-4 py-2 font-medium text-gray-600 text-xs">Buyer</th>
                              <th className="text-left px-4 py-2 font-medium text-gray-600 text-xs">Reason</th>
                              <th className="text-left px-4 py-2 font-medium text-gray-600 text-xs">Date</th>
                              <th className="text-right px-4 py-2 font-medium text-gray-600 text-xs"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {dncEntries.map((entry: any) => (
                              <tr key={entry.id} className="border-b border-[#F3F4F6] hover:bg-gray-50">
                                <td className="px-4 py-2.5 font-mono text-gray-800">
                                  <div className="flex items-center gap-1.5">
                                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                                    {formatPhoneDisplay(entry.phone)}
                                  </div>
                                </td>
                                <td className="px-4 py-2.5 text-gray-600">{entry.buyerName || '—'}</td>
                                <td className="px-4 py-2.5 text-gray-500 text-xs">{entry.reason || '—'}</td>
                                <td className="px-4 py-2.5 text-gray-500 text-xs">
                                  {new Date(entry.createdAt).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-2.5 text-right">
                                  {confirmRemove === entry.phone ? (
                                    <div className="flex items-center gap-1 justify-end">
                                      <span className="text-xs text-red-600 mr-1">Remove?</span>
                                      <button
                                        onClick={() => removeFromDNC(entry.phone)}
                                        className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                                      >
                                        Yes
                                      </button>
                                      <button
                                        onClick={() => setConfirmRemove(null)}
                                        className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                                      >
                                        No
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => setConfirmRemove(entry.phone)}
                                      className="text-xs text-red-500 hover:text-red-700"
                                    >
                                      Remove
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>

                    {/* Pagination */}
                    {dncTotal > 50 && (
                      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-t border-[#E5E7EB]">
                        <span className="text-xs text-gray-500">
                          Showing {dncOffset + 1}–{Math.min(dncOffset + 50, dncTotal)} of {dncTotal}
                        </span>
                        <div className="flex gap-2">
                          <button
                            disabled={dncOffset === 0}
                            onClick={() => { const n = Math.max(0, dncOffset - 50); setDncOffset(n); fetchDNCList(dncSearch, n) }}
                            className="px-3 py-1 text-xs border border-[#D1D5DB] rounded hover:bg-gray-100 disabled:opacity-50"
                          >
                            Previous
                          </button>
                          <button
                            disabled={dncOffset + 50 >= dncTotal}
                            onClick={() => { const n = dncOffset + 50; setDncOffset(n); fetchDNCList(dncSearch, n) }}
                            className="px-3 py-1 text-xs border border-[#D1D5DB] rounded hover:bg-gray-100 disabled:opacity-50"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Account Actions */}
              <div className="bg-white rounded-lg border border-[#E5E7EB] p-6 mb-6">
                <h3 className="text-xs font-medium text-[#6B7280] uppercase tracking-[0.05em] mb-4">Account Actions</h3>
                <div className="space-y-3">
                  <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-yellow-300 bg-yellow-50 text-yellow-800 text-sm font-medium hover:bg-yellow-100 transition-colors">
                    <AlertTriangle className="w-4 h-4" />
                    Deactivate Account
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-red-300 bg-red-50 text-red-700 text-sm font-medium hover:bg-red-100 transition-colors">
                    <Trash2 className="w-4 h-4" />
                    Delete Account and All Data
                  </button>
                  <p className="text-[10px] text-gray-500">
                    Account deletion is permanent and cannot be undone. All your data, buyers, deals, contracts, and call recordings will be permanently removed.
                  </p>
                </div>
              </div>

              {/* Legal Links */}
              <div className="bg-white rounded-lg border border-[#E5E7EB] p-6">
                <h3 className="text-xs font-medium text-[#6B7280] uppercase tracking-[0.05em] mb-4">Legal</h3>
                <div className="space-y-2.5">
                  {[
                    'Terms of Service',
                    'Privacy Policy',
                    'TCPA Compliance Policy',
                    'Data Processing Agreement',
                  ].map((link, i) => (
                    <button key={i} className="flex items-center gap-2 text-sm text-[#2563EB] hover:text-[#1D4ED8] transition-colors">
                      <ExternalLink className="w-3.5 h-3.5" />
                      {link}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save toast */}
      {saved && (
        <div className="fixed bottom-6 right-6 flex items-center gap-2 px-4 py-3 bg-green-600 text-white text-sm font-medium rounded-xl shadow-lg z-50">
          <Check className="w-4 h-4" />
          Settings saved successfully
        </div>
      )}
    </div>
  )
}
