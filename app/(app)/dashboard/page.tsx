'use client'

import { useState } from 'react'
import {
  TrendingUp,
  TrendingDown,
  Play,
  Pause,
  Plus,
  Upload,
  UserPlus,
  Search,
  PhoneOutgoing,
  ArrowUpRight,
} from 'lucide-react'

/* ── KPI data ── */
const kpis = [
  { label: 'Active Deals', value: '12', change: '+18%', up: true, accent: 'border-l-blue-500' },
  { label: 'Buyers in CRM', value: '847', change: '+6.2%', up: true, accent: 'border-l-emerald-500' },
  { label: 'AI Calls This Month', value: '1,243', change: '+24%', up: true, accent: 'border-l-violet-500' },
  { label: 'Deals Closed', value: '3', change: '-1', up: false, accent: 'border-l-amber-500' },
]

/* ── Revenue chart data (last 6 months) ── */
const revenueData = [
  { month: 'Oct', value: 18500 },
  { month: 'Nov', value: 24500 },
  { month: 'Dec', value: 12000 },
  { month: 'Jan', value: 31000 },
  { month: 'Feb', value: 28500 },
  { month: 'Mar', value: 42000 },
]

/* ── Campaigns ── */
const campaigns = [
  { name: 'Phoenix Cash Buyers - Cold Call', status: 'running', calls: 342, responseRate: 18.4 },
  { name: 'Dallas Absentee Owners', status: 'running', calls: 198, responseRate: 12.7 },
  { name: 'Tampa Investor Reactivation', status: 'paused', calls: 87, responseRate: 22.1 },
]

/* ── Activity feed ── */
const activities = [
  { time: '2 min ago', text: 'New buyer added: Marcus T., Phoenix, AZ', type: 'buyer' },
  { time: '18 min ago', text: 'Deal matched: 1847 Oak St to 3 buyers', type: 'match' },
  { time: '1 hr ago', text: 'Contract signed: 2201 Elm Ave for $24,500 assignment fee', type: 'contract' },
  { time: '2 hrs ago', text: 'AI call completed: Spoke with David R. (Interested)', type: 'call' },
  { time: '3 hrs ago', text: 'Property analyzed: 940 Birch Dr, Deal Score 78/100', type: 'analysis' },
  { time: '5 hrs ago', text: 'New buyer added: Sarah K., Dallas, TX', type: 'buyer' },
]

/* ── Quick actions ── */
const quickActions = [
  { label: 'New AI Campaign', icon: PhoneOutgoing, color: 'bg-blue-500' },
  { label: 'Upload Deal', icon: Upload, color: 'bg-emerald-500' },
  { label: 'Add Buyer', icon: UserPlus, color: 'bg-violet-500' },
  { label: 'Run Analysis', icon: Search, color: 'bg-amber-500' },
]

/* ── Revenue chart SVG builder ── */
function RevenueChart() {
  const max = Math.max(...revenueData.map(d => d.value))
  const w = 480
  const h = 180
  const padL = 0
  const padB = 28
  const chartH = h - padB
  const stepX = (w - padL) / (revenueData.length - 1)

  const points = revenueData.map((d, i) => ({
    x: padL + i * stepX,
    y: chartH - (d.value / max) * (chartH - 16),
  }))

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const areaPath = `${linePath} L${points[points.length - 1].x},${chartH} L${points[0].x},${chartH} Z`

  const total = revenueData.reduce((s, d) => s + d.value, 0)

  return (
    <div>
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <div className="text-[0.7rem] text-gray-400 uppercase tracking-wide mb-1">Revenue (6 mo)</div>
          <div
            className="text-[1.65rem] font-medium text-gray-900 tracking-tight leading-none"
            style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
          >
            ${total.toLocaleString()}
          </div>
        </div>
        <div className="flex items-center gap-1 text-emerald-600 text-[0.75rem] font-medium">
          <TrendingUp className="w-3.5 h-3.5" />
          +32% vs prior
        </div>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: 160 }}>
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#areaGrad)" />
        <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#fff" stroke="#3b82f6" strokeWidth="2" />
        ))}
        {revenueData.map((d, i) => (
          <text
            key={i}
            x={padL + i * stepX}
            y={h - 6}
            textAnchor="middle"
            fill="#9ca3af"
            fontSize="11"
          >
            {d.month}
          </text>
        ))}
      </svg>
    </div>
  )
}

/* ── Activity type indicator dot ── */
function activityDot(type: string) {
  const colors: Record<string, string> = {
    buyer: 'bg-blue-400',
    match: 'bg-emerald-400',
    contract: 'bg-violet-400',
    call: 'bg-amber-400',
    analysis: 'bg-rose-400',
  }
  return <span className={`inline-block w-1.5 h-1.5 rounded-full ${colors[type] ?? 'bg-gray-300'} mt-[5px] flex-shrink-0`} />
}

export default function DashboardPage() {
  const [activeTab] = useState('Dashboard')

  return (
    <div className="p-8 max-w-[1200px]">
      {/* Header */}
      <div className="mb-7">
        <h1
          style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
          className="text-[1.45rem] font-medium text-gray-900 tracking-[-0.025em] mb-1"
        >
          Dashboard
        </h1>
        <p className="text-[0.84rem] text-gray-400">
          Your deals, pipeline, and AI outreach at a glance.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6 dash-kpi">
        {kpis.map(k => (
          <div
            key={k.label}
            className={`bg-white border border-gray-200 rounded-xl px-5 py-4 hover:shadow-sm transition-shadow border-l-[3px] ${k.accent}`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="text-[0.7rem] text-gray-400 uppercase tracking-wide">{k.label}</div>
              <div className={`flex items-center gap-0.5 text-[0.72rem] font-medium ${k.up ? 'text-emerald-600' : 'text-red-500'}`}>
                {k.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {k.change}
              </div>
            </div>
            <div
              style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
              className="text-[2rem] font-normal text-gray-900 tracking-[-0.04em] leading-none"
            >
              {k.value}
            </div>
          </div>
        ))}
      </div>

      {/* Middle row: Revenue + Campaigns */}
      <div className="grid grid-cols-5 gap-4 mb-6 dash-mid">
        {/* Revenue chart */}
        <div className="col-span-3 bg-white border border-gray-200 rounded-xl px-5 py-5">
          <RevenueChart />
        </div>

        {/* Active campaigns */}
        <div className="col-span-2 bg-white border border-gray-200 rounded-xl px-5 py-5">
          <div className="text-[0.7rem] text-gray-400 uppercase tracking-wide mb-4">Active Campaigns</div>
          <div className="space-y-3">
            {campaigns.map(c => (
              <div key={c.name} className="border border-gray-100 rounded-lg px-3.5 py-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[0.8rem] text-gray-800 font-medium truncate mr-2">{c.name}</span>
                  <span
                    className={`flex items-center gap-1 text-[0.68rem] font-medium px-2 py-0.5 rounded-full ${
                      c.status === 'running'
                        ? 'text-emerald-700 bg-emerald-50'
                        : 'text-gray-500 bg-gray-100'
                    }`}
                  >
                    {c.status === 'running' ? <Play className="w-2.5 h-2.5" /> : <Pause className="w-2.5 h-2.5" />}
                    {c.status === 'running' ? 'Running' : 'Paused'}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-[0.74rem] text-gray-500">
                  <span>{c.calls} calls</span>
                  <span>{c.responseRate}% response</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row: Activity + Quick Actions */}
      <div className="grid grid-cols-5 gap-4 dash-bot">
        {/* Activity feed */}
        <div className="col-span-3 bg-white border border-gray-200 rounded-xl px-5 py-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[0.7rem] text-gray-400 uppercase tracking-wide">Recent Activity</div>
            <button className="text-[0.75rem] text-gray-400 hover:text-gray-600 transition-colors cursor-pointer bg-transparent border-0">
              View all
            </button>
          </div>
          <div className="space-y-0">
            {activities.map((a, i) => (
              <div
                key={i}
                className={`flex items-start gap-2.5 py-2.5 ${
                  i < activities.length - 1 ? 'border-b border-gray-50' : ''
                }`}
              >
                {activityDot(a.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-[0.8rem] text-gray-700 leading-snug">{a.text}</p>
                </div>
                <span className="text-[0.7rem] text-gray-400 whitespace-nowrap flex-shrink-0">{a.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="col-span-2 bg-white border border-gray-200 rounded-xl px-5 py-5">
          <div className="text-[0.7rem] text-gray-400 uppercase tracking-wide mb-4">Quick Actions</div>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map(a => {
              const Icon = a.icon
              return (
                <button
                  key={a.label}
                  className="flex flex-col items-center gap-2.5 py-5 px-3 rounded-xl border border-gray-100 bg-white hover:bg-gray-50 hover:border-gray-200 transition-all cursor-pointer group"
                >
                  <div className={`w-9 h-9 rounded-lg ${a.color} flex items-center justify-center`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-[0.76rem] text-gray-600 font-medium text-center leading-tight group-hover:text-gray-800">
                    {a.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 1000px) {
          .dash-kpi { grid-template-columns: repeat(2, 1fr) !important; }
          .dash-mid { grid-template-columns: 1fr !important; }
          .dash-mid > * { grid-column: span 1 !important; }
          .dash-bot { grid-template-columns: 1fr !important; }
          .dash-bot > * { grid-column: span 1 !important; }
        }
        @media (max-width: 600px) {
          .dash-kpi { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
