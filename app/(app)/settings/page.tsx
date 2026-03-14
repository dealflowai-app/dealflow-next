'use client'

import { useState } from 'react'
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
    <div className="flex h-[calc(100vh-0px)] overflow-hidden bg-gray-50">
      {/* ── Settings side nav ── */}
      <div className="w-[220px] bg-white border-r border-gray-200 flex flex-col py-6 flex-shrink-0">
        <h2 className="px-5 text-lg font-bold text-gray-900 mb-5" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
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
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
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
              <h2 className="text-xl font-bold text-gray-900 mb-1" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Profile</h2>
              <p className="text-sm text-gray-500 mb-6">Manage your personal and business information.</p>

              {/* Avatar */}
              <div className="flex items-center gap-5 mb-8">
                <div className="relative group">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                    <span className="text-2xl font-semibold text-white">JR</span>
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
              <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                <h3 className="text-sm font-semibold text-gray-800 mb-4">Personal Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">First Name</label>
                    <input
                      value={profile.firstName}
                      onChange={e => setProfile(p => ({ ...p, firstName: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Last Name</label>
                    <input
                      value={profile.lastName}
                      onChange={e => setProfile(p => ({ ...p, lastName: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Company Name</label>
                    <input
                      value={profile.company}
                      onChange={e => setProfile(p => ({ ...p, company: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Email</label>
                    <input
                      value={profile.email}
                      onChange={e => setProfile(p => ({ ...p, email: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Phone Number</label>
                    <input
                      value={profile.phone}
                      onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Time Zone</label>
                    <select
                      value={profile.timezone}
                      onChange={e => setProfile(p => ({ ...p, timezone: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      <span key={i} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">
                        {m}
                        <button
                          onClick={() => setProfile(p => ({ ...p, markets: p.markets.filter((_, idx) => idx !== i) }))}
                          className="hover:text-blue-900"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    <button className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-dashed border-gray-300 text-gray-500 text-xs hover:border-blue-400 hover:text-blue-600 transition-colors">
                      <Plus className="w-3 h-3" />
                      Add Market
                    </button>
                  </div>
                </div>
              </div>

              {/* Business details */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                <h3 className="text-sm font-semibold text-gray-800 mb-4">Business Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Company Type</label>
                    <select
                      value={profile.companyType}
                      onChange={e => setProfile(p => ({ ...p, companyType: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Average Deals per Month</label>
                    <input
                      value={profile.dealsPerMonth}
                      onChange={e => setProfile(p => ({ ...p, dealsPerMonth: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Website URL</label>
                    <input
                      value={profile.website}
                      onChange={e => setProfile(p => ({ ...p, website: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <button onClick={showSaved} className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
                {saved ? '✓ Saved' : 'Save Changes'}
              </button>
            </div>
          )}

          {/* ════════════ BILLING & PLAN ════════════ */}
          {activeSection === 'billing' && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Billing & Plan</h2>
              <p className="text-sm text-gray-500 mb-6">Manage your subscription, payment methods, and view invoices.</p>

              {/* Current plan card */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-bold text-gray-900" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Pro Plan - $349/month</h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">Active</span>
                    </div>
                    <p className="text-sm text-gray-500 mb-1">Next billing date: <span className="font-medium text-gray-700">April 1, 2026</span></p>
                    <p className="text-sm text-gray-500">Payment method: <span className="font-medium text-gray-700">Visa ending in 4821</span></p>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">Change Plan</button>
                    <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">Update Payment Method</button>
                  </div>
                </div>
              </div>

              {/* Plan comparison */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                {plans.map((plan, i) => (
                  <div
                    key={i}
                    className={`bg-white rounded-xl border-2 p-5 relative ${
                      plan.current ? 'border-blue-500 shadow-md' : 'border-gray-200'
                    }`}
                  >
                    {plan.current && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white">
                        Current Plan
                      </span>
                    )}
                    <h4 className="text-lg font-bold text-gray-900 mb-1" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>{plan.name}</h4>
                    <p className="mb-4">
                      <span className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>{plan.price}</span>
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
                      <button className="w-full py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors">Contact Sales</button>
                    ) : (
                      <button className="w-full py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors">Downgrade</button>
                    )}
                  </div>
                ))}
              </div>

              {/* Usage this month */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                <h3 className="text-sm font-semibold text-gray-800 mb-4">Usage This Month</h3>
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
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-800">Billing History</h3>
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
                          <button className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
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
                  <h2 className="text-xl font-bold text-gray-900 mb-1" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Team</h2>
                  <p className="text-sm text-gray-500">Manage team members and permissions.</p>
                </div>
                <button
                  onClick={() => setShowInviteForm(!showInviteForm)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Invite Team Member
                </button>
              </div>

              {/* Invite form */}
              {showInviteForm && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6">
                  <h4 className="text-sm font-semibold text-blue-900 mb-3">Invite a new team member</h4>
                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-blue-800 mb-1">Email Address</label>
                      <input
                        value={inviteEmail}
                        onChange={e => setInviteEmail(e.target.value)}
                        placeholder="colleague@company.com"
                        className="w-full px-3 py-2 rounded-lg border border-blue-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="w-40">
                      <label className="block text-xs font-medium text-blue-800 mb-1">Role</label>
                      <select
                        value={inviteRole}
                        onChange={e => setInviteRole(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-blue-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option>Admin</option>
                        <option>Manager</option>
                        <option>Member</option>
                      </select>
                    </div>
                    <button className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap">
                      Send Invite
                    </button>
                    <button onClick={() => setShowInviteForm(false)} className="px-3 py-2 text-blue-600 hover:text-blue-800">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Team table */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
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
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                              <span className="text-[10px] font-medium text-white">{m.name.split(' ').map(n => n[0]).join('')}</span>
                            </div>
                            <span className="font-medium text-gray-900">{m.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-3 text-gray-600">{m.email}</td>
                        <td className="px-6 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            m.role === 'Admin' ? 'bg-purple-100 text-purple-700' :
                            m.role === 'Manager' ? 'bg-blue-100 text-blue-700' :
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
                            <button className="text-xs text-blue-600 hover:text-blue-800">Edit Role</button>
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
              <h2 className="text-xl font-bold text-gray-900 mb-1" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Notifications</h2>
              <p className="text-sm text-gray-500 mb-6">Choose what you want to be notified about and how.</p>

              <div className="space-y-6">
                {notifications.map((cat, ci) => (
                  <div key={ci} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-6 py-3 border-b border-gray-100 bg-gray-50">
                      <h3 className="text-sm font-semibold text-gray-800">{cat.category}</h3>
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
                                className={`w-9 h-5 rounded-full transition-colors relative ${item.on ? 'bg-blue-600' : 'bg-gray-200'}`}
                              >
                                <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-[3px] transition-all ${item.on ? 'right-[3px]' : 'left-[3px]'}`} />
                              </button>
                            </div>
                            {/* Email */}
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-gray-400 w-8 text-right">Email</span>
                              <button className={`w-9 h-5 rounded-full transition-colors relative ${item.on ? 'bg-blue-600' : 'bg-gray-200'}`}>
                                <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-[3px] transition-all ${item.on ? 'right-[3px]' : 'left-[3px]'}`} />
                              </button>
                            </div>
                            {/* SMS */}
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-gray-400 w-6 text-right">SMS</span>
                              <button className={`w-9 h-5 rounded-full transition-colors relative ${item.sms ? 'bg-blue-600' : 'bg-gray-200'}`}>
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

              <button onClick={showSaved} className="mt-6 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
                {saved ? '✓ Saved' : 'Save Notification Preferences'}
              </button>
            </div>
          )}

          {/* ════════════ INTEGRATIONS ════════════ */}
          {activeSection === 'integrations' && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Integrations</h2>
              <p className="text-sm text-gray-500 mb-6">Connect your favorite tools and services.</p>

              {/* Connected */}
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Connected</h3>
              <div className="grid grid-cols-3 gap-4 mb-8">
                {integrationsData.connected.map((int, i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`w-10 h-10 rounded-lg ${int.color} flex items-center justify-center`}>
                        <span className="text-white font-bold text-sm">{int.letter}</span>
                      </div>
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        Connected
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-0.5">{int.name}</h4>
                    <p className="text-xs text-gray-500 mb-4">{int.desc}</p>
                    <div className="flex gap-2">
                      <button className="text-xs text-blue-600 hover:text-blue-800 font-medium">Manage</button>
                      <button className="text-xs text-gray-500 hover:text-red-600 font-medium">Disconnect</button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Available */}
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Available</h3>
              <div className="grid grid-cols-3 gap-4 mb-8">
                {integrationsData.available.map((int, i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`w-10 h-10 rounded-lg ${int.color} flex items-center justify-center`}>
                        <span className="text-white font-bold text-sm">{int.letter}</span>
                      </div>
                    </div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-0.5">{int.name}</h4>
                    <p className="text-xs text-gray-500 mb-4">{int.desc}</p>
                    <button className="px-4 py-1.5 rounded-lg border border-blue-600 text-blue-600 text-xs font-medium hover:bg-blue-50 transition-colors">
                      Connect
                    </button>
                  </div>
                ))}
              </div>

              {/* Coming Soon */}
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Coming Soon</h3>
              <div className="grid grid-cols-4 gap-4">
                {integrationsData.comingSoon.map((int, i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 opacity-50">
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
              <h2 className="text-xl font-bold text-gray-900 mb-1" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>AI Settings</h2>
              <p className="text-sm text-gray-500 mb-6">Configure how the AI voice agent behaves on calls.</p>

              {/* Company Identity */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                <h3 className="text-sm font-semibold text-gray-800 mb-4">Company Identity</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Company Name for Calls</label>
                    <input
                      defaultValue="RiverPoint Capital"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Caller ID Name</label>
                    <input
                      defaultValue="RiverPoint Capital"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Call-back Number</label>
                    <input
                      defaultValue="(214) 555-0187"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Voice Settings */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                <h3 className="text-sm font-semibold text-gray-800 mb-4">Voice Settings</h3>
                <div className="grid grid-cols-5 gap-3 mb-4">
                  {voiceOptions.map((v, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedVoice(v.name)}
                      className={`p-3 rounded-xl border-2 text-center transition-all ${
                        selectedVoice === v.name
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center ${
                        selectedVoice === v.name ? 'bg-blue-600' : 'bg-gray-200'
                      }`}>
                        <Play className={`w-4 h-4 ${selectedVoice === v.name ? 'text-white' : 'text-gray-500'}`} />
                      </div>
                      <p className="text-xs font-semibold text-gray-900">{v.name}</p>
                      <p className="text-[10px] text-gray-500">{v.desc}</p>
                    </button>
                  ))}
                </div>
                <button className="px-4 py-2 border border-gray-300 rounded-lg text-xs text-gray-700 hover:bg-gray-50 transition-colors">
                  Preview Voice
                </button>
              </div>

              {/* Call Behavior */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                <h3 className="text-sm font-semibold text-gray-800 mb-4">Call Behavior</h3>
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
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
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
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {['8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM'].map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Calling Hours End</label>
                      <select
                        value={callEnd}
                        onChange={e => setCallEnd(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                            active ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
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
                    <div className="w-9 h-5 rounded-full bg-blue-600 relative cursor-not-allowed">
                      <div className="w-3.5 h-3.5 rounded-full bg-white absolute top-[3px] right-[3px]" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Qualification Script */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-800">Qualification Script</h3>
                  <button className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-700 hover:bg-gray-50 transition-colors">
                    Edit Script
                  </button>
                </div>
                <textarea
                  defaultValue={aiScript}
                  rows={10}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 text-sm text-gray-700 font-mono leading-relaxed bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white resize-none"
                />
                <p className="text-[10px] text-gray-500 mt-2">Changes to the script will apply to all future campaigns.</p>
              </div>

              <button onClick={showSaved} className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
                {saved ? '✓ Saved' : 'Save AI Settings'}
              </button>
            </div>
          )}

          {/* ════════════ DATA & PRIVACY ════════════ */}
          {activeSection === 'privacy' && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Data & Privacy</h2>
              <p className="text-sm text-gray-500 mb-6">Manage your data, exports, and privacy settings.</p>

              {/* Export Data */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                <h3 className="text-sm font-semibold text-gray-800 mb-4">Export Data</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    'Export Buyer CRM as CSV',
                    'Export Deal History as CSV',
                    'Export Call Transcripts',
                    'Export Contracts',
                  ].map((label, i) => (
                    <button
                      key={i}
                      className="flex items-center gap-2 px-4 py-3 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                    >
                      <Download className="w-4 h-4 text-gray-400" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Data Retention */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                <h3 className="text-sm font-semibold text-gray-800 mb-4">Data Retention</h3>
                <div className="max-w-xs">
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Keep call recordings for</label>
                  <select
                    value={dataRetention}
                    onChange={e => setDataRetention(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                <h3 className="text-sm font-semibold text-gray-800 mb-4">Do Not Call Management</h3>
                <div className="flex items-center gap-3 mb-3">
                  <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                    <Shield className="w-4 h-4 text-gray-400" />
                    View DNC List
                    <span className="text-xs text-gray-400">(47 numbers)</span>
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                    <Upload className="w-4 h-4 text-gray-400" />
                    Upload DNC List
                  </button>
                </div>
                <p className="text-[10px] text-gray-500">Numbers on this list will be automatically excluded from all AI outreach campaigns.</p>
              </div>

              {/* Account Actions */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                <h3 className="text-sm font-semibold text-gray-800 mb-4">Account Actions</h3>
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
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-800 mb-4">Legal</h3>
                <div className="space-y-2.5">
                  {[
                    'Terms of Service',
                    'Privacy Policy',
                    'TCPA Compliance Policy',
                    'Data Processing Agreement',
                  ].map((link, i) => (
                    <button key={i} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 transition-colors">
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
