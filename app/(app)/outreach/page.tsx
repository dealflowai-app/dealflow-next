'use client'

import { useState } from 'react'
import {
  Plus,
  Search,
  Phone,
  Mail,
  MessageSquare,
  Layers,
  Play,
  Pause,
  CheckCircle2,
  ArrowLeft,
  X,
  ArrowUpDown,
  ChevronDown,
  MoreHorizontal,
  Copy,
  Archive,
  User,
  Bot,
  Sparkles,
  Calendar,
  PhoneOff,
  PhoneIncoming,
  Voicemail,
  Ban,
  ExternalLink,
  FileText,
  ChevronRight,
} from 'lucide-react'

/* ═══════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════ */
type SubTab = 'campaigns' | 'calllog'
type View = 'list' | 'detail' | 'transcript'

/* ═══════════════════════════════════════════════
   CAMPAIGN TYPE HELPERS
   ═══════════════════════════════════════════════ */
function campaignTypeBadge(_t: string) {
  return 'text-[#6B7280] bg-[#F3F4F6]'
}

function statusBadge(s: string) {
  switch (s) {
    case 'Running': return 'text-emerald-700 bg-emerald-50'
    case 'Paused': return 'text-amber-700 bg-amber-50'
    case 'Completed': return 'text-[#6B7280] bg-gray-100'
    case 'Scheduled': return 'text-[#2563EB] bg-[#EFF6FF]'
    default: return 'text-[#6B7280] bg-gray-100'
  }
}

/* ═══════════════════════════════════════════════
   MOCK DATA:CAMPAIGNS
   ═══════════════════════════════════════════════ */
const campaigns = [
  {
    id: 1,
    name: 'Phoenix Cash Buyers: March',
    status: 'Running',
    type: 'AI Voice',
    audience: '147 buyers from CRM | Phoenix, AZ | Score B+ or higher',
    made: 89,
    total: 147,
    connect: 67,
    qualified: 23,
    interested: 14,
    notInterested: 8,
    noAnswer: 42,
    callback: 6,
    startDate: 'Mar 10, 2026',
    estComplete: 'Mar 15, 2026',
  },
  {
    id: 2,
    name: 'Dallas SFR Buyers: Reactivation',
    status: 'Paused',
    type: 'AI Voice',
    audience: '312 buyers from CRM | Dallas, TX | Dormant 30+ days',
    made: 198,
    total: 312,
    connect: 54,
    qualified: 31,
    interested: 22,
    notInterested: 18,
    noAnswer: 127,
    callback: 9,
    startDate: 'Mar 5, 2026',
    estComplete: 'Mar 18, 2026',
  },
  {
    id: 3,
    name: 'Atlanta Multi-Family Outreach',
    status: 'Completed',
    type: 'Multi-Channel',
    audience: '89 buyers from CRM | Atlanta, GA | Multi-Family pref',
    made: 89,
    total: 89,
    connect: 72,
    qualified: 18,
    interested: 12,
    notInterested: 11,
    noAnswer: 17,
    callback: 3,
    startDate: 'Feb 24, 2026',
    estComplete: 'Mar 2, 2026',
  },
  {
    id: 4,
    name: 'Tampa New Lead Qualification',
    status: 'Completed',
    type: 'AI Voice',
    audience: '64 new leads | Tampa, FL | Unqualified',
    made: 64,
    total: 64,
    connect: 58,
    qualified: 14,
    interested: 9,
    notInterested: 6,
    noAnswer: 27,
    callback: 4,
    startDate: 'Feb 18, 2026',
    estComplete: 'Feb 22, 2026',
  },
  {
    id: 5,
    name: 'Phoenix Land Buyers: Email Drip',
    status: 'Scheduled',
    type: 'Email',
    audience: '56 buyers from CRM | Phoenix, AZ | Land pref',
    made: 0,
    total: 56,
    connect: 0,
    qualified: 0,
    interested: 0,
    notInterested: 0,
    noAnswer: 0,
    callback: 0,
    startDate: 'Mar 14, 2026',
    estComplete: 'Mar 21, 2026',
  },
  {
    id: 6,
    name: 'Dallas: Deal Alert SMS Blast',
    status: 'Completed',
    type: 'SMS',
    audience: '423 buyers from CRM | Dallas, TX | Active',
    made: 423,
    total: 423,
    connect: 81,
    qualified: 0,
    interested: 67,
    notInterested: 14,
    noAnswer: 0,
    callback: 0,
    startDate: 'Mar 1, 2026',
    estComplete: 'Mar 1, 2026',
  },
]

/* ═══════════════════════════════════════════════
   MOCK DATA:CAMPAIGN DETAIL CONTACTS
   ═══════════════════════════════════════════════ */
const detailContacts = [
  { id: 1, name: 'Marcus Thompson', phone: '(602) 555-0147', callStatus: 'Connected', outcome: 'Qualified', buyBox: 'SFR, $120K-$200K, Flip', duration: '4:12', hasRecording: true },
  { id: 2, name: 'David Chen', phone: '(602) 555-0184', callStatus: 'Connected', outcome: 'Qualified', buyBox: 'SFR, $150K-$300K, Either', duration: '3:45', hasRecording: true },
  { id: 3, name: 'Angela Scott', phone: '(602) 555-0293', callStatus: 'No Answer', outcome: 'N/A', buyBox: '-', duration: '0:00', hasRecording: false },
  { id: 4, name: 'Omar Bryant', phone: '(602) 555-0488', callStatus: 'Connected', outcome: 'Not Interested', buyBox: '-', duration: '1:32', hasRecording: true },
  { id: 5, name: 'Rachel Kim', phone: '(602) 555-0361', callStatus: 'Voicemail', outcome: 'N/A', buyBox: '-', duration: '0:28', hasRecording: false },
  { id: 6, name: 'James Walker', phone: '(602) 555-0519', callStatus: 'Connected', outcome: 'Qualified', buyBox: 'Land, $30K-$80K, Hold', duration: '3:08', hasRecording: true },
  { id: 7, name: 'Lisa Park', phone: '(602) 555-0637', callStatus: 'Connected', outcome: 'Callback', buyBox: '-', duration: '1:55', hasRecording: true },
  { id: 8, name: 'Derrick Jones', phone: '(602) 555-0744', callStatus: 'No Answer', outcome: 'N/A', buyBox: '-', duration: '0:00', hasRecording: false },
  { id: 9, name: 'Nina Foster', phone: '(602) 555-0852', callStatus: 'Connected', outcome: 'Qualified', buyBox: 'SFR, $100K-$180K, Flip', duration: '4:38', hasRecording: true },
  { id: 10, name: 'Carlos Medina', phone: '(602) 555-0961', callStatus: 'Connected', outcome: 'Wrong Number', buyBox: '-', duration: '0:22', hasRecording: false },
  { id: 11, name: 'Tanya Brooks', phone: '(602) 555-1023', callStatus: 'Voicemail', outcome: 'N/A', buyBox: '-', duration: '0:30', hasRecording: false },
  { id: 12, name: 'Kevin Patel', phone: '(602) 555-1148', callStatus: 'Connected', outcome: 'DNC', buyBox: '-', duration: '0:45', hasRecording: true },
]

/* ═══════════════════════════════════════════════
   MOCK DATA:CALL LOG
   ═══════════════════════════════════════════════ */
const callLogEntries = [
  { id: 1, datetime: 'Mar 13, 10:42 AM', campaign: 'Phoenix Cash Buyers: March', name: 'Marcus Thompson', phone: '(602) 555-0147', duration: '4:12', status: 'Connected', outcome: 'Qualified' },
  { id: 2, datetime: 'Mar 13, 10:38 AM', campaign: 'Phoenix Cash Buyers: March', name: 'David Chen', phone: '(602) 555-0184', duration: '3:45', status: 'Connected', outcome: 'Qualified' },
  { id: 3, datetime: 'Mar 13, 10:33 AM', campaign: 'Phoenix Cash Buyers: March', name: 'Angela Scott', phone: '(602) 555-0293', duration: '0:00', status: 'No Answer', outcome: 'N/A' },
  { id: 4, datetime: 'Mar 13, 10:28 AM', campaign: 'Phoenix Cash Buyers: March', name: 'Omar Bryant', phone: '(602) 555-0488', duration: '1:32', status: 'Connected', outcome: 'Not Interested' },
  { id: 5, datetime: 'Mar 12, 3:15 PM', campaign: 'Phoenix Cash Buyers: March', name: 'Rachel Kim', phone: '(602) 555-0361', duration: '0:28', status: 'Voicemail', outcome: 'N/A' },
  { id: 6, datetime: 'Mar 12, 3:10 PM', campaign: 'Phoenix Cash Buyers: March', name: 'James Walker', phone: '(602) 555-0519', duration: '3:08', status: 'Connected', outcome: 'Qualified' },
  { id: 7, datetime: 'Mar 12, 2:55 PM', campaign: 'Dallas SFR Buyers: Reactivation', name: 'Tanya Brooks', phone: '(214) 555-0831', duration: '2:41', status: 'Connected', outcome: 'Not Interested' },
  { id: 8, datetime: 'Mar 12, 2:48 PM', campaign: 'Dallas SFR Buyers: Reactivation', name: 'Aisha Williams', phone: '(214) 555-0376', duration: '3:52', status: 'Connected', outcome: 'Qualified' },
  { id: 9, datetime: 'Mar 11, 11:20 AM', campaign: 'Dallas SFR Buyers: Reactivation', name: 'Kevin Nguyen', phone: '(214) 555-0198', duration: '4:15', status: 'Connected', outcome: 'Qualified' },
  { id: 10, datetime: 'Mar 11, 11:14 AM', campaign: 'Dallas SFR Buyers: Reactivation', name: 'Rachel Martinez', phone: '(214) 555-0654', duration: '0:00', status: 'No Answer', outcome: 'N/A' },
  { id: 11, datetime: 'Mar 11, 10:58 AM', campaign: 'Phoenix Cash Buyers: March', name: 'Lisa Park', phone: '(602) 555-0637', duration: '1:55', status: 'Connected', outcome: 'Callback' },
  { id: 12, datetime: 'Mar 10, 4:30 PM', campaign: 'Dallas SFR Buyers: Reactivation', name: 'Travis King', phone: '(214) 555-0819', duration: '0:30', status: 'Voicemail', outcome: 'N/A' },
  { id: 13, datetime: 'Mar 10, 4:22 PM', campaign: 'Atlanta Multi-Family Outreach', name: 'Derrick Jones', phone: '(404) 555-0962', duration: '3:28', status: 'Connected', outcome: 'Qualified' },
  { id: 14, datetime: 'Mar 10, 4:15 PM', campaign: 'Atlanta Multi-Family Outreach', name: 'Sarah Kim', phone: '(404) 555-0582', duration: '2:55', status: 'Connected', outcome: 'Interested' },
  { id: 15, datetime: 'Mar 9, 2:10 PM', campaign: 'Atlanta Multi-Family Outreach', name: 'Angela Scott', phone: '(404) 555-0273', duration: '0:00', status: 'Failed', outcome: 'N/A' },
  { id: 16, datetime: 'Mar 9, 2:04 PM', campaign: 'Tampa New Lead Qualification', name: 'Ryan Mitchell', phone: '(813) 555-0421', duration: '2:18', status: 'Connected', outcome: 'Qualified' },
  { id: 17, datetime: 'Mar 8, 11:45 AM', campaign: 'Tampa New Lead Qualification', name: 'Lisa Park', phone: '(813) 555-0137', duration: '3:10', status: 'Connected', outcome: 'Qualified' },
  { id: 18, datetime: 'Mar 8, 11:38 AM', campaign: 'Tampa New Lead Qualification', name: 'Travis King', phone: '(813) 555-0819', duration: '0:00', status: 'Busy', outcome: 'N/A' },
  { id: 19, datetime: 'Mar 7, 3:30 PM', campaign: 'Dallas SFR Buyers: Reactivation', name: 'Carlos Medina', phone: '(214) 555-0744', duration: '0:22', status: 'Connected', outcome: 'Wrong Number' },
  { id: 20, datetime: 'Mar 7, 3:22 PM', campaign: 'Dallas SFR Buyers: Reactivation', name: 'Nina Foster', phone: '(214) 555-0852', duration: '4:38', status: 'Connected', outcome: 'Qualified' },
]

/* ═══════════════════════════════════════════════
   MOCK TRANSCRIPT
   ═══════════════════════════════════════════════ */
const transcript = [
  { speaker: 'ai', text: 'Hi, this is Sarah calling on behalf of DealFlow Properties. Am I speaking with Marcus?' },
  { speaker: 'buyer', text: 'Yeah, this is Marcus.' },
  { speaker: 'ai', text: "Great, Marcus. We work with investors in the Phoenix area and I wanted to see if you're still actively looking for investment properties." },
  { speaker: 'buyer', text: "Yeah, I'm always looking. What do you have?" },
  { speaker: 'ai', text: 'We have several properties coming through in Maricopa County. To make sure I only send you relevant deals, can I ask what type of properties you prefer?' },
  { speaker: 'buyer', text: 'Single family mostly. Under 200K. I flip them.' },
  { speaker: 'ai', text: 'Perfect. And are there specific zip codes or neighborhoods you focus on?' },
  { speaker: 'buyer', text: '85031, 85033, and anything around Maryvale.' },
  { speaker: 'ai', text: "Got it. One more question: when you find the right deal, how quickly can you typically close?" },
  { speaker: 'buyer', text: 'I can close in 10 days if the numbers work.' },
  { speaker: 'ai', text: "Excellent. I've noted everything down. We'll send you deals that match your criteria. Thanks for your time, Marcus." },
  { speaker: 'buyer', text: "Sounds good. Appreciate it." },
]

/* ═══════════════════════════════════════════════
   CALL STATUS HELPERS
   ═══════════════════════════════════════════════ */
function callStatusStyle(s: string) {
  switch (s) {
    case 'Connected': return 'text-emerald-700 bg-emerald-50'
    case 'No Answer': return 'text-gray-500 bg-gray-100'
    case 'Voicemail': return 'text-violet-700 bg-violet-50'
    case 'Busy': return 'text-amber-700 bg-amber-50'
    case 'Failed': return 'text-red-700 bg-red-50'
    default: return 'text-gray-500 bg-gray-100'
  }
}

function outcomeStyle(o: string) {
  switch (o) {
    case 'Qualified': return 'text-emerald-700 bg-emerald-50'
    case 'Interested': return 'text-[#2563EB] bg-[#EFF6FF]'
    case 'Not Interested': return 'text-gray-500 bg-gray-100'
    case 'Callback': return 'text-amber-700 bg-amber-50'
    case 'Wrong Number': return 'text-rose-700 bg-rose-50'
    case 'DNC': return 'text-red-700 bg-red-50'
    case 'N/A': return 'text-gray-400 bg-gray-50'
    default: return 'text-gray-500 bg-gray-100'
  }
}

/* ═══════════════════════════════════════════════
   CAMPAIGN LIST
   ═══════════════════════════════════════════════ */
function CampaignList({ onViewDetail }: { onViewDetail: () => void }) {
  return (
    <div className="space-y-3">
      {campaigns.map(c => {
        const pct = c.total > 0 ? Math.round((c.made / c.total) * 100) : 0
        return (
          <div key={c.id} className="bg-white border border-[#E5E7EB] rounded-lg px-5 py-4 hover:bg-[#F9FAFB] transition-colors">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <h3 className="text-[0.9rem] font-medium text-[#374151]">{c.name}</h3>
                <span className={`text-[0.68rem] font-medium px-2 py-0.5 rounded-full ${statusBadge(c.status)}`}>
                  {c.status}
                </span>
                <span className={`text-[0.68rem] font-medium px-2 py-0.5 rounded-full ${campaignTypeBadge(c.type)}`}>
                  {c.type}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {c.status === 'Running' && (
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[0.76rem] font-medium text-amber-600 hover:bg-amber-50 bg-transparent border-0 cursor-pointer transition-colors">
                    <Pause className="w-3.5 h-3.5" /> Pause
                  </button>
                )}
                {c.status === 'Paused' && (
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[0.76rem] font-medium text-emerald-600 hover:bg-emerald-50 bg-transparent border-0 cursor-pointer transition-colors">
                    <Play className="w-3.5 h-3.5" /> Resume
                  </button>
                )}
                <button
                  onClick={onViewDetail}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[0.76rem] font-medium text-[#2563EB] hover:bg-[#EFF6FF] bg-transparent border-0 cursor-pointer transition-colors"
                >
                  View Details
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[0.76rem] font-medium text-gray-400 hover:bg-gray-50 hover:text-gray-600 bg-transparent border-0 cursor-pointer transition-colors">
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[0.76rem] font-medium text-gray-400 hover:bg-gray-50 hover:text-gray-600 bg-transparent border-0 cursor-pointer transition-colors">
                  <Archive className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Audience */}
            <div className="text-[0.78rem] text-gray-500 mb-3">{c.audience}</div>

            {/* Progress bar */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[0.72rem] text-gray-400">{c.made} / {c.total} contacts</span>
                <span className="text-[0.72rem] font-medium text-gray-600">{pct}%</span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    c.status === 'Running' ? 'bg-emerald-500' : c.status === 'Paused' ? 'bg-amber-400' : 'bg-[#2563EB]'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            {/* Metrics row */}
            <div className="flex items-center gap-4 text-[0.74rem] flex-wrap">
              <span className="text-gray-500">Connect: <strong className="text-gray-700">{c.connect}%</strong></span>
              <span className="text-gray-500">Qualified: <strong className="text-emerald-600">{c.qualified}</strong></span>
              <span className="text-gray-500">Interested: <strong className="text-[#2563EB]">{c.interested}</strong></span>
              <span className="text-gray-500">Not Interested: <strong className="text-gray-600">{c.notInterested}</strong></span>
              <span className="text-gray-500">No Answer: <strong className="text-gray-600">{c.noAnswer}</strong></span>
              {c.callback > 0 && <span className="text-gray-500">Callback: <strong className="text-amber-600">{c.callback}</strong></span>}
              <span className="text-gray-400 ml-auto text-[0.72rem]">{c.startDate} → {c.estComplete}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ═══════════════════════════════════════════════
   CAMPAIGN DETAIL VIEW
   ═══════════════════════════════════════════════ */
function CampaignDetail({ onBack, onShowTranscript }: { onBack: () => void; onShowTranscript: () => void }) {
  const c = campaigns[0]
  const metrics = [
    { label: 'Total Calls', value: c.made, color: 'bg-gray-100 text-gray-700' },
    { label: 'Connected', value: 47, color: 'bg-emerald-50 text-emerald-700' },
    { label: 'Qualified', value: c.qualified, color: 'bg-emerald-50 text-emerald-700' },
    { label: 'Interested', value: c.interested, color: 'bg-[#EFF6FF] text-[#2563EB]' },
    { label: 'Not Interested', value: c.notInterested, color: 'bg-gray-100 text-gray-600' },
    { label: 'No Answer', value: c.noAnswer, color: 'bg-gray-100 text-gray-500' },
    { label: 'Callback', value: c.callback, color: 'bg-amber-50 text-amber-700' },
    { label: 'DNC', value: 2, color: 'bg-red-50 text-red-700' },
  ]

  /* Outcome breakdown bar */
  const total = 89
  const segments = [
    { label: 'Qualified', pct: 26, color: 'bg-emerald-500' },
    { label: 'Interested', pct: 16, color: 'bg-[#2563EB]' },
    { label: 'Not Interested', pct: 9, color: 'bg-gray-400' },
    { label: 'Callback', pct: 7, color: 'bg-amber-400' },
    { label: 'No Answer', pct: 37, color: 'bg-gray-200' },
    { label: 'Other', pct: 5, color: 'bg-rose-300' },
  ]

  return (
    <div className="animate-fadeInUp">
      {/* Back button + header */}
      <button onClick={onBack} className="flex items-center gap-1.5 text-[0.82rem] text-gray-500 hover:text-gray-700 mb-4 bg-transparent border-0 cursor-pointer transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Campaigns
      </button>

      <div className="flex items-center gap-3 mb-5">
        <h2 className="text-2xl font-semibold text-[#111827]">
          {c.name}
        </h2>
        <span className={`text-[0.68rem] font-medium px-2 py-0.5 rounded-full ${statusBadge(c.status)}`}>
          {c.status}
        </span>
        <span className={`text-[0.68rem] font-medium px-2 py-0.5 rounded-full ${campaignTypeBadge(c.type)}`}>
          {c.type}
        </span>
        <span className="text-[0.76rem] text-gray-400 ml-auto">{c.startDate} → {c.estComplete}</span>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-4 gap-3 mb-5 outreach-metrics">
        {metrics.map(m => (
          <div key={m.label} className="bg-white border border-[#E5E7EB] rounded-lg px-4 py-3 text-center">
            <div className="text-xs font-medium text-[#6B7280] uppercase tracking-[0.05em] mb-1.5">{m.label}</div>
            <div className="text-[1.5rem] font-medium text-[#111827] leading-none">
              {m.value}
            </div>
          </div>
        ))}
      </div>

      {/* Outcome breakdown bar */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg px-5 py-4 mb-5">
        <div className="text-xs font-medium text-[#6B7280] uppercase tracking-[0.05em] mb-3">Call Outcome Breakdown</div>
        <div className="flex w-full h-4 rounded-full overflow-hidden mb-3">
          {segments.map(s => (
            <div key={s.label} className={`${s.color} h-full`} style={{ width: `${s.pct}%` }} title={`${s.label}: ${s.pct}%`} />
          ))}
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          {segments.map(s => (
            <div key={s.label} className="flex items-center gap-1.5 text-[0.72rem] text-gray-500">
              <span className={`w-2 h-2 rounded-full ${s.color}`} />
              {s.label} ({s.pct}%)
            </div>
          ))}
        </div>
      </div>

      {/* Contact list table */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-[#F3F4F6]">
          <span className="text-xs font-medium text-[#6B7280] uppercase tracking-[0.05em]">Campaign Contacts</span>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#F3F4F6]">
              <th className="text-left px-5 py-2.5 text-xs uppercase tracking-wider text-[#6B7280] font-medium">Buyer Name</th>
              <th className="text-left px-3 py-2.5 text-xs uppercase tracking-wider text-[#6B7280] font-medium">Phone</th>
              <th className="text-left px-3 py-2.5 text-xs uppercase tracking-wider text-[#6B7280] font-medium">Call Status</th>
              <th className="text-left px-3 py-2.5 text-xs uppercase tracking-wider text-[#6B7280] font-medium">Outcome</th>
              <th className="text-left px-3 py-2.5 text-xs uppercase tracking-wider text-[#6B7280] font-medium">Buy Box</th>
              <th className="text-right px-3 py-2.5 text-xs uppercase tracking-wider text-[#6B7280] font-medium">Duration</th>
              <th className="text-right px-5 py-2.5 text-xs uppercase tracking-wider text-[#6B7280] font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {detailContacts.map((r, i) => (
              <tr key={r.id} className={`${i < detailContacts.length - 1 ? 'border-b border-[#F3F4F6]' : ''} hover:bg-[#F9FAFB] transition-colors`}>
                <td className="px-5 py-2.5 text-[0.82rem] text-[#374151] font-medium">{r.name}</td>
                <td className="px-3 py-2.5 text-[0.78rem] text-gray-500">{r.phone}</td>
                <td className="px-3 py-2.5">
                  <span className={`text-[0.68rem] font-medium px-2 py-0.5 rounded-full ${callStatusStyle(r.callStatus)}`}>{r.callStatus}</span>
                </td>
                <td className="px-3 py-2.5">
                  <span className={`text-[0.68rem] font-medium px-2 py-0.5 rounded-full ${outcomeStyle(r.outcome)}`}>{r.outcome}</span>
                </td>
                <td className="px-3 py-2.5 text-[0.76rem] text-gray-500 max-w-[160px] truncate">{r.buyBox}</td>
                <td className="px-3 py-2.5 text-right text-[0.78rem] text-gray-500">{r.duration}</td>
                <td className="px-5 py-2.5 text-right">
                  {r.hasRecording && (
                    <button
                      onClick={onShowTranscript}
                      className="flex items-center gap-1 text-[0.72rem] text-[#2563EB] hover:text-[#1D4ED8] bg-transparent border-0 cursor-pointer transition-colors ml-auto"
                    >
                      <Play className="w-3 h-3" /> Recording
                    </button>
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
   TRANSCRIPT PANEL
   ═══════════════════════════════════════════════ */
function TranscriptPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-fadeIn" onClick={onClose} />
      <div className="relative w-[520px] h-full bg-white border-l border-[#E5E7EB] overflow-y-auto outreach-transcript-panel animate-slideInRight">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#F3F4F6] flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <h3 className="text-[0.94rem] font-medium text-[#111827]">
              Call Transcript
            </h3>
            <p className="text-sm text-[#9CA3AF]">Marcus Thompson · Mar 13, 10:42 AM · 4:12</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center cursor-pointer border-0 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Audio waveform placeholder */}
        <div className="px-6 py-3 border-b border-[#F3F4F6]">
          <div className="flex items-center gap-3">
            <button className="w-8 h-8 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] flex items-center justify-center cursor-pointer border-0 transition-colors flex-shrink-0">
              <Play className="w-3.5 h-3.5 text-white ml-0.5" />
            </button>
            <div className="flex-1 flex items-center gap-[2px] h-8">
              {Array.from({ length: 60 }).map((_, i) => {
                const h = Math.random() * 24 + 4
                return (
                  <div
                    key={i}
                    className={`flex-1 rounded-full ${i < 35 ? 'bg-[#2563EB]' : 'bg-gray-200'}`}
                    style={{ height: h, minWidth: 2 }}
                  />
                )
              })}
            </div>
            <span className="text-[0.72rem] text-gray-400 flex-shrink-0 font-mono">2:27 / 4:12</span>
          </div>
        </div>

        {/* Transcript */}
        <div className="px-6 py-5 space-y-4">
          {transcript.map((line, i) => (
            <div key={i} className={`flex gap-3 ${line.speaker === 'ai' ? '' : 'flex-row-reverse'}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                line.speaker === 'ai'
                  ? 'bg-gradient-to-br from-[#2563EB] to-[#1D4ED8]'
                  : 'bg-gradient-to-br from-gray-400 to-gray-500'
              }`}>
                {line.speaker === 'ai'
                  ? <Bot className="w-3.5 h-3.5 text-white" />
                  : <User className="w-3.5 h-3.5 text-white" />
                }
              </div>
              <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl ${
                line.speaker === 'ai'
                  ? 'bg-[#EFF6FF] text-[#374151] rounded-tl-md'
                  : 'bg-gray-100 text-[#374151] rounded-tr-md'
              }`}>
                <div className="text-[0.66rem] font-medium text-gray-400 mb-0.5 uppercase tracking-wide">
                  {line.speaker === 'ai' ? 'AI Agent (Sarah)' : 'Marcus Thompson'}
                </div>
                <p className="text-[0.82rem] leading-relaxed">{line.text}</p>
              </div>
            </div>
          ))}
        </div>

        {/* AI Summary */}
        <div className="px-6 pb-6">
          <div className="bg-gradient-to-br from-[#EFF6FF] to-violet-50 border border-[#BFDBFE] rounded-lg px-5 py-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-[#2563EB]" />
              <span className="text-[0.78rem] font-semibold text-[#1E3A8A]">AI Summary</span>
            </div>
            <p className="text-[0.8rem] text-[#374151] leading-relaxed mb-3">
              Qualified buyer. SFR, under $200K, flip strategy, 85031/85033/Maryvale, 10-day close. Cash buyer with active deal flow.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {['Phoenix', 'SFR', 'Flip', 'Fast Closer', 'Cash Buyer', 'Qualified'].map(t => (
                <span key={t} className="text-[0.68rem] font-medium px-2 py-0.5 rounded-full bg-white text-[#2563EB] border border-[#BFDBFE]">
                  {t}
                </span>
              ))}
            </div>
            <p className="text-[0.72rem] text-[#2563EB] mt-2.5 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Added to CRM with tags
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .outreach-transcript-panel { width: 100% !important; }
        }
      `}</style>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   CALL LOG TAB
   ═══════════════════════════════════════════════ */
function CallLog() {
  return (
    <div>
      {/* Date range filter */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input type="text" defaultValue="Mar 1, 2026" className="bg-white border border-[#D1D5DB] rounded-md pl-9 pr-3 py-2 text-[0.8rem] text-[#374151] outline-none focus:border-[#2563EB] w-[140px]" />
        </div>
        <span className="text-sm text-[#9CA3AF]">to</span>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input type="text" defaultValue="Mar 13, 2026" className="bg-white border border-[#D1D5DB] rounded-md pl-9 pr-3 py-2 text-[0.8rem] text-[#374151] outline-none focus:border-[#2563EB] w-[140px]" />
        </div>
        <div className="relative ml-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input type="text" placeholder="Search calls..." className="bg-white border border-[#D1D5DB] rounded-md pl-9 pr-3 py-2 text-[0.8rem] text-[#374151] placeholder-gray-400 outline-none focus:border-[#2563EB] w-[200px]" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="border-b border-[#F3F4F6]">
              {['Date / Time', 'Campaign', 'Buyer Name', 'Phone', 'Duration', 'Status', 'Outcome', ''].map(h => (
                <th key={h} className={`px-4 py-2.5 text-xs uppercase tracking-wider text-[#6B7280] font-medium ${h === '' ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {callLogEntries.map((r, i) => (
              <tr key={r.id} className={`${i < callLogEntries.length - 1 ? 'border-b border-[#F3F4F6]' : ''} hover:bg-[#F9FAFB] transition-colors`}>
                <td className="px-4 py-2.5 text-[0.78rem] text-[#9CA3AF] whitespace-nowrap">{r.datetime}</td>
                <td className="px-4 py-2.5 text-[0.78rem] text-[#374151] max-w-[180px] truncate">{r.campaign}</td>
                <td className="px-4 py-2.5 text-[0.82rem] text-[#374151] font-medium whitespace-nowrap">{r.name}</td>
                <td className="px-4 py-2.5 text-[0.78rem] text-gray-500 whitespace-nowrap">{r.phone}</td>
                <td className="px-4 py-2.5 text-[0.78rem] text-gray-500 font-mono">{r.duration}</td>
                <td className="px-4 py-2.5">
                  <span className={`text-[0.68rem] font-medium px-2 py-0.5 rounded-full ${callStatusStyle(r.status)}`}>{r.status}</span>
                </td>
                <td className="px-4 py-2.5">
                  <span className={`text-[0.68rem] font-medium px-2 py-0.5 rounded-full ${outcomeStyle(r.outcome)}`}>{r.outcome}</span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {r.status === 'Connected' && (
                      <button className="p-1 rounded-md text-gray-400 hover:text-[#2563EB] hover:bg-[#EFF6FF] bg-transparent border-0 cursor-pointer transition-colors">
                        <Play className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button className="p-1 rounded-md text-gray-400 hover:text-violet-600 hover:bg-violet-50 bg-transparent border-0 cursor-pointer transition-colors">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                    <button className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 bg-transparent border-0 cursor-pointer transition-colors">
                      <FileText className="w-3.5 h-3.5" />
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
   NEW CAMPAIGN MODAL
   ═══════════════════════════════════════════════ */
function NewCampaignModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(1)
  const [campaignType, setCampaignType] = useState<string>('AI Voice')

  const steps = ['Campaign Setup', 'Select Audience', 'Script & Settings', 'Review & Launch']

  const typeOptions = [
    { key: 'AI Voice', icon: Phone, desc: 'AI-powered voice calls to your buyer list' },
    { key: 'SMS', icon: MessageSquare, desc: 'Automated text message sequences' },
    { key: 'Email', icon: Mail, desc: 'Personalized email drip campaigns' },
    { key: 'Multi-Channel', icon: Layers, desc: 'Combine voice, SMS, and email' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-lg border border-[#E5E7EB] w-[600px] max-h-[80vh] overflow-y-auto outreach-modal">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#F3F4F6] flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-[#111827]">
            New Campaign
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center cursor-pointer border-0 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Stepper */}
        <div className="px-6 py-4 border-b border-[#F3F4F6]">
          <div className="flex items-center gap-2">
            {steps.map((s, i) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[0.68rem] font-bold flex-shrink-0 ${
                  i + 1 <= step ? 'bg-[#2563EB] text-white' : 'bg-gray-100 text-gray-400'
                }`}>
                  {i + 1}
                </div>
                <span className={`text-[0.74rem] whitespace-nowrap ${i + 1 <= step ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>
                  {s}
                </span>
                {i < steps.length - 1 && <div className="flex-1 h-px bg-gray-200 mx-1" />}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          {step === 1 && (
            <div className="space-y-5">
              {/* Name */}
              <div>
                <label className="text-[0.78rem] text-gray-600 mb-1.5 block font-medium">Campaign Name</label>
                <input
                  type="text"
                  placeholder="e.g., Phoenix Cash Buyers: March"
                  className="w-full bg-white border border-[#D1D5DB] rounded-md px-4 py-2.5 text-[0.84rem] text-[#374151] placeholder-gray-400 outline-none focus:border-[#2563EB] transition-colors"
                />
              </div>

              {/* Type */}
              <div>
                <label className="text-[0.78rem] text-gray-600 mb-2 block font-medium">Campaign Type</label>
                <div className="grid grid-cols-2 gap-2.5">
                  {typeOptions.map(t => {
                    const Icon = t.icon
                    const selected = campaignType === t.key
                    return (
                      <button
                        key={t.key}
                        onClick={() => setCampaignType(t.key)}
                        className={`flex items-start gap-3 px-4 py-3.5 rounded-lg border text-left cursor-pointer transition-all ${
                          selected
                            ? 'border-[#2563EB] bg-[#EFF6FF] ring-1 ring-[#BFDBFE]'
                            : 'border-[#E5E7EB] bg-white hover:bg-[#F9FAFB]'
                        }`}
                      >
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          selected ? 'bg-[#2563EB]' : 'bg-gray-100'
                        }`}>
                          <Icon className={`w-4 h-4 ${selected ? 'text-white' : 'text-gray-500'}`} />
                        </div>
                        <div>
                          <div className={`text-[0.82rem] font-medium ${selected ? 'text-[#1E3A8A]' : 'text-[#374151]'}`}>{t.key}</div>
                          <div className="text-[0.72rem] text-gray-400">{t.desc}</div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Market */}
              <div>
                <label className="text-[0.78rem] text-gray-600 mb-1.5 block font-medium">Target Market</label>
                <div className="relative">
                  <select className="appearance-none w-full bg-white border border-[#D1D5DB] rounded-md pl-4 pr-8 py-2.5 text-[0.84rem] text-[#374151] outline-none focus:border-[#2563EB] cursor-pointer">
                    <option>Phoenix, AZ</option>
                    <option>Dallas, TX</option>
                    <option>Atlanta, GA</option>
                    <option>Tampa, FL</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="py-10 text-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <User className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-[0.88rem] text-gray-600 font-medium mb-1">Select Audience</p>
              <p className="text-[0.78rem] text-gray-400">Choose buyers from your CRM using filters, segments, or tags.</p>
            </div>
          )}

          {step === 3 && (
            <div className="py-10 text-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <FileText className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-[0.88rem] text-gray-600 font-medium mb-1">Script & Settings</p>
              <p className="text-[0.78rem] text-gray-400">Configure your AI script, call schedule, and retry rules.</p>
            </div>
          )}

          {step === 4 && (
            <div className="py-10 text-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-[0.88rem] text-gray-600 font-medium mb-1">Review & Launch</p>
              <p className="text-[0.78rem] text-gray-400">Review your campaign summary before launching.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#F3F4F6] flex items-center justify-between">
          {step > 1 ? (
            <button onClick={() => setStep(step - 1)} className="text-[0.82rem] text-gray-500 hover:text-gray-700 bg-transparent border-0 cursor-pointer transition-colors">
              Back
            </button>
          ) : (
            <div />
          )}
          {step < 4 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="flex items-center gap-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white border-0 rounded-md px-5 py-2.5 text-[0.82rem] font-medium cursor-pointer transition-colors"
            >
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white border-0 rounded-lg px-5 py-2.5 text-[0.82rem] font-medium cursor-pointer transition-colors">
              <Play className="w-4 h-4" /> Launch Campaign
            </button>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .outreach-modal { width: 95% !important; max-height: 90vh !important; }
        }
      `}</style>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   MAIN AI OUTREACH PAGE
   ═══════════════════════════════════════════════ */
export default function AIOutreachPage() {
  const [subTab, setSubTab] = useState<SubTab>('campaigns')
  const [view, setView] = useState<View>('list')
  const [showTranscript, setShowTranscript] = useState(false)
  const [showNewCampaign, setShowNewCampaign] = useState(false)

  return (
    <div className="p-8 max-w-[1200px] bg-[#FAFAFA] min-h-screen">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-semibold text-[#111827] mb-1">
            AI Outreach
          </h1>
          <p className="text-sm text-[#9CA3AF]">
            Launch AI-powered campaigns to qualify and engage your buyers.
          </p>
        </div>
        <button
          onClick={() => setShowNewCampaign(true)}
          className="flex items-center gap-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white border-0 rounded-md px-5 py-2.5 text-[0.82rem] font-medium cursor-pointer transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Campaign
        </button>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-6 bg-white border border-[#E5E7EB] rounded-lg px-5 py-3 mb-5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[0.82rem] text-gray-700 font-medium">1,243</span>
          <span className="text-[0.78rem] text-gray-400">AI Calls This Month</span>
        </div>
        <div className="w-px h-4 bg-gray-200" />
        <div className="flex items-center gap-2">
          <span className="text-[0.82rem] text-gray-700 font-medium">67%</span>
          <span className="text-[0.78rem] text-gray-400">Connect Rate</span>
        </div>
        <div className="w-px h-4 bg-gray-200" />
        <div className="flex items-center gap-2">
          <span className="text-[0.82rem] text-gray-700 font-medium">312</span>
          <span className="text-[0.78rem] text-gray-400">Buyers Qualified</span>
        </div>
        <div className="w-px h-4 bg-gray-200" />
        <div className="flex items-center gap-2">
          <span className="text-[0.82rem] text-gray-700 font-medium">23</span>
          <span className="text-[0.78rem] text-gray-400">Campaigns Run</span>
        </div>
      </div>

      {/* Sub tabs */}
      {view === 'list' && (
        <div className="flex items-center gap-1 mb-6 border-b border-[#E5E7EB] pb-0">
          {[
            { key: 'campaigns' as SubTab, label: 'Campaigns', icon: Layers },
            { key: 'calllog' as SubTab, label: 'Call Log', icon: Phone },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setSubTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-[0.82rem] font-medium cursor-pointer bg-transparent border-0 border-b-2 -mb-[1px] transition-colors ${
                subTab === tab.key
                  ? 'border-[#2563EB] text-[#2563EB]'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {view === 'list' && subTab === 'campaigns' && (
        <CampaignList onViewDetail={() => setView('detail')} />
      )}
      {view === 'list' && subTab === 'calllog' && <CallLog />}
      {view === 'detail' && (
        <CampaignDetail
          onBack={() => setView('list')}
          onShowTranscript={() => setShowTranscript(true)}
        />
      )}

      {/* Transcript panel */}
      {showTranscript && <TranscriptPanel onClose={() => setShowTranscript(false)} />}

      {/* New Campaign modal */}
      {showNewCampaign && <NewCampaignModal onClose={() => setShowNewCampaign(false)} />}

      <style>{`
        @media (max-width: 900px) {
          .outreach-metrics { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </div>
  )
}
