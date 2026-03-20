'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
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

/* ── Billing plan definitions ── */
const planDefs = [
  {
    key: 'starter' as const,
    name: 'Starter',
    price: '$149',
    period: '/mo',
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID,
    limits: { reveals: '50', aiMinutes: '50', sms: '100', analyses: '10', team: '1', overageReveals: '$0.40/ea', overageCalls: '$0.25/min', overageSms: '$0.05/msg' },
  },
  {
    key: 'pro' as const,
    name: 'Pro',
    price: '$299',
    period: '/mo',
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
    limits: { reveals: '200', aiMinutes: '200', sms: '500', analyses: '50', team: '3', overageReveals: '$0.30/ea', overageCalls: '$0.20/min', overageSms: '$0.04/msg' },
  },
  {
    key: 'business' as const,
    name: 'Business',
    price: '$499',
    period: '/mo',
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID,
    limits: { reveals: '500', aiMinutes: '400', sms: '1,000', analyses: 'Unlimited', team: 'Unlimited', overageReveals: '$0.25/ea', overageCalls: '$0.15/min', overageSms: '$0.03/msg' },
  },
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
    { name: 'BatchData', desc: 'Property records and data', color: 'bg-blue-600', letter: 'B' },
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

  // Billing state
  const [billingLoading, setBillingLoading] = useState(false)
  const [billingError, setBillingError] = useState(false)
  const [subscription, setSubscription] = useState<any>(null)
  const [invoices, setInvoices] = useState<any[]>([])
  const [portalLoading, setPortalLoading] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(false)

  const fetchBillingData = useCallback(async () => {
    setBillingLoading(true)
    setBillingError(false)
    try {
      const [subRes, invRes] = await Promise.all([
        fetch('/api/stripe/subscription'),
        fetch('/api/stripe/invoices'),
      ])
      if (!subRes.ok) throw new Error('subscription fetch failed')
      const subData = await subRes.json()
      setSubscription(subData)
      if (invRes.ok) {
        const invData = await invRes.json()
        setInvoices(invData.invoices || [])
      }
    } catch {
      setBillingError(true)
    } finally {
      setBillingLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeSection === 'billing') fetchBillingData()
  }, [activeSection, fetchBillingData])

  const openPortal = async () => {
    setPortalLoading(true)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch {
      /* ignore */
    } finally {
      setPortalLoading(false)
    }
  }

  const handleCheckout = async (priceId: string) => {
    setCheckoutLoading(true)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch {
      /* ignore */
    } finally {
      setCheckoutLoading(false)
    }
  }

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

  return (
    <div className="flex h-full overflow-hidden bg-[#F9FAFB]">
      {/* ── Settings side nav ── */}
      <div style={{ borderRight: '1px solid rgba(5,14,36,0.08)' }} className="w-[220px] bg-white flex flex-col py-6 flex-shrink-0">
        <h2 style={{ fontWeight: 700, fontSize: '24px', color: '#0B1224', letterSpacing: '-0.02em' }} className="px-5 mb-5">
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
                style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontSize: '14px', fontWeight: isActive ? 600 : 400, borderRadius: '10px' }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 transition-colors text-left ${
                  isActive
                    ? 'bg-[rgba(37,99,235,0.08)] text-[#2563EB]'
                    : 'text-[rgba(5,14,36,0.45)] hover:bg-gray-50 hover:text-[#0B1224]'
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
              <h2 style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 700, fontSize: '24px', color: '#0B1224', letterSpacing: '-0.02em' }} className="mb-1">Profile</h2>
              <p style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 400, fontSize: '14px', color: 'rgba(5,14,36,0.5)' }} className="mb-6">Manage your personal and business information.</p>

              {/* Avatar */}
              <div className="flex items-center gap-5 mb-8">
                <div className="relative group">
                  <div className="w-20 h-20 rounded-full bg-[#0B1224] flex items-center justify-center">
                    <span style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 600 }} className="text-2xl text-white">JR</span>
                  </div>
                  <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <Camera className="w-5 h-5 text-white" />
                    <span className="text-[10px] text-white ml-1">Change</span>
                  </div>
                </div>
                <div>
                  <p style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 600, fontSize: '15px', color: '#0B1224' }}>{profile.firstName} {profile.lastName}</p>
                  <p style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 400, fontSize: '12px', color: 'rgba(5,14,36,0.4)' }}>{profile.company}</p>
                </div>
              </div>

              {/* Personal info */}
              <div style={{ border: '1px solid rgba(5,14,36,0.08)', borderRadius: '12px', padding: '20px 24px' }} className="bg-white mb-6">
                <h3 style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 600, fontSize: '15px', color: '#0B1224' }} className="mb-4">Personal Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 400, fontSize: '14px', color: 'rgba(5,14,36,0.65)' }} className="block mb-1.5">First Name</label>
                    <input
                      value={profile.firstName}
                      onChange={e => setProfile(p => ({ ...p, firstName: e.target.value }))}
                      style={{ backgroundColor: '#ffffff', border: '1px solid rgba(5,14,36,0.15)', borderRadius: '10px', padding: '10px 14px', fontSize: '14px', fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", color: '#0B1224' }} className="w-full focus:outline-none focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.08)]"
                    />
                  </div>
                  <div>
                    <label style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 400, fontSize: '14px', color: 'rgba(5,14,36,0.65)' }} className="block mb-1.5">Last Name</label>
                    <input
                      value={profile.lastName}
                      onChange={e => setProfile(p => ({ ...p, lastName: e.target.value }))}
                      style={{ backgroundColor: '#ffffff', border: '1px solid rgba(5,14,36,0.15)', borderRadius: '10px', padding: '10px 14px', fontSize: '14px', fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", color: '#0B1224' }} className="w-full focus:outline-none focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.08)]"
                    />
                  </div>
                  <div>
                    <label style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 400, fontSize: '14px', color: 'rgba(5,14,36,0.65)' }} className="block mb-1.5">Company Name</label>
                    <input
                      value={profile.company}
                      onChange={e => setProfile(p => ({ ...p, company: e.target.value }))}
                      style={{ backgroundColor: '#ffffff', border: '1px solid rgba(5,14,36,0.15)', borderRadius: '10px', padding: '10px 14px', fontSize: '14px', fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", color: '#0B1224' }} className="w-full focus:outline-none focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.08)]"
                    />
                  </div>
                  <div>
                    <label style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 400, fontSize: '14px', color: 'rgba(5,14,36,0.65)' }} className="block mb-1.5">Email</label>
                    <input
                      value={profile.email}
                      onChange={e => setProfile(p => ({ ...p, email: e.target.value }))}
                      style={{ backgroundColor: '#ffffff', border: '1px solid rgba(5,14,36,0.15)', borderRadius: '10px', padding: '10px 14px', fontSize: '14px', fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", color: '#0B1224' }} className="w-full focus:outline-none focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.08)]"
                    />
                  </div>
                  <div>
                    <label style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 400, fontSize: '14px', color: 'rgba(5,14,36,0.65)' }} className="block mb-1.5">Phone Number</label>
                    <input
                      value={profile.phone}
                      onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
                      style={{ backgroundColor: '#ffffff', border: '1px solid rgba(5,14,36,0.15)', borderRadius: '10px', padding: '10px 14px', fontSize: '14px', fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", color: '#0B1224' }} className="w-full focus:outline-none focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.08)]"
                    />
                  </div>
                  <div>
                    <label style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 400, fontSize: '14px', color: 'rgba(5,14,36,0.65)' }} className="block mb-1.5">Time Zone</label>
                    <select
                      value={profile.timezone}
                      onChange={e => setProfile(p => ({ ...p, timezone: e.target.value }))}
                      style={{ backgroundColor: '#ffffff', border: '1px solid rgba(5,14,36,0.15)', borderRadius: '10px', padding: '10px 14px', fontSize: '14px', fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", color: '#0B1224' }} className="w-full focus:outline-none focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.08)]"
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
                  <label style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 400, fontSize: '14px', color: 'rgba(5,14,36,0.65)' }} className="block mb-1.5">Markets Active In</label>
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
              <div style={{ border: '1px solid rgba(5,14,36,0.08)', borderRadius: '12px', padding: '20px 24px' }} className="bg-white mb-6">
                <h3 style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 600, fontSize: '15px', color: '#0B1224' }} className="mb-4">Business Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 400, fontSize: '14px', color: 'rgba(5,14,36,0.65)' }} className="block mb-1.5">Company Type</label>
                    <select
                      value={profile.companyType}
                      onChange={e => setProfile(p => ({ ...p, companyType: e.target.value }))}
                      style={{ backgroundColor: '#ffffff', border: '1px solid rgba(5,14,36,0.15)', borderRadius: '10px', padding: '10px 14px', fontSize: '14px', fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", color: '#0B1224' }} className="w-full focus:outline-none focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.08)]"
                    >
                      <option>Solo Wholesaler</option>
                      <option>Small Team</option>
                      <option>Large Operation</option>
                      <option>Coaching Program</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 400, fontSize: '14px', color: 'rgba(5,14,36,0.65)' }} className="block mb-1.5">Years in Business</label>
                    <input
                      value={profile.yearsInBusiness}
                      onChange={e => setProfile(p => ({ ...p, yearsInBusiness: e.target.value }))}
                      style={{ backgroundColor: '#ffffff', border: '1px solid rgba(5,14,36,0.15)', borderRadius: '10px', padding: '10px 14px', fontSize: '14px', fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", color: '#0B1224' }} className="w-full focus:outline-none focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.08)]"
                    />
                  </div>
                  <div>
                    <label style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 400, fontSize: '14px', color: 'rgba(5,14,36,0.65)' }} className="block mb-1.5">Average Deals per Month</label>
                    <input
                      value={profile.dealsPerMonth}
                      onChange={e => setProfile(p => ({ ...p, dealsPerMonth: e.target.value }))}
                      style={{ backgroundColor: '#ffffff', border: '1px solid rgba(5,14,36,0.15)', borderRadius: '10px', padding: '10px 14px', fontSize: '14px', fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", color: '#0B1224' }} className="w-full focus:outline-none focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.08)]"
                    />
                  </div>
                  <div>
                    <label style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 400, fontSize: '14px', color: 'rgba(5,14,36,0.65)' }} className="block mb-1.5">Website URL</label>
                    <input
                      value={profile.website}
                      onChange={e => setProfile(p => ({ ...p, website: e.target.value }))}
                      style={{ backgroundColor: '#ffffff', border: '1px solid rgba(5,14,36,0.15)', borderRadius: '10px', padding: '10px 14px', fontSize: '14px', fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", color: '#0B1224' }} className="w-full focus:outline-none focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.08)]"
                    />
                  </div>
                </div>
              </div>

              <button onClick={showSaved} style={{ padding: '10px 20px', borderRadius: '10px', fontWeight: 600, fontSize: '14px', fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }} className="bg-[#2563EB] text-white hover:bg-[#1D4ED8] transition-colors">
                {saved ? '✓ Saved' : 'Save Changes'}
              </button>
            </div>
          )}

          {/* ════════════ BILLING & PLAN ════════════ */}
          {activeSection === 'billing' && (
            <div>
              <h2 style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 700, fontSize: '24px', color: '#0B1224', letterSpacing: '-0.02em' }} className="mb-1">Billing & Plan</h2>
              <p style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 400, fontSize: '14px', color: 'rgba(5,14,36,0.5)' }} className="mb-6">Manage your subscription, payment methods, and view invoices.</p>

              {billingLoading ? (
                <div className="space-y-4">
                  {[120, 200, 160, 180].map((h, i) => (
                    <div key={i} className="animate-pulse bg-[#F3F4F6] rounded-xl" style={{ height: h }} />
                  ))}
                </div>
              ) : billingError ? (
                <div style={{ border: '1px solid rgba(5,14,36,0.08)', borderRadius: '12px', padding: '40px 24px' }} className="bg-white text-center">
                  <p style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontSize: '14px', color: 'rgba(5,14,36,0.5)' }} className="mb-3">Unable to load billing information. Please try again.</p>
                  <button onClick={fetchBillingData} style={{ borderRadius: '10px', padding: '10px 20px', fontWeight: 600, fontSize: '14px', fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }} className="bg-[#2563EB] text-white hover:bg-[#1D4ED8] transition-colors">
                    Retry
                  </button>
                </div>
              ) : (
                <>
                  {/* Past due warning */}
                  {subscription?.tierStatus === 'past_due' && (
                    <div style={{ border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', padding: '16px 20px', backgroundColor: 'rgba(239,68,68,0.04)' }} className="mb-6 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                        <p style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontSize: '14px', fontWeight: 500, color: '#991B1B' }}>
                          Your last payment failed. Please update your payment method to avoid losing access.
                        </p>
                      </div>
                      <button onClick={openPortal} disabled={portalLoading} style={{ borderRadius: '10px', padding: '8px 16px', fontWeight: 600, fontSize: '13px', fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", whiteSpace: 'nowrap' }} className="bg-red-600 text-white hover:bg-red-700 transition-colors flex-shrink-0">
                        Update payment method
                      </button>
                    </div>
                  )}

                  {/* Current plan card */}
                  <div style={{ border: '1px solid rgba(5,14,36,0.08)', borderRadius: '12px', padding: '20px 24px' }} className="bg-white mb-6">
                    <div className="flex items-start justify-between flex-wrap gap-4">
                      <div>
                        <div className="flex items-center gap-2.5 mb-2">
                          <span style={{
                            backgroundColor: subscription?.tier === 'free' ? 'rgba(5,14,36,0.06)' : 'rgba(37,99,235,0.08)',
                            color: subscription?.tier === 'free' ? 'rgba(5,14,36,0.5)' : '#2563EB',
                            fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
                          }} className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                            {subscription?.tier || 'free'}
                          </span>
                          {(() => {
                            const st = subscription?.tierStatus
                            const bg = st === 'active' ? 'rgba(37,99,235,0.08)' : st === 'trialing' ? 'rgba(37,99,235,0.08)' : st === 'past_due' ? 'rgba(239,68,68,0.08)' : 'rgba(5,14,36,0.06)'
                            const fg = st === 'active' ? '#2563EB' : st === 'trialing' ? '#2563EB' : st === 'past_due' ? '#DC2626' : 'rgba(5,14,36,0.5)'
                            const label = st === 'past_due' ? 'Past Due' : st === 'trialing' ? 'Trialing' : st === 'cancelled' ? 'Cancelled' : 'Active'
                            return <span style={{ backgroundColor: bg, color: fg }} className="px-2 py-0.5 rounded-full text-[10px] font-semibold">{label}</span>
                          })()}
                        </div>
                        <h3 style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 700, fontSize: '20px', color: '#0B1224' }}>
                          {subscription?.tierName || 'Free Trial'}
                        </h3>
                        {subscription?.tier !== 'free' && (
                          <p style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 400, fontSize: '16px', color: 'rgba(5,14,36,0.45)' }}>
                            ${subscription?.tier === 'starter' ? '149' : subscription?.tier === 'pro' ? '299' : subscription?.tier === 'business' ? '499' : '499'}/mo
                          </p>
                        )}
                        {subscription?.isTrialing && (
                          <div className="mt-3">
                            <p style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontSize: '13px', color: 'rgba(5,14,36,0.5)' }} className="mb-1.5">
                              {subscription.trialDaysLeft} day{subscription.trialDaysLeft !== 1 ? 's' : ''} remaining in trial
                            </p>
                            <div className="w-48 h-1.5 bg-[rgba(5,14,36,0.06)] rounded-full overflow-hidden">
                              <div className="h-full bg-[#2563EB] rounded-full" style={{ width: `${Math.max(5, ((7 - subscription.trialDaysLeft) / 7) * 100)}%` }} />
                            </div>
                          </div>
                        )}
                        {subscription?.currentPeriodEnd && !subscription?.isTrialing && (
                          <p style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 400, fontSize: '13px', color: 'rgba(5,14,36,0.4)', marginTop: 6 }}>
                            Next billing: {new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {subscription?.tier === 'free' ? (
                          <button onClick={() => { const el = document.getElementById('plan-comparison'); el?.scrollIntoView({ behavior: 'smooth' }) }} style={{ borderRadius: '10px', padding: '10px 20px', fontWeight: 600, fontSize: '14px', fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }} className="bg-[#2563EB] text-white hover:bg-[#1D4ED8] transition-colors">
                            Upgrade now
                          </button>
                        ) : (
                          <>
                            <button onClick={openPortal} disabled={portalLoading} style={{ backgroundColor: '#ffffff', border: '1px solid rgba(5,14,36,0.15)', borderRadius: '10px', padding: '10px 20px', fontWeight: 600, fontSize: '14px', fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", color: '#0B1224' }} className="hover:bg-gray-50 transition-colors">
                              {portalLoading ? 'Loading...' : 'Manage subscription'}
                            </button>
                            <button onClick={() => { const el = document.getElementById('plan-comparison'); el?.scrollIntoView({ behavior: 'smooth' }) }} style={{ backgroundColor: '#ffffff', border: '1px solid rgba(5,14,36,0.15)', borderRadius: '10px', padding: '10px 20px', fontWeight: 600, fontSize: '14px', fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", color: '#0B1224' }} className="hover:bg-gray-50 transition-colors">
                              Change plan
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    {subscription?.tier === 'free' && subscription?.isTrialing && (
                      <p style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontSize: '13px', color: 'rgba(5,14,36,0.45)', marginTop: 12 }}>
                        Your trial expires in {subscription.trialDaysLeft} days. Upgrade to keep your data and unlock all features.
                      </p>
                    )}
                  </div>

                  {/* Usage this period */}
                  <div style={{ border: '1px solid rgba(5,14,36,0.08)', borderRadius: '12px', padding: '20px 24px' }} className="bg-white mb-6">
                    <h3 style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 600, fontSize: '15px', color: '#0B1224' }} className="mb-4">Usage This Period</h3>
                    {(() => {
                      const a = subscription?.allowance
                      if (!a) return <p style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontSize: '13px', color: 'rgba(5,14,36,0.4)' }}>No usage data yet.</p>

                      const usageRows = [
                        { label: 'Reveals', used: a.reveals.used, limit: a.reveals.limit },
                        { label: 'AI Call Minutes', used: a.callMinutes.used, limit: a.callMinutes.limit },
                        { label: 'SMS Messages', used: a.sms.used, limit: a.sms.limit },
                        { label: 'Deal Analyses', used: a.analyses.used, limit: a.analyses.limit },
                      ]

                      const totalOverage = (a.overages?.reveals || 0) + (a.overages?.callMinutes || 0) + (a.overages?.sms || 0)

                      return (
                        <div>
                          <div className="space-y-4">
                            {usageRows.map((row, i) => {
                              const isUnlimited = row.limit === -1
                              const hasLimit = row.limit != null && row.limit > 0
                              const pct = hasLimit ? Math.min(100, Math.round((row.used / row.limit) * 100)) : 0
                              const barColor = pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-[#2563EB]'

                              return (
                                <div key={i}>
                                  <div className="flex items-center justify-between mb-1">
                                    <span style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 400, fontSize: '13px', color: 'rgba(5,14,36,0.5)' }}>{row.label}</span>
                                    <span style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 600, fontSize: '13px', color: '#0B1224' }}>
                                      {row.used.toLocaleString()}
                                      {isUnlimited ? (
                                        <span style={{ fontWeight: 400, color: 'rgba(5,14,36,0.35)' }}> / Unlimited</span>
                                      ) : hasLimit ? (
                                        <span style={{ fontWeight: 400, color: 'rgba(5,14,36,0.35)' }}> / {row.limit.toLocaleString()}</span>
                                      ) : null}
                                      {hasLimit && pct >= 100 && (
                                        <span style={{ fontWeight: 500, color: '#DC2626', marginLeft: 8, fontSize: '11px' }}>OVER</span>
                                      )}
                                    </span>
                                  </div>
                                  {(hasLimit || isUnlimited) && (
                                    <div className="w-full h-1.5 bg-[rgba(5,14,36,0.06)] rounded-full overflow-hidden">
                                      <div className={`h-full rounded-full transition-all ${isUnlimited ? 'bg-[#2563EB]' : barColor}`} style={{ width: isUnlimited ? '5%' : `${pct}%` }} />
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                          {totalOverage > 0 && (
                            <div className="mt-5 pt-4" style={{ borderTop: '1px solid rgba(5,14,36,0.06)' }}>
                              <p style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 600, fontSize: '14px', color: '#0B1224' }}>
                                Overages this period
                              </p>
                              <div className="mt-2 space-y-1">
                                {a.overages.reveals > 0 && (
                                  <p style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontSize: '13px', color: 'rgba(5,14,36,0.5)' }}>
                                    {a.overages.reveals} extra reveal{a.overages.reveals !== 1 ? 's' : ''}
                                  </p>
                                )}
                                {a.overages.callMinutes > 0 && (
                                  <p style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontSize: '13px', color: 'rgba(5,14,36,0.5)' }}>
                                    {a.overages.callMinutes} extra AI minute{a.overages.callMinutes !== 1 ? 's' : ''}
                                  </p>
                                )}
                                {a.overages.sms > 0 && (
                                  <p style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontSize: '13px', color: 'rgba(5,14,36,0.5)' }}>
                                    {a.overages.sms} extra SMS
                                  </p>
                                )}
                              </div>
                              <p style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 400, fontSize: '12px', color: 'rgba(5,14,36,0.4)', marginTop: 8 }}>
                                Overages are billed at the end of each billing period.
                              </p>
                            </div>
                          )}
                        </div>
                      )
                    })()}
                  </div>

                  {/* Payment method card */}
                  <div style={{ border: '1px solid rgba(5,14,36,0.08)', borderRadius: '12px', padding: '20px 24px' }} className="bg-white mb-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 600, fontSize: '15px', color: '#0B1224' }} className="mb-1">Payment Method</h3>
                        {subscription?.tier !== 'free' ? (
                          <p style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 400, fontSize: '14px', color: 'rgba(5,14,36,0.5)' }}>
                            Manage your payment method through the Stripe portal.
                          </p>
                        ) : (
                          <p style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 400, fontSize: '14px', color: 'rgba(5,14,36,0.5)' }}>
                            No payment method on file. Subscribe to a plan to add one.
                          </p>
                        )}
                      </div>
                      {subscription?.tier !== 'free' && (
                        <button onClick={openPortal} disabled={portalLoading} style={{ backgroundColor: '#ffffff', border: '1px solid rgba(5,14,36,0.15)', borderRadius: '10px', padding: '10px 20px', fontWeight: 600, fontSize: '14px', fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", color: '#0B1224' }} className="hover:bg-gray-50 transition-colors flex-shrink-0">
                          Update payment method
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Billing history */}
                  <div style={{ border: '1px solid rgba(5,14,36,0.08)', borderRadius: '12px' }} className="bg-white overflow-hidden mb-6">
                    <div className="px-6 py-4 border-b border-gray-100">
                      <h3 style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 600, fontSize: '15px', color: '#0B1224' }}>Billing History</h3>
                    </div>
                    {invoices.length === 0 ? (
                      <div className="px-6 py-10 text-center">
                        <p style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontSize: '13px', color: 'rgba(5,14,36,0.4)' }}>
                          No invoices yet. Your first invoice will appear after your trial period.
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-100 text-left">
                              {['Date', 'Description', 'Amount', 'Status', ''].map((h, i) => (
                                <th key={i} style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 400, fontSize: '12px', color: 'rgba(5,14,36,0.4)' }} className="px-6 py-3">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {invoices.map((inv: any) => {
                              const statusBg = inv.status === 'paid' ? 'rgba(37,99,235,0.08)' : inv.status === 'failed' ? 'rgba(239,68,68,0.08)' : 'rgba(5,14,36,0.06)'
                              const statusFg = inv.status === 'paid' ? '#2563EB' : inv.status === 'failed' ? '#DC2626' : 'rgba(5,14,36,0.5)'
                              return (
                                <tr key={inv.id} className="border-b border-gray-50 hover:bg-gray-50">
                                  <td style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontSize: '13px' }} className="px-6 py-3 text-gray-700">
                                    {new Date(inv.paidAt || inv.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </td>
                                  <td style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontSize: '13px' }} className="px-6 py-3 text-gray-700">
                                    {inv.description || 'DealFlow AI subscription'}
                                  </td>
                                  <td style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontSize: '13px', fontWeight: 600 }} className="px-6 py-3 text-gray-900">
                                    ${(inv.amount / 100).toFixed(2)}
                                  </td>
                                  <td className="px-6 py-3">
                                    <span style={{ backgroundColor: statusBg, color: statusFg }} className="px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize">{inv.status}</span>
                                  </td>
                                  <td className="px-6 py-3">
                                    {inv.invoiceUrl && (
                                      <a href={inv.invoiceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-[#2563EB] hover:text-[#1D4ED8] flex items-center gap-1">
                                        <ExternalLink className="w-3 h-3" />
                                        View
                                      </a>
                                    )}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Plan comparison */}
                  <div id="plan-comparison">
                    <h3 style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 600, fontSize: '15px', color: '#0B1224' }} className="mb-4">Compare Plans</h3>
                    <div className="grid grid-cols-3 gap-4 billing-plans-grid">
                      {planDefs.map((plan) => {
                        const isCurrent = subscription?.tier === plan.key
                        const currentIdx = ['starter', 'pro', 'business'].indexOf(subscription?.tier || '')
                        const planIdx = ['starter', 'pro', 'business'].indexOf(plan.key)
                        const isUpgrade = planIdx > currentIdx
                        const isDowngrade = planIdx < currentIdx && currentIdx >= 0

                        return (
                          <div
                            key={plan.key}
                            style={{ border: isCurrent ? '2px solid #2563EB' : '1px solid rgba(5,14,36,0.08)', borderRadius: '12px', padding: '20px 24px' }}
                            className="bg-white relative"
                          >
                            {isCurrent && (
                              <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-bold bg-[#2563EB] text-white whitespace-nowrap">
                                Current Plan
                              </span>
                            )}
                            <h4 style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 600, fontSize: '15px', color: '#0B1224' }} className="mb-1">{plan.name}</h4>
                            <p className="mb-4">
                              <span style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 700, fontSize: '24px', color: '#0B1224', letterSpacing: '-0.02em' }}>{plan.price}</span>
                              <span style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 400, fontSize: '14px', color: 'rgba(5,14,36,0.5)' }}>{plan.period}</span>
                            </p>
                            <div className="space-y-2 mb-5" style={{ fontSize: '14px' }}>
                              {[
                                ['Reveals', plan.limits.reveals],
                                ['AI Call Minutes', plan.limits.aiMinutes],
                                ['SMS Messages', plan.limits.sms],
                                ['Deal Analyses', plan.limits.analyses],
                                ['Team Members', plan.limits.team],
                                ['Overage: Reveals', plan.limits.overageReveals],
                                ['Overage: AI Calls', plan.limits.overageCalls],
                                ['Overage: SMS', plan.limits.overageSms],
                              ].map(([label, val], j) => (
                                <div key={j} className="flex justify-between">
                                  <span style={{ color: 'rgba(5,14,36,0.65)', fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}>{label}</span>
                                  <span style={{ fontWeight: 600, color: '#0B1224', fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}>{val}</span>
                                </div>
                              ))}
                            </div>
                            {isCurrent ? (
                              <button style={{ borderRadius: '10px', padding: '10px 20px', fontWeight: 600, fontSize: '14px', fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }} className="w-full bg-gray-100 text-gray-500 cursor-default">Current Plan</button>
                            ) : isUpgrade && plan.stripePriceId ? (
                              <button onClick={() => handleCheckout(plan.stripePriceId!)} disabled={checkoutLoading} style={{ borderRadius: '10px', padding: '10px 20px', fontWeight: 600, fontSize: '14px', fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }} className="w-full bg-[#2563EB] text-white hover:bg-[#1D4ED8] transition-colors">
                                {checkoutLoading ? 'Loading...' : 'Upgrade'}
                              </button>
                            ) : isDowngrade ? (
                              <button onClick={openPortal} disabled={portalLoading} style={{ borderRadius: '10px', padding: '10px 20px', fontWeight: 600, fontSize: '14px', fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", border: '1px solid rgba(5,14,36,0.15)' }} className="w-full bg-white text-[#0B1224] hover:bg-gray-50 transition-colors">
                                {portalLoading ? 'Loading...' : 'Downgrade'}
                              </button>
                            ) : plan.stripePriceId ? (
                              <button onClick={() => handleCheckout(plan.stripePriceId!)} disabled={checkoutLoading} style={{ borderRadius: '10px', padding: '10px 20px', fontWeight: 600, fontSize: '14px', fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }} className="w-full bg-[#2563EB] text-white hover:bg-[#1D4ED8] transition-colors">
                                {checkoutLoading ? 'Loading...' : 'Subscribe'}
                              </button>
                            ) : null}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ════════════ TEAM ════════════ */}
          {activeSection === 'team' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 700, fontSize: '24px', color: '#0B1224', letterSpacing: '-0.02em' }} className="mb-1">Team</h2>
                  <p style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 400, fontSize: '14px', color: 'rgba(5,14,36,0.5)' }}>Manage team members and permissions.</p>
                </div>
                <button
                  onClick={() => setShowInviteForm(!showInviteForm)}
                  style={{ padding: '10px 20px', borderRadius: '10px', fontWeight: 600, fontSize: '14px', fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }} className="flex items-center gap-2 bg-[#2563EB] text-white hover:bg-[#1D4ED8] transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Invite Team Member
                </button>
              </div>

              {/* Invite form */}
              {showInviteForm && (
                <div style={{ backgroundColor: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.15)', borderRadius: '12px', padding: '20px 24px' }} className="mb-6">
                  <h4 style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 600, fontSize: '15px', color: '#0B1224' }} className="mb-3">Invite a new team member</h4>
                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <label style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 400, fontSize: '14px', color: 'rgba(5,14,36,0.65)' }} className="block mb-1">Email Address</label>
                      <input
                        value={inviteEmail}
                        onChange={e => setInviteEmail(e.target.value)}
                        placeholder="colleague@company.com"
                        style={{ backgroundColor: '#ffffff', border: '1px solid rgba(5,14,36,0.15)', borderRadius: '10px', padding: '10px 14px', fontSize: '14px', fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", color: '#0B1224' }} className="w-full focus:outline-none focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.08)]"
                      />
                    </div>
                    <div className="w-40">
                      <label style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 400, fontSize: '14px', color: 'rgba(5,14,36,0.65)' }} className="block mb-1">Role</label>
                      <select
                        value={inviteRole}
                        onChange={e => setInviteRole(e.target.value)}
                        style={{ backgroundColor: '#ffffff', border: '1px solid rgba(5,14,36,0.15)', borderRadius: '10px', padding: '10px 14px', fontSize: '14px', fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", color: '#0B1224' }} className="w-full focus:outline-none focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.08)]"
                      >
                        <option>Admin</option>
                        <option>Manager</option>
                        <option>Member</option>
                      </select>
                    </div>
                    <button style={{ padding: '10px 20px', borderRadius: '10px', fontWeight: 600, fontSize: '14px', fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }} className="bg-[#2563EB] text-white hover:bg-[#1D4ED8] transition-colors whitespace-nowrap">
                      Send Invite
                    </button>
                    <button onClick={() => setShowInviteForm(false)} className="px-3 py-2 text-[#2563EB] hover:text-[#1D4ED8]">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Team table */}
              <div style={{ border: '1px solid rgba(5,14,36,0.08)', borderRadius: '12px' }} className="bg-white overflow-hidden mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left">
                      <th style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 400, fontSize: '12px', color: 'rgba(5,14,36,0.4)' }} className="px-6 py-3">Name</th>
                      <th style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 400, fontSize: '12px', color: 'rgba(5,14,36,0.4)' }} className="px-6 py-3">Email</th>
                      <th style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 400, fontSize: '12px', color: 'rgba(5,14,36,0.4)' }} className="px-6 py-3">Role</th>
                      <th style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 400, fontSize: '12px', color: 'rgba(5,14,36,0.4)' }} className="px-6 py-3">Status</th>
                      <th style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 400, fontSize: '12px', color: 'rgba(5,14,36,0.4)' }} className="px-6 py-3">Date Added</th>
                      <th style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 400, fontSize: '12px', color: 'rgba(5,14,36,0.4)' }} className="px-6 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamMembers.map((m, i) => (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-[#0B1224] flex items-center justify-center">
                              <span style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 600, fontSize: '10px' }} className="text-white">{m.name.split(' ').map(n => n[0]).join('')}</span>
                            </div>
                            <span style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 600, fontSize: '14px', color: '#0B1224' }}>{m.name}</span>
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
                          <span className={`flex items-center gap-1 text-xs ${m.status === 'Active' ? 'text-[#2563EB]' : 'text-yellow-600'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${m.status === 'Active' ? 'bg-[#2563EB]' : 'bg-yellow-500'}`} />
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

              <p style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 400, fontSize: '12px', color: 'rgba(5,14,36,0.4)', borderRadius: '12px' }} className="bg-gray-100 px-4 py-2.5">
                Your plan allows up to <strong>3 team members</strong>. Upgrade to Enterprise for unlimited.
              </p>
            </div>
          )}

          {/* ════════════ NOTIFICATIONS ════════════ */}
          {activeSection === 'notifications' && (
            <div>
              <h2 style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 700, fontSize: '24px', color: '#0B1224', letterSpacing: '-0.02em' }} className="mb-1">Notifications</h2>
              <p style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 400, fontSize: '14px', color: 'rgba(5,14,36,0.5)' }} className="mb-6">Choose what you want to be notified about and how.</p>

              <div className="space-y-6">
                {notifications.map((cat, ci) => (
                  <div key={ci} style={{ border: '1px solid rgba(5,14,36,0.08)', borderRadius: '12px' }} className="bg-white overflow-hidden">
                    <div className="px-6 py-3 border-b border-gray-100 bg-gray-50">
                      <h3 style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 600, fontSize: '15px', color: '#0B1224' }}>{cat.category}</h3>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {cat.items.map((item, ii) => (
                        <div key={ii} className="flex items-center justify-between px-6 py-3.5">
                          <span style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 400, fontSize: '14px', color: 'rgba(5,14,36,0.65)' }}>{item.label}</span>
                          <div className="flex items-center gap-6">
                            {/* In-App */}
                            <div className="flex items-center gap-1.5">
                              <span style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 400, fontSize: '12px', color: 'rgba(5,14,36,0.4)' }} className=" w-10 text-right">In-App</span>
                              <button
                                onClick={() => toggleNotification(ci, ii)}
                                className={`w-9 h-5 rounded-full transition-colors relative ${item.on ? 'bg-[#2563EB]' : 'bg-gray-200'}`}
                              >
                                <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-[3px] transition-all ${item.on ? 'right-[3px]' : 'left-[3px]'}`} />
                              </button>
                            </div>
                            {/* Email */}
                            <div className="flex items-center gap-1.5">
                              <span style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 400, fontSize: '12px', color: 'rgba(5,14,36,0.4)' }} className=" w-8 text-right">Email</span>
                              <button className={`w-9 h-5 rounded-full transition-colors relative ${item.on ? 'bg-[#2563EB]' : 'bg-gray-200'}`}>
                                <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-[3px] transition-all ${item.on ? 'right-[3px]' : 'left-[3px]'}`} />
                              </button>
                            </div>
                            {/* SMS */}
                            <div className="flex items-center gap-1.5">
                              <span style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 400, fontSize: '12px', color: 'rgba(5,14,36,0.4)' }} className=" w-6 text-right">SMS</span>
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

              <button onClick={showSaved} style={{ padding: '10px 20px', borderRadius: '10px', fontWeight: 600, fontSize: '14px', fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }} className="mt-6 bg-[#2563EB] text-white hover:bg-[#1D4ED8] transition-colors">
                {saved ? '✓ Saved' : 'Save Notification Preferences'}
              </button>
            </div>
          )}

          {/* ════════════ INTEGRATIONS ════════════ */}
          {activeSection === 'integrations' && (
            <div>
              <h2 style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 700, fontSize: '24px', color: '#0B1224', letterSpacing: '-0.02em' }} className="mb-1">Integrations</h2>
              <p style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 400, fontSize: '14px', color: 'rgba(5,14,36,0.5)' }} className="mb-6">Connect your favorite tools and services.</p>

              {/* Connected */}
              <h3 style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 600, fontSize: '15px', color: '#0B1224' }} className="mb-3">Connected</h3>
              <div className="grid grid-cols-3 gap-4 mb-8">
                {integrationsData.connected.map((int, i) => (
                  <div key={i} style={{ border: '1px solid rgba(5,14,36,0.08)', borderRadius: '12px', padding: '20px 24px' }} className="bg-white">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`w-10 h-10 rounded-lg ${int.color} flex items-center justify-center`}>
                        <span className="text-white font-bold text-sm">{int.letter}</span>
                      </div>
                      <span style={{ backgroundColor: 'rgba(37,99,235,0.08)', color: '#2563EB' }} className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" />
                        Connected
                      </span>
                    </div>
                    <h4 style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 600, fontSize: '14px', color: '#0B1224' }} className="mb-0.5">{int.name}</h4>
                    <p style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 400, fontSize: '12px', color: 'rgba(5,14,36,0.4)' }} className="mb-4">{int.desc}</p>
                    <div className="flex gap-2">
                      <button className="text-xs text-[#2563EB] hover:text-[#1D4ED8] font-medium">Manage</button>
                      <button className="text-xs text-gray-500 hover:text-red-600 font-medium">Disconnect</button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Available */}
              <h3 style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 600, fontSize: '15px', color: '#0B1224' }} className="mb-3">Available</h3>
              <div className="grid grid-cols-3 gap-4 mb-8">
                {integrationsData.available.map((int, i) => (
                  <div key={i} style={{ border: '1px solid rgba(5,14,36,0.08)', borderRadius: '12px', padding: '20px 24px' }} className="bg-white">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`w-10 h-10 rounded-lg ${int.color} flex items-center justify-center`}>
                        <span className="text-white font-bold text-sm">{int.letter}</span>
                      </div>
                    </div>
                    <h4 style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 600, fontSize: '14px', color: '#0B1224' }} className="mb-0.5">{int.name}</h4>
                    <p style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 400, fontSize: '12px', color: 'rgba(5,14,36,0.4)' }} className="mb-4">{int.desc}</p>
                    <button style={{ borderRadius: '10px', padding: '10px 20px', fontWeight: 600, fontSize: '14px', fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", border: '1px solid #2563EB' }} className="text-[#2563EB] hover:bg-[rgba(37,99,235,0.08)] transition-colors">
                      Connect
                    </button>
                  </div>
                ))}
              </div>

              {/* Coming Soon */}
              <h3 style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 600, fontSize: '15px', color: '#0B1224' }} className="mb-3">Coming Soon</h3>
              <div className="grid grid-cols-4 gap-4">
                {integrationsData.comingSoon.map((int, i) => (
                  <div key={i} style={{ border: '1px solid rgba(5,14,36,0.08)', borderRadius: '12px', padding: '20px 24px' }} className="bg-white opacity-50">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`w-10 h-10 rounded-lg ${int.color} flex items-center justify-center`}>
                        <span className="text-white font-bold text-sm">{int.letter}</span>
                      </div>
                      <span style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 400, fontSize: '12px', color: 'rgba(5,14,36,0.4)' }} className="bg-gray-100 px-2 py-0.5 rounded-full">Coming Soon</span>
                    </div>
                    <h4 style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 600, fontSize: '14px', color: '#0B1224' }}>{int.name}</h4>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ════════════ AI SETTINGS ════════════ */}
          {activeSection === 'ai' && (
            <div>
              <h2 style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 700, fontSize: '24px', color: '#0B1224', letterSpacing: '-0.02em' }} className="mb-1">AI Settings</h2>
              <p style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 400, fontSize: '14px', color: 'rgba(5,14,36,0.5)' }} className="mb-6">Configure how the AI voice agent behaves on calls.</p>

              {/* Company Identity */}
              <div style={{ border: '1px solid rgba(5,14,36,0.08)', borderRadius: '12px', padding: '20px 24px' }} className="bg-white mb-6">
                <h3 style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 600, fontSize: '15px', color: '#0B1224' }} className="mb-4">Company Identity</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 400, fontSize: '14px', color: 'rgba(5,14,36,0.65)' }} className="block mb-1.5">Company Name for Calls</label>
                    <input
                      defaultValue="RiverPoint Capital"
                      style={{ backgroundColor: '#ffffff', border: '1px solid rgba(5,14,36,0.15)', borderRadius: '10px', padding: '10px 14px', fontSize: '14px', fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", color: '#0B1224' }} className="w-full focus:outline-none focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.08)]"
                    />
                  </div>
                  <div>
                    <label style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 400, fontSize: '14px', color: 'rgba(5,14,36,0.65)' }} className="block mb-1.5">Caller ID Name</label>
                    <input
                      defaultValue="RiverPoint Capital"
                      style={{ backgroundColor: '#ffffff', border: '1px solid rgba(5,14,36,0.15)', borderRadius: '10px', padding: '10px 14px', fontSize: '14px', fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", color: '#0B1224' }} className="w-full focus:outline-none focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.08)]"
                    />
                  </div>
                  <div>
                    <label style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 400, fontSize: '14px', color: 'rgba(5,14,36,0.65)' }} className="block mb-1.5">Call-back Number</label>
                    <input
                      defaultValue="(214) 555-0187"
                      style={{ backgroundColor: '#ffffff', border: '1px solid rgba(5,14,36,0.15)', borderRadius: '10px', padding: '10px 14px', fontSize: '14px', fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", color: '#0B1224' }} className="w-full focus:outline-none focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.08)]"
                    />
                  </div>
                </div>
              </div>

              {/* Voice Settings */}
              <div style={{ border: '1px solid rgba(5,14,36,0.08)', borderRadius: '12px', padding: '20px 24px' }} className="bg-white mb-6">
                <h3 style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 600, fontSize: '15px', color: '#0B1224' }} className="mb-4">Voice Settings</h3>
                <div className="grid grid-cols-5 gap-3 mb-4">
                  {voiceOptions.map((v, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedVoice(v.name)}
                      style={{ borderRadius: '12px', padding: '12px' }}
                      className={`border-2 text-center transition-all ${
                        selectedVoice === v.name
                          ? 'border-[#2563EB] bg-[rgba(37,99,235,0.08)]'
                          : 'border-[rgba(5,14,36,0.08)] hover:border-gray-300'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center ${
                        selectedVoice === v.name ? 'bg-[#2563EB]' : 'bg-gray-200'
                      }`}>
                        <Play className={`w-4 h-4 ${selectedVoice === v.name ? 'text-white' : 'text-gray-500'}`} />
                      </div>
                      <p style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 600, fontSize: '14px', color: '#0B1224' }}>{v.name}</p>
                      <p style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 400, fontSize: '12px', color: 'rgba(5,14,36,0.4)' }}>{v.desc}</p>
                    </button>
                  ))}
                </div>
                <button style={{ backgroundColor: '#ffffff', border: '1px solid rgba(5,14,36,0.15)', borderRadius: '10px', padding: '10px 20px', fontWeight: 600, fontSize: '14px', fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", color: '#0B1224' }} className="hover:bg-gray-50 transition-colors">
                  Preview Voice
                </button>
              </div>

              {/* Call Behavior */}
              <div style={{ border: '1px solid rgba(5,14,36,0.08)', borderRadius: '12px', padding: '20px 24px' }} className="bg-white mb-6">
                <h3 style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 600, fontSize: '15px', color: '#0B1224' }} className="mb-4">Call Behavior</h3>
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
                      <label style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 400, fontSize: '14px', color: 'rgba(5,14,36,0.65)' }} className="block mb-1.5">Max Retry Attempts</label>
                      <select
                        value={retryAttempts}
                        onChange={e => setRetryAttempts(e.target.value)}
                        style={{ backgroundColor: '#ffffff', border: '1px solid rgba(5,14,36,0.15)', borderRadius: '10px', padding: '10px 14px', fontSize: '14px', fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", color: '#0B1224' }} className="w-full focus:outline-none focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.08)]"
                      >
                        <option>1</option>
                        <option>2</option>
                        <option>3</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 400, fontSize: '14px', color: 'rgba(5,14,36,0.65)' }} className="block mb-1.5">Calling Hours Start</label>
                      <select
                        value={callStart}
                        onChange={e => setCallStart(e.target.value)}
                        style={{ backgroundColor: '#ffffff', border: '1px solid rgba(5,14,36,0.15)', borderRadius: '10px', padding: '10px 14px', fontSize: '14px', fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", color: '#0B1224' }} className="w-full focus:outline-none focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.08)]"
                      >
                        {['8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM'].map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 400, fontSize: '14px', color: 'rgba(5,14,36,0.65)' }} className="block mb-1.5">Calling Hours End</label>
                      <select
                        value={callEnd}
                        onChange={e => setCallEnd(e.target.value)}
                        style={{ backgroundColor: '#ffffff', border: '1px solid rgba(5,14,36,0.15)', borderRadius: '10px', padding: '10px 14px', fontSize: '14px', fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", color: '#0B1224' }} className="w-full focus:outline-none focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.08)]"
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
                        <p style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 400, fontSize: '12px', color: 'rgba(5,14,36,0.4)' }}>Required for TCPA compliance</p>
                      </div>
                    </div>
                    <div className="w-9 h-5 rounded-full bg-[#2563EB] relative cursor-not-allowed">
                      <div className="w-3.5 h-3.5 rounded-full bg-white absolute top-[3px] right-[3px]" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Qualification Script */}
              <div style={{ border: '1px solid rgba(5,14,36,0.08)', borderRadius: '12px', padding: '20px 24px' }} className="bg-white mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 600, fontSize: '15px', color: '#0B1224' }}>Qualification Script</h3>
                  <button style={{ backgroundColor: '#ffffff', border: '1px solid rgba(5,14,36,0.15)', borderRadius: '10px', padding: '10px 20px', fontWeight: 600, fontSize: '14px', fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", color: '#0B1224' }} className="hover:bg-gray-50 transition-colors">
                    Edit Script
                  </button>
                </div>
                <textarea
                  defaultValue={aiScript}
                  rows={10}
                  style={{ backgroundColor: '#fafafa', border: '1px solid rgba(5,14,36,0.15)', borderRadius: '10px', padding: '10px 14px', fontSize: '14px', fontFamily: 'monospace', color: '#0B1224' }} className="w-full leading-relaxed focus:outline-none focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.08)] focus:bg-white resize-none"
                />
                <p className="text-[10px] text-gray-500 mt-2">Changes to the script will apply to all future campaigns.</p>
              </div>

              <button onClick={showSaved} style={{ padding: '10px 20px', borderRadius: '10px', fontWeight: 600, fontSize: '14px', fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }} className="bg-[#2563EB] text-white hover:bg-[#1D4ED8] transition-colors">
                {saved ? '✓ Saved' : 'Save AI Settings'}
              </button>
            </div>
          )}

          {/* ════════════ DATA & PRIVACY ════════════ */}
          {activeSection === 'privacy' && (
            <div>
              <h2 style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 700, fontSize: '24px', color: '#0B1224', letterSpacing: '-0.02em' }} className="mb-1">Data & Privacy</h2>
              <p style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 400, fontSize: '14px', color: 'rgba(5,14,36,0.5)' }} className="mb-6">Manage your data, exports, and privacy settings.</p>

              {/* Export Data */}
              <div style={{ border: '1px solid rgba(5,14,36,0.08)', borderRadius: '12px', padding: '20px 24px' }} className="bg-white mb-6">
                <h3 style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 600, fontSize: '15px', color: '#0B1224' }} className="mb-4">Export Data</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    'Export Buyer CRM as CSV',
                    'Export Deal History as CSV',
                    'Export Call Transcripts',
                    'Export Contracts',
                  ].map((label, i) => (
                    <button
                      key={i}
                      style={{ backgroundColor: '#ffffff', border: '1px solid rgba(5,14,36,0.15)', borderRadius: '10px', padding: '10px 20px', fontWeight: 600, fontSize: '14px', fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", color: '#0B1224' }} className="flex items-center gap-2 hover:bg-gray-50 transition-colors"
                    >
                      <Download className="w-4 h-4 text-gray-400" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Data Retention */}
              <div style={{ border: '1px solid rgba(5,14,36,0.08)', borderRadius: '12px', padding: '20px 24px' }} className="bg-white mb-6">
                <h3 style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 600, fontSize: '15px', color: '#0B1224' }} className="mb-4">Data Retention</h3>
                <div className="max-w-xs">
                  <label style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 400, fontSize: '14px', color: 'rgba(5,14,36,0.65)' }} className="block mb-1.5">Keep call recordings for</label>
                  <select
                    value={dataRetention}
                    onChange={e => setDataRetention(e.target.value)}
                    style={{ backgroundColor: '#ffffff', border: '1px solid rgba(5,14,36,0.15)', borderRadius: '10px', padding: '10px 14px', fontSize: '14px', fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", color: '#0B1224' }} className="w-full focus:outline-none focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.08)]"
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
              <div style={{ border: '1px solid rgba(5,14,36,0.08)', borderRadius: '12px', padding: '20px 24px' }} className="bg-white mb-6">
                <h3 style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 600, fontSize: '15px', color: '#0B1224' }} className="mb-4">Do Not Call Management</h3>
                <div className="flex items-center gap-3 mb-3">
                  <button
                    onClick={openDNCList}
                    style={{ backgroundColor: '#ffffff', border: '1px solid rgba(5,14,36,0.15)', borderRadius: '10px', padding: '10px 20px', fontWeight: 600, fontSize: '14px', fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", color: '#0B1224' }} className="flex items-center gap-2 hover:bg-gray-50 transition-colors"
                  >
                    <Shield className="w-4 h-4 text-gray-400" />
                    View DNC List
                    {dncTotal > 0 && <span className="text-xs text-gray-400">({dncTotal} numbers)</span>}
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{ backgroundColor: '#ffffff', border: '1px solid rgba(5,14,36,0.15)', borderRadius: '10px', padding: '10px 20px', fontWeight: 600, fontSize: '14px', fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", color: '#0B1224' }} className="flex items-center gap-2 hover:bg-gray-50 transition-colors"
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
                <p style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 400, fontSize: '12px', color: 'rgba(5,14,36,0.4)' }}>Numbers on this list will be automatically excluded from all AI outreach campaigns.</p>

                {/* DNC Message */}
                {dncMessage && (
                  <div className={`mt-3 px-3 py-2 rounded-[10px] text-sm ${
                    dncMessage.type === 'success' ? 'border' : 'bg-red-50 text-red-700 border border-red-200'
                  }`} style={dncMessage.type === 'success' ? { backgroundColor: 'rgba(37,99,235,0.08)', color: '#2563EB', borderColor: 'rgba(37,99,235,0.2)' } : undefined}>
                    {dncMessage.text}
                  </div>
                )}

                {/* DNC Panel */}
                {dncOpen && (
                  <div style={{ border: '1px solid rgba(5,14,36,0.08)', borderRadius: '12px' }} className="mt-4 overflow-hidden">
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
                            style={{ backgroundColor: '#ffffff', border: '1px solid rgba(5,14,36,0.15)', borderRadius: '10px', paddingLeft: '36px', paddingRight: '14px', paddingTop: '10px', paddingBottom: '10px', fontSize: '14px', fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", color: '#0B1224' }} className="w-full focus:outline-none focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.08)]"
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
                          style={{ backgroundColor: '#ffffff', border: '1px solid rgba(5,14,36,0.15)', borderRadius: '10px', padding: '10px 14px', fontSize: '14px', fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", color: '#0B1224' }} className="flex-1 focus:outline-none focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.08)]"
                        />
                        <input
                          type="text"
                          placeholder="Reason (optional)"
                          value={addPhoneReason}
                          onChange={e => setAddPhoneReason(e.target.value)}
                          style={{ backgroundColor: '#ffffff', border: '1px solid rgba(5,14,36,0.15)', borderRadius: '10px', padding: '10px 14px', fontSize: '14px', fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", color: '#0B1224' }} className="flex-1 focus:outline-none focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.08)]"
                        />
                        <button
                          onClick={addPhoneToDNC}
                          disabled={addingPhone || !addPhoneInput.trim()}
                          style={{ padding: '10px 20px', borderRadius: '10px', fontWeight: 600, fontSize: '14px', fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }} className="flex items-center gap-1.5 bg-[#2563EB] text-white hover:bg-[#1D4ED8] disabled:opacity-50 transition-colors"
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
                            style={{ border: '1px solid rgba(5,14,36,0.15)', borderRadius: '10px', fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontSize: '12px', color: '#0B1224' }} className="px-3 py-1 hover:bg-gray-100 disabled:opacity-50"
                          >
                            Previous
                          </button>
                          <button
                            disabled={dncOffset + 50 >= dncTotal}
                            onClick={() => { const n = dncOffset + 50; setDncOffset(n); fetchDNCList(dncSearch, n) }}
                            style={{ border: '1px solid rgba(5,14,36,0.15)', borderRadius: '10px', fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontSize: '12px', color: '#0B1224' }} className="px-3 py-1 hover:bg-gray-100 disabled:opacity-50"
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
              <div style={{ border: '1px solid rgba(5,14,36,0.08)', borderRadius: '12px', padding: '20px 24px' }} className="bg-white mb-6">
                <h3 style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 600, fontSize: '15px', color: '#0B1224' }} className="mb-4">Account Actions</h3>
                <div className="space-y-3">
                  <button style={{ borderRadius: '10px', padding: '10px 20px', fontWeight: 600, fontSize: '14px', fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }} className="flex items-center gap-2 border border-yellow-300 bg-yellow-50 text-yellow-800 hover:bg-yellow-100 transition-colors">
                    <AlertTriangle className="w-4 h-4" />
                    Deactivate Account
                  </button>
                  <button style={{ borderRadius: '10px', padding: '10px 20px', fontWeight: 600, fontSize: '14px', fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }} className="flex items-center gap-2 bg-[#EF4444] text-white hover:bg-red-600 transition-colors">
                    <Trash2 className="w-4 h-4" />
                    Delete Account and All Data
                  </button>
                  <p style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 400, fontSize: '12px', color: 'rgba(5,14,36,0.4)' }}>
                    Account deletion is permanent and cannot be undone. All your data, buyers, deals, contracts, and call recordings will be permanently removed.
                  </p>
                </div>
              </div>

              {/* Legal Links */}
              <div style={{ border: '1px solid rgba(5,14,36,0.08)', borderRadius: '12px', padding: '20px 24px' }} className="bg-white">
                <h3 style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 600, fontSize: '15px', color: '#0B1224' }} className="mb-4">Legal</h3>
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
        <div style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 600, fontSize: '14px' }} className="fixed bottom-6 right-6 flex items-center gap-2 px-4 py-3 bg-[#2563EB] text-white rounded-xl shadow-lg z-50">
          <Check className="w-4 h-4" />
          Settings saved successfully
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 860px) {
          .billing-plans-grid { grid-template-columns: 1fr !important; }
        }
      ` }} />
    </div>
  )
}
