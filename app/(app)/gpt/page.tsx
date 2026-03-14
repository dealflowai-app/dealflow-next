'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Send,
  Bot,
  User,
  Sparkles,
  Database,
  BarChart3,
  PhoneOutgoing,
  Contact,
  FileSignature,
  Radar,
  Store,
  ChevronDown,
  ChevronUp,
  Copy,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  Zap,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react'

/* ── Connected data sources ── */
const dataSources = [
  { label: 'Buyer CRM', icon: Contact, count: 847, connected: true },
  { label: 'Active Deals', icon: BarChart3, count: 12, connected: true },
  { label: 'AI Campaigns', icon: PhoneOutgoing, count: 6, connected: true },
  { label: 'Discovery Data', icon: Radar, count: '14.2k', connected: true },
  { label: 'Marketplace', icon: Store, count: 48, connected: true },
  { label: 'Contracts', icon: FileSignature, count: 7, connected: true },
]

/* ── Account overview ── */
const accountStats = [
  { label: 'Plan', value: 'Pro ($299/mo)' },
  { label: 'Markets', value: 'Phoenix, Dallas, Tampa' },
  { label: 'Searches Left', value: '1,847 / 2,500' },
  { label: 'AI Calls Left', value: '1,102 / 1,500' },
]

/* ── Recent activity for context ── */
const recentActivity = [
  { text: 'Marcus T. added to CRM', time: '2 min ago' },
  { text: '1847 Oak St matched to 3 buyers', time: '18 min ago' },
  { text: 'Contract signed: 2201 Elm Ave', time: '1 hr ago' },
  { text: 'AI call with David R. (Interested)', time: '2 hrs ago' },
  { text: '940 Birch Dr analyzed, Score 78', time: '3 hrs ago' },
]

/* ── Quick actions ── */
const quickActions = [
  { label: 'Analyze a property', prompt: 'Analyze 1423 Sunset Blvd, Phoenix, AZ 85042' },
  { label: 'Find matching buyers', prompt: 'Which buyers in my CRM match the deal at 1847 Oak St?' },
  { label: 'Campaign performance', prompt: 'How is my Phoenix Cash Buyers campaign performing?' },
  { label: 'Deal strategy help', prompt: 'What\'s the best negotiation strategy for a distressed seller?' },
]

/* ── Suggested prompt chips ── */
const suggestedPrompts = [
  'What buyers should I match to my latest deal?',
  'Summarize my pipeline this week',
  'Draft a follow-up script for David R.',
  'What properties should I target in Phoenix?',
  'Compare my top 3 campaigns',
  'Estimate ARV for 2850 Maple Dr',
]

/* ── Mock conversation ── */
interface Message {
  id: number
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

const initialMessages: Message[] = [
  {
    id: 1,
    role: 'user',
    content: 'Which buyers in my CRM would be the best match for the property at 1847 Oak St, Phoenix?',
    timestamp: '10:32 AM',
  },
  {
    id: 2,
    role: 'assistant',
    content: `Great question! I've cross-referenced **1847 Oak St** (3BR/2BA SFR, ARV $285k, asking $189k) against your CRM and found **3 strong matches**:

**1. Marcus Thompson** (Score: 94/100)
- Buy box: Phoenix SFR, $150k-$300k, 3+ BR
- Cash buyer, verified POF ($2.1M)
- Closed 4 deals in the last 90 days
- *Last contacted: 2 days ago via AI call, interested in new deals*

**2. Rachel Kim** (Score: 87/100)
- Buy box: Phoenix/Scottsdale SFR, $175k-$350k
- Active investor, 12 properties in portfolio
- Prefers turnkey or light rehab
- *No contact in 14 days, consider a follow-up*

**3. David Rodriguez** (Score: 82/100)
- Buy box: Maricopa County, any type, under $250k
- Fix & flip investor, targets 25%+ ROI
- *Spoke with him 2 hours ago, expressed interest in new opportunities*

Would you like me to send deal sheets to any of these buyers, or draft a personalized message for each?`,
    timestamp: '10:32 AM',
  },
  {
    id: 3,
    role: 'user',
    content: 'Yes, draft a quick message for Marcus and David. Also, how is my Phoenix Cash Buyers campaign performing this week?',
    timestamp: '10:34 AM',
  },
  {
    id: 4,
    role: 'assistant',
    content: `Here are your personalized messages:

---

**For Marcus Thompson:**
> "Hey Marcus, I just locked up a property at 1847 Oak St in Phoenix. 3BR/2BA SFR, ARV around $285k, and I can assign it at $189k. Based on your buy box, this looks like a solid fit. Want me to send over the full breakdown? I can get you the comps and deal analysis within the hour."

**For David Rodriguez:**
> "David, great chatting with you earlier! I wanted to circle back with something that just came across my desk. 1847 Oak St, Phoenix. 3BR/2BA, ARV ~$285k, asking $189k. At that price point, you're looking at potential 30%+ ROI on a flip. Should I send over the Property Analyzer report?"

---

Now for your **Phoenix Cash Buyers - Cold Call** campaign this week:

| Metric | This Week | Last Week | Change |
|--------|-----------|-----------|--------|
| Calls Made | 342 | 289 | +18.3% |
| Connections | 67 | 52 | +28.8% |
| Response Rate | 18.4% | 14.2% | +4.2pp |
| Interested | 12 | 8 | +50% |
| Appointments Set | 4 | 2 | +100% |

The campaign is **outperforming last week across every metric**. The new AI script you updated on Monday seems to be driving the higher response rate. I'd recommend:

1. **Keep the current script running** since it's clearly resonating
2. **Increase daily call volume by 20%** while momentum is strong
3. **Prioritize callbacks** to the 12 interested leads before end of week

Want me to set up those callbacks as a new mini-campaign?`,
    timestamp: '10:34 AM',
  },
]

export default function DealFlowGPTPage() {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [contextOpen, setContextOpen] = useState(true)
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [likedIds, setLikedIds] = useState<Set<number>>(new Set())
  const [dislikedIds, setDislikedIds] = useState<Set<number>>(new Set())
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    if (!input.trim()) return
    const userMsg: Message = {
      id: messages.length + 1,
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsTyping(true)

    // Simulate AI response
    setTimeout(() => {
      const aiMsg: Message = {
        id: messages.length + 2,
        role: 'assistant',
        content: `I understand you're asking about "${input.trim().slice(0, 60)}${input.trim().length > 60 ? '...' : ''}". Let me pull the relevant data from your account.\n\nBased on your current pipeline, CRM data, and market conditions, here's what I recommend:\n\n1. **Review your active deals**: You have 12 deals in progress across Phoenix, Dallas, and Tampa\n2. **Check your highest-scoring buyers**: 23 buyers in your CRM match this criteria\n3. **Consider market timing**: Phoenix inventory is down 8% this month, which creates urgency\n\nWould you like me to dive deeper into any of these areas?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages(prev => [...prev, aiMsg])
      setIsTyping(false)
    }, 2000)
  }

  const handlePromptChip = (prompt: string) => {
    setInput(prompt)
    inputRef.current?.focus()
  }

  const handleCopy = (id: number, content: string) => {
    navigator.clipboard.writeText(content)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const toggleLike = (id: number) => {
    setLikedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else { next.add(id); setDislikedIds(p => { const n = new Set(p); n.delete(id); return n }) }
      return next
    })
  }

  const toggleDislike = (id: number) => {
    setDislikedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else { next.add(id); setLikedIds(p => { const n = new Set(p); n.delete(id); return n }) }
      return next
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex h-[calc(100vh-0px)] overflow-hidden">
      {/* ── Chat Area ── */}
      <div className={`flex flex-col transition-all duration-300 ${contextOpen ? 'flex-1' : 'w-full'}`}>
        {/* Chat Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB] bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#F3F4F6] flex items-center justify-center">
              <Bot className="w-5 h-5 text-[#6B7280]" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-[#111827]">
                DealFlow GPT
              </h1>
              <p className="text-sm text-[#9CA3AF]">AI assistant with full account context</p>
            </div>
            <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Online
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button className="text-xs text-[#374151] bg-white border border-[#D1D5DB] flex items-center gap-1 px-3 py-1.5 rounded-md hover:bg-[#F9FAFB] transition-colors">
              <RefreshCw className="w-3.5 h-3.5" />
              New Chat
            </button>
            <button
              onClick={() => setContextOpen(!contextOpen)}
              className="text-xs text-[#374151] bg-white border border-[#D1D5DB] flex items-center gap-1 px-3 py-1.5 rounded-md hover:bg-[#F9FAFB] transition-colors"
            >
              <Database className="w-3.5 h-3.5" />
              {contextOpen ? 'Hide' : 'Show'} Context
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 bg-[#FAFAFA]">
          {/* Welcome banner (only show if no messages) */}
          {messages.length === 0 && (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-[#F3F4F6] flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-[#6B7280]" />
              </div>
              <h2 className="text-2xl font-semibold text-[#111827] mb-2">
                How can I help your deals today?
              </h2>
              <p className="text-[#9CA3AF] max-w-md mx-auto">
                I have access to your CRM, deals, campaigns, and market data. Ask me anything about your business.
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-lg bg-[#F3F4F6] flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-[#6B7280]" />
                </div>
              )}
              <div className={`max-w-[75%] ${msg.role === 'user' ? 'order-first' : ''}`}>
                <div
                  className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#F3F4F6] text-[#374151] rounded-br-md'
                      : 'bg-white border border-[#E5E7EB] text-[#374151] rounded-bl-md'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-sm max-w-none prose-headings:text-[#111827] prose-strong:text-[#111827] prose-p:text-[#374151]">
                      {msg.content.split('\n').map((line, i) => {
                        // Bold headings
                        if (line.startsWith('**') && line.endsWith('**')) {
                          return <p key={i} className="font-semibold text-[#111827] mt-3 mb-1">{line.replace(/\*\*/g, '')}</p>
                        }
                        // Table rows
                        if (line.startsWith('|')) {
                          const cells = line.split('|').filter(Boolean).map(c => c.trim())
                          if (cells.every(c => c.match(/^-+$/))) return null
                          const isHeader = msg.content.split('\n')[i + 1]?.includes('---')
                          return (
                            <div key={i} className={`grid grid-cols-${cells.length} gap-2 py-1 text-xs ${isHeader ? 'font-semibold border-b border-[#E5E7EB]' : ''}`}
                              style={{ gridTemplateColumns: `repeat(${cells.length}, 1fr)` }}>
                              {cells.map((cell, j) => <span key={j}>{cell}</span>)}
                            </div>
                          )
                        }
                        // Blockquotes
                        if (line.startsWith('>')) {
                          return <blockquote key={i} className="border-l-3 border-[#E5E7EB] pl-3 py-1 my-2 text-[#6B7280] italic text-[13px]">{line.replace(/^>\s*/, '').replace(/"/g, '"').replace(/"/g, '"')}</blockquote>
                        }
                        // Numbered items
                        if (line.match(/^\d+\.\s/)) {
                          return <p key={i} className="ml-2 my-1">{line.replace(/\*\*(.*?)\*\*/g, '⟨$1⟩').split('⟨').map((part, pi) => {
                            if (part.includes('⟩')) {
                              const [bold, rest] = part.split('⟩')
                              return <span key={pi}><strong>{bold}</strong>{rest}</span>
                            }
                            return <span key={pi}>{part}</span>
                          })}</p>
                        }
                        // Horizontal rule
                        if (line.trim() === '---') return <hr key={i} className="my-3 border-[#E5E7EB]" />
                        // Bold inline
                        if (line.includes('**')) {
                          return <p key={i} className="my-1">{line.replace(/\*\*(.*?)\*\*/g, '⟨$1⟩').split('⟨').map((part, pi) => {
                            if (part.includes('⟩')) {
                              const [bold, rest] = part.split('⟩')
                              return <span key={pi}><strong>{bold}</strong>{rest}</span>
                            }
                            return <span key={pi}>{part}</span>
                          })}</p>
                        }
                        // Empty line
                        if (line.trim() === '') return <div key={i} className="h-2" />
                        // Regular line
                        return <p key={i} className="my-1">{line}</p>
                      })}
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
                {/* Message actions */}
                <div className={`flex items-center gap-1 mt-1.5 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                  <span className="text-[10px] text-[#9CA3AF] mr-2">{msg.timestamp}</span>
                  {msg.role === 'assistant' && (
                    <>
                      <button
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="p-1 rounded hover:bg-[#F3F4F6] transition-colors"
                        title="Copy"
                      >
                        {copiedId === msg.id ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-[#9CA3AF] hover:text-[#374151]" />
                        )}
                      </button>
                      <button
                        onClick={() => toggleLike(msg.id)}
                        className="p-1 rounded hover:bg-[#F3F4F6] transition-colors"
                        title="Helpful"
                      >
                        <ThumbsUp className={`w-3.5 h-3.5 ${likedIds.has(msg.id) ? 'text-[#4F46E5] fill-[#4F46E5]' : 'text-[#9CA3AF] hover:text-[#374151]'}`} />
                      </button>
                      <button
                        onClick={() => toggleDislike(msg.id)}
                        className="p-1 rounded hover:bg-[#F3F4F6] transition-colors"
                        title="Not helpful"
                      >
                        <ThumbsDown className={`w-3.5 h-3.5 ${dislikedIds.has(msg.id) ? 'text-red-500 fill-red-500' : 'text-[#9CA3AF] hover:text-[#374151]'}`} />
                      </button>
                    </>
                  )}
                </div>
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-lg bg-[#F3F4F6] flex items-center justify-center flex-shrink-0 mt-1">
                  <User className="w-4 h-4 text-[#6B7280]" />
                </div>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping ? (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#F3F4F6] flex items-center justify-center flex-shrink-0 mt-1">
                <Bot className="w-4 h-4 text-[#6B7280]" />
              </div>
              <div className="bg-white border border-[#E5E7EB] rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-[#9CA3AF] animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-[#9CA3AF] animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-[#9CA3AF] animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          ) : messages.length > 0 && messages[messages.length - 1].role === 'assistant' && (
            <div className="flex items-center gap-2 pl-11 pt-1">
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-[#D1D5DB] animate-pulse" />
                <div className="w-1.5 h-1.5 rounded-full bg-[#D1D5DB] animate-pulse" style={{ animationDelay: '300ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-[#D1D5DB] animate-pulse" style={{ animationDelay: '600ms' }} />
              </div>
              <span className="text-[10px] text-[#9CA3AF]">DealFlow GPT is ready</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested prompts */}
        {messages.length <= 4 && (
          <div className="px-6 py-3 bg-[#FAFAFA] border-t border-[#E5E7EB]">
            <div className="flex flex-wrap gap-2">
              {suggestedPrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handlePromptChip(prompt)}
                  className="text-xs px-3 py-1.5 rounded-full border border-[#E5E7EB] bg-white text-[#374151] hover:bg-[#F9FAFB] transition-all"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input area */}
        <div className="px-6 py-4 border-t border-[#E5E7EB] bg-white">
          <div className="flex items-end gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask DealFlow GPT anything about your deals, buyers, campaigns..."
                rows={1}
                className="w-full resize-none rounded-xl border border-[#E5E7EB] px-4 py-3 pr-12 text-sm text-[#374151] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent"
                style={{ minHeight: '44px', maxHeight: '120px' }}
              />
              <div className="absolute right-2 bottom-2 flex items-center gap-1">
                <span className="text-[10px] text-[#9CA3AF] mr-1">⏎ Send</span>
              </div>
            </div>
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className={`w-10 h-10 rounded-md flex items-center justify-center transition-all ${
                input.trim() && !isTyping
                  ? 'bg-[#4F46E5] hover:bg-[#4338CA] text-white'
                  : 'bg-[#F3F4F6] text-[#9CA3AF] cursor-not-allowed'
              }`}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[10px] text-[#9CA3AF] mt-2 text-center">
            DealFlow GPT has access to your account data. Responses are AI-generated and should be verified.
          </p>
        </div>
      </div>

      {/* ── Context Sidebar ── */}
      {contextOpen && (
        <div className="w-[320px] border-l border-[#E5E7EB] bg-white flex flex-col overflow-y-auto">
          {/* Connected Data */}
          <div className="px-5 py-4 border-b border-[#E5E7EB]">
            <h3 className="text-xs font-medium text-[#6B7280] uppercase tracking-[0.05em] mb-3 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-[#6B7280]" />
              Connected Data
            </h3>
            <div className="space-y-2">
              {dataSources.map((src, i) => (
                <div key={i} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2">
                    <src.icon className="w-4 h-4 text-[#6B7280]" />
                    <span className="text-sm text-[#374151]">{src.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-[#6B7280]">{src.count}</span>
                    <span className="w-2 h-2 rounded-full bg-green-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Account Overview */}
          <div className="px-5 py-4 border-b border-[#E5E7EB]">
            <h3 className="text-xs font-medium text-[#6B7280] uppercase tracking-[0.05em] mb-3 flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-[#6B7280]" />
              Account Overview
            </h3>
            <div className="space-y-2.5">
              {accountStats.map((stat, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-xs text-[#9CA3AF]">{stat.label}</span>
                  <span className="text-xs font-medium text-[#374151]">{stat.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="px-5 py-4 border-b border-[#E5E7EB]">
            <h3 className="text-xs font-medium text-[#6B7280] uppercase tracking-[0.05em] mb-3 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#6B7280]" />
              Recent Activity
            </h3>
            <div className="space-y-3">
              {recentActivity.map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#9CA3AF] mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-[#374151] leading-snug">{item.text}</p>
                    <p className="text-[10px] text-[#9CA3AF] mt-0.5">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="px-5 py-4 border-b border-[#E5E7EB]">
            <h3 className="text-xs font-medium text-[#6B7280] uppercase tracking-[0.05em] mb-3 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-[#6B7280]" />
              Quick Actions
            </h3>
            <div className="space-y-2">
              {quickActions.map((action, i) => (
                <button
                  key={i}
                  onClick={() => handlePromptChip(action.prompt)}
                  className="w-full text-left flex items-center justify-between px-3 py-2 rounded-lg border border-[#E5E7EB] bg-white hover:bg-[#F9FAFB] transition-all group"
                >
                  <span className="text-xs text-[#374151]">{action.label}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#9CA3AF] group-hover:text-[#374151]" />
                </button>
              ))}
            </div>
          </div>

          {/* GPT Info */}
          <div className="px-5 py-4">
            <div className="bg-white rounded-lg p-4 border border-[#E5E7EB]">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-[#9CA3AF]" />
                <span className="text-xs font-medium text-[#9CA3AF]">Powered by AI</span>
              </div>
              <p className="text-[11px] text-[#9CA3AF] leading-relaxed">
                DealFlow GPT analyzes your CRM, deals, campaigns, and market data in real-time to provide personalized recommendations and automate your workflow.
              </p>
              <div className="flex items-center gap-3 mt-3">
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-[#9CA3AF]" />
                  <span className="text-[10px] text-[#9CA3AF]">HIPAA-ready</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-[#9CA3AF]" />
                  <span className="text-[10px] text-[#9CA3AF]">SOC 2</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-[#9CA3AF]" />
                  <span className="text-[10px] text-[#9CA3AF]">Encrypted</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 1024px) {
          .w-\\[320px\\] { width: 280px; }
        }
        @media (max-width: 768px) {
          .w-\\[320px\\] { display: none; }
        }
      `}</style>
    </div>
  )
}
