'use client'

import { useState } from 'react'
import {
  Heart,
  MessageCircle,
  Image as ImageIcon,
  Send,
  Users,
  Megaphone,
  Inbox,
  Rss,
  Check,
  ExternalLink,
  Search,
} from 'lucide-react'

/* ═══════════════════════════════════════════════
   SUB-SECTION TABS
   ═══════════════════════════════════════════════ */
const tabs = [
  { key: 'feed', label: 'Feed', icon: Rss },
  { key: 'groups', label: 'Groups', icon: Users },
  { key: 'news', label: 'News & Announcements', icon: Megaphone },
  { key: 'inbox', label: 'Inbox', icon: Inbox },
] as const

type Tab = (typeof tabs)[number]['key']

/* ═══════════════════════════════════════════════
   MOCK DATA:FEED
   ═══════════════════════════════════════════════ */
const feedPosts = [
  {
    id: 1,
    name: 'Marcus Thompson',
    initials: 'MT',
    color: 'from-blue-500 to-blue-600',
    time: '2 hours ago',
    text: 'Just closed my first deal in Phoenix using AI outreach. 47 calls, 8 interested buyers, contract signed in 3 days. This platform is unreal.',
    likes: 42,
    comments: 11,
    liked: false,
  },
  {
    id: 2,
    name: 'Jessica Rivera',
    initials: 'JR',
    color: 'from-violet-500 to-purple-600',
    time: '4 hours ago',
    text: 'Anyone working Tampa right now? Seeing a lot of inventory in 33610. Would love to connect with someone who has buyers in that zip.',
    likes: 18,
    comments: 7,
    liked: true,
  },
  {
    id: 3,
    name: 'David Chen',
    initials: 'DC',
    color: 'from-emerald-500 to-teal-600',
    time: '6 hours ago',
    text: 'Pro tip: run your AI campaigns Tuesday through Thursday mornings. My connect rates jumped 40%. Weekends and Mondays are dead for cold outreach.',
    likes: 97,
    comments: 23,
    liked: false,
  },
  {
    id: 4,
    name: 'Aisha Williams',
    initials: 'AW',
    color: 'from-amber-500 to-orange-600',
    time: '8 hours ago',
    text: 'Closed a $32k assignment fee on a duplex in Dallas. Found the buyer through Discovery in under 20 minutes. Shoutout to the DFW Wholesalers group for the comps help!',
    likes: 134,
    comments: 31,
    liked: false,
  },
  {
    id: 5,
    name: 'Ryan Mitchell',
    initials: 'RM',
    color: 'from-rose-500 to-pink-600',
    time: '12 hours ago',
    text: 'Just uploaded 4 new land deals in Georgia. Looking for builders and developers. Check them out on the Marketplace if you have buyers in the Athens/Augusta area.',
    likes: 26,
    comments: 9,
    liked: false,
  },
  {
    id: 6,
    name: 'Carlos Medina',
    initials: 'CM',
    color: 'from-cyan-500 to-blue-600',
    time: '1 day ago',
    text: 'Question for the experienced wholesalers: what\'s your average time from first AI call to signed contract? I\'m sitting at about 11 days and wondering if that\'s competitive.',
    likes: 53,
    comments: 19,
    liked: true,
  },
]

/* ═══════════════════════════════════════════════
   MOCK DATA:GROUPS
   ═══════════════════════════════════════════════ */
const groups = [
  { id: 1, name: 'Dallas/Fort Worth Wholesalers', members: 1247, desc: 'Connect with wholesalers in the DFW metroplex. Share deals, comps, and buyer contacts.', joined: true, color: 'from-blue-500 to-blue-600' },
  { id: 2, name: 'Land Deals Only', members: 389, desc: 'Vacant land flips, subdivisions, and rural acreage. Builders and developers welcome.', joined: false, color: 'from-emerald-500 to-teal-600' },
  { id: 3, name: 'New Wholesalers: Getting Started', members: 2104, desc: 'Ask questions, learn the basics, and get mentorship from experienced wholesalers.', joined: true, color: 'from-violet-500 to-purple-600' },
  { id: 4, name: 'Virtual Wholesale Strategies', members: 756, desc: 'Wholesale deals in markets you don\'t live in. Tools, tips, and virtual closing strategies.', joined: false, color: 'from-amber-500 to-orange-600' },
  { id: 5, name: 'Multifamily & Commercial', members: 412, desc: 'Apartment buildings, retail, and commercial property wholesale deals and strategies.', joined: false, color: 'from-rose-500 to-pink-600' },
  { id: 6, name: 'Marketing & Lead Gen', members: 923, desc: 'SEO, PPC, direct mail, cold calling scripts, and lead generation strategies.', joined: true, color: 'from-cyan-500 to-blue-600' },
]

/* ═══════════════════════════════════════════════
   MOCK DATA:NEWS
   ═══════════════════════════════════════════════ */
const newsItems = [
  {
    id: 1,
    title: 'New: AI Outreach now supports email campaigns',
    date: 'Mar 12, 2026',
    source: 'DealFlow AI',
    preview: 'You can now create AI-powered email sequences alongside voice and SMS campaigns. Set up drip campaigns with personalized messaging based on buyer profiles.',
  },
  {
    id: 2,
    title: 'Fed holds rates steady, investor activity expected to rise',
    date: 'Mar 11, 2026',
    source: 'Industry',
    preview: 'The Federal Reserve held interest rates unchanged at their March meeting, signaling a potential cut later this year. Analysts expect increased investor activity in residential markets.',
  },
  {
    id: 3,
    title: 'Contract templates now available for Florida and Georgia',
    date: 'Mar 10, 2026',
    source: 'DealFlow AI',
    preview: 'State-specific assignment contract templates are now live for FL and GA. Auto-fill from your deal data and send for e-signature directly from the Contracts tab.',
  },
  {
    id: 4,
    title: 'Wholesale volume up 12% in Q1 across Sun Belt markets',
    date: 'Mar 8, 2026',
    source: 'Industry',
    preview: 'New data shows wholesale transaction volume increased 12% year-over-year in Sun Belt markets, led by Phoenix, Dallas, and Atlanta. Average assignment fees rose to $18,400.',
  },
  {
    id: 5,
    title: 'DealFlow GPT now available in beta',
    date: 'Mar 6, 2026',
    source: 'DealFlow AI',
    preview: 'Our AI assistant can now access your CRM, deals, and campaign data to help with deal analysis, buyer recommendations, and strategy coaching. Available to Pro and Enterprise users.',
  },
]

/* ═══════════════════════════════════════════════
   MOCK DATA:INBOX
   ═══════════════════════════════════════════════ */
const conversations = [
  {
    id: 1,
    name: 'Kevin Nguyen',
    initials: 'KN',
    color: 'from-blue-500 to-blue-600',
    lastMessage: 'I can do $285k cash, close in 14 days. Send me the contract.',
    time: '10 min ago',
    unread: true,
    messages: [
      { from: 'them', text: 'Hey, I saw your listing on the Marketplace for the property on Elm Ave. Is it still available?', time: '2:15 PM' },
      { from: 'me', text: 'Yes, still available! ARV is around $340k and I have it under contract at $260k. Assignment fee is $25k.', time: '2:18 PM' },
      { from: 'them', text: 'That ARV seems right based on the comps I\'m seeing. What\'s the rehab estimate?', time: '2:22 PM' },
      { from: 'me', text: 'Roughly $45-50k. Needs kitchen, bathrooms, flooring, and some exterior work. Roof is good though, replaced in 2021.', time: '2:25 PM' },
      { from: 'them', text: 'I can do $285k cash, close in 14 days. Send me the contract.', time: '2:31 PM' },
    ],
  },
  {
    id: 2,
    name: 'Sarah Kim',
    initials: 'SK',
    color: 'from-violet-500 to-purple-600',
    lastMessage: 'Let\'s JV on that Atlanta portfolio. I have the buyers.',
    time: '1 hr ago',
    unread: true,
    messages: [
      { from: 'them', text: 'Hey! I noticed you\'re active in the Atlanta market. I have a strong buyer list for that area.', time: '1:02 PM' },
      { from: 'me', text: 'Nice, I actually have 3 SFRs I\'m trying to move in the Decatur/East Atlanta area. Interested in a JV?', time: '1:10 PM' },
      { from: 'them', text: 'Absolutely. What kind of split are you thinking?', time: '1:14 PM' },
      { from: 'me', text: '50/50 on the assignment fee? I bring the deals, you bring the buyers. I can share the property details if you\'re in.', time: '1:18 PM' },
      { from: 'them', text: 'Let\'s JV on that Atlanta portfolio. I have the buyers.', time: '1:22 PM' },
    ],
  },
  {
    id: 3,
    name: 'Marcus Thompson',
    initials: 'MT',
    color: 'from-emerald-500 to-teal-600',
    lastMessage: 'Thanks for the tip on the AI campaigns! Connect rates are way up.',
    time: '3 hrs ago',
    unread: false,
    messages: [
      { from: 'me', text: 'Hey Marcus, saw your post about Phoenix. What script are you using for AI outreach?', time: '10:05 AM' },
      { from: 'them', text: 'I keep it simple: intro, mention the property type they usually buy, and ask if they\'re actively looking. Works way better than a long pitch.', time: '10:12 AM' },
      { from: 'me', text: 'Smart. I\'ve been overcomplicating mine. Going to trim it down.', time: '10:15 AM' },
      { from: 'them', text: 'Thanks for the tip on the AI campaigns! Connect rates are way up.', time: '10:20 AM' },
    ],
  },
  {
    id: 4,
    name: 'Lisa Park',
    initials: 'LP',
    color: 'from-amber-500 to-orange-600',
    lastMessage: 'Can you send me the address? I\'ll run comps on my end.',
    time: 'Yesterday',
    unread: false,
    messages: [
      { from: 'them', text: 'Hi! I\'m looking for SFRs in the $150-250k range in Houston. Do you have anything?', time: 'Yesterday' },
      { from: 'me', text: 'I might have one coming. 3/2 in Spring Branch, needs about $30k rehab. Should be under contract by Friday.', time: 'Yesterday' },
      { from: 'them', text: 'Can you send me the address? I\'ll run comps on my end.', time: 'Yesterday' },
    ],
  },
]

/* ═══════════════════════════════════════════════
   AVATAR COMPONENT
   ═══════════════════════════════════════════════ */
function Avatar({ initials, size = 36 }: { initials: string; color?: string; size?: number }) {
  return (
    <div
      className="rounded-full bg-[#F3F4F6] flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size }}
    >
      <span className="text-[#6B7280] font-medium" style={{ fontSize: size * 0.33 }}>
        {initials}
      </span>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   FEED SECTION
   ═══════════════════════════════════════════════ */
function FeedSection() {
  const [likedPosts, setLikedPosts] = useState<Set<number>>(new Set(feedPosts.filter(p => p.liked).map(p => p.id)))

  function toggleLike(id: number) {
    setLikedPosts(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="max-w-[680px]">
      {/* Create post */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg px-5 py-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#F3F4F6] flex items-center justify-center flex-shrink-0">
            <span className="text-[0.6rem] font-medium text-[#6B7280]">You</span>
          </div>
          <div className="flex-1">
            <input
              type="text"
              placeholder="Share something with the community..."
              className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg px-4 py-2.5 text-[0.84rem] text-[#374151] placeholder-[#9CA3AF] outline-none focus:border-[#A5B4FC] focus:bg-white transition-colors"
            />
          </div>
          <button className="flex items-center gap-1.5 text-[#9CA3AF] hover:text-[#6B7280] cursor-pointer bg-transparent border-0 transition-colors">
            <ImageIcon className="w-4 h-4" />
          </button>
          <button className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white border-0 rounded-md px-4 py-2 text-[0.8rem] font-medium cursor-pointer transition-colors flex items-center gap-1.5">
            <Send className="w-3.5 h-3.5" />
            Post
          </button>
        </div>
      </div>

      {/* Posts */}
      <div className="space-y-3">
        {feedPosts.map(post => {
          const isLiked = likedPosts.has(post.id)
          const likeCount = post.likes + (isLiked && !post.liked ? 1 : !isLiked && post.liked ? -1 : 0)

          return (
            <div
              key={post.id}
              className={`border border-[#E5E7EB] rounded-lg px-5 py-4 hover:bg-[#F9FAFB] transition-colors ${
                post.id === 1 ? 'bg-[#F9FAFB]' : 'bg-white'
              }`}
            >
              {/* Post header */}
              <div className="flex items-center gap-3 mb-3">
                <Avatar initials={post.initials} size={36} />
                <div className="flex-1 min-w-0">
                  <div className="text-[0.84rem] font-medium text-[#111827]">{post.name}</div>
                  <div className="text-sm text-[#9CA3AF]">{post.time}</div>
                </div>
              </div>

              {/* Post text */}
              <p className="text-[0.84rem] text-[#374151] leading-relaxed mb-3.5">{post.text}</p>

              {/* Post actions */}
              <div className="flex items-center gap-5 pt-2 border-t border-[#E5E7EB]">
                <button
                  onClick={() => toggleLike(post.id)}
                  className={`flex items-center gap-1.5 text-[0.78rem] cursor-pointer bg-transparent border-0 transition-colors ${
                    isLiked ? 'text-rose-500' : 'text-[#9CA3AF] hover:text-rose-500'
                  }`}
                >
                  <Heart className="w-4 h-4" fill={isLiked ? 'currentColor' : 'none'} />
                  {likeCount}
                </button>
                <button className="flex items-center gap-1.5 text-[0.78rem] text-[#9CA3AF] hover:text-[#2563EB] cursor-pointer bg-transparent border-0 transition-colors">
                  <MessageCircle className="w-4 h-4" />
                  {post.comments}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   GROUPS SECTION
   ═══════════════════════════════════════════════ */
function GroupsSection() {
  const [joinedGroups, setJoinedGroups] = useState<Set<number>>(new Set(groups.filter(g => g.joined).map(g => g.id)))

  function toggleJoin(id: number) {
    setJoinedGroups(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div>
      {/* Search */}
      <div className="mb-5 max-w-[400px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
          <input
            type="text"
            placeholder="Search groups..."
            className="w-full bg-white border border-[#E5E7EB] rounded-lg pl-10 pr-4 py-2.5 text-[0.84rem] text-[#374151] placeholder-[#9CA3AF] outline-none focus:border-[#A5B4FC] transition-colors"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-4 community-groups">
        {groups.map(g => {
          const isJoined = joinedGroups.has(g.id)
          return (
            <div key={g.id} className="bg-white border border-[#E5E7EB] rounded-lg px-5 py-5 flex flex-col hover:bg-[#F9FAFB] transition-colors">
              <div className="flex items-start gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-lg bg-[#F3F4F6] flex items-center justify-center flex-shrink-0"
                >
                  <Users className="text-[#6B7280]" style={{ width: 18, height: 18 }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[0.88rem] font-medium text-[#111827] mb-0.5">{g.name}</div>
                  <div className="text-sm text-[#9CA3AF]">{g.members.toLocaleString()} members</div>
                </div>
              </div>
              <p className="text-[0.78rem] text-[#374151] leading-relaxed mb-4 flex-1">{g.desc}</p>
              <button
                onClick={() => toggleJoin(g.id)}
                className={`w-full py-2 rounded-md text-[0.8rem] font-medium cursor-pointer transition-all border ${
                  isJoined
                    ? 'bg-white border-[#D1D5DB] text-[#374151] hover:border-[#9CA3AF]'
                    : 'bg-[#2563EB] border-[#2563EB] text-white hover:bg-[#1D4ED8]'
                }`}
              >
                {isJoined ? (
                  <span className="flex items-center justify-center gap-1.5">
                    <Check className="w-3.5 h-3.5" />
                    Joined
                  </span>
                ) : (
                  'Join Group'
                )}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   NEWS SECTION
   ═══════════════════════════════════════════════ */
function NewsSection() {
  return (
    <div className="max-w-[780px] space-y-3">
      {newsItems.map(item => (
        <div
          key={item.id}
          className="bg-white border border-[#E5E7EB] rounded-lg px-5 py-4 hover:bg-[#F9FAFB] transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-2.5 mb-2">
            <span
              className={`text-[0.66rem] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                item.source === 'DealFlow AI'
                  ? 'text-[#1D4ED8] bg-[#EFF6FF]'
                  : 'text-amber-700 bg-amber-50'
              }`}
            >
              {item.source}
            </span>
            <span className="text-sm text-[#9CA3AF]">{item.date}</span>
          </div>
          <h3 className="text-[0.9rem] font-medium text-[#111827] mb-1.5 group-hover:text-[#2563EB] transition-colors flex items-center gap-1.5">
            {item.title}
            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </h3>
          <p className="text-[0.8rem] text-[#374151] leading-relaxed">{item.preview}</p>
        </div>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════
   INBOX SECTION
   ═══════════════════════════════════════════════ */
function InboxSection() {
  const [activeConvo, setActiveConvo] = useState(conversations[0].id)
  const active = conversations.find(c => c.id === activeConvo) ?? conversations[0]

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden flex community-inbox" style={{ height: 520 }}>
      {/* Conversation list */}
      <div className="w-[320px] border-r border-[#E5E7EB] flex flex-col flex-shrink-0 community-inbox-list">
        <div className="px-4 py-3 border-b border-[#E5E7EB]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9CA3AF]" />
            <input
              type="text"
              placeholder="Search messages..."
              className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg pl-9 pr-3 py-2 text-[0.8rem] text-[#374151] placeholder-[#9CA3AF] outline-none focus:border-[#A5B4FC] focus:bg-white transition-colors"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.map(c => (
            <button
              key={c.id}
              onClick={() => setActiveConvo(c.id)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 cursor-pointer border-0 text-left transition-colors ${
                activeConvo === c.id ? 'bg-[#EFF6FF]' : 'bg-white hover:bg-[#F9FAFB]'
              }`}
            >
              <div className="relative flex-shrink-0">
                <Avatar initials={c.initials} size={38} />
                {c.unread && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-[#2563EB] rounded-full border-2 border-white" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className={`text-[0.82rem] ${c.unread ? 'font-semibold text-[#111827]' : 'font-medium text-[#374151]'}`}>
                    {c.name}
                  </span>
                  <span className="text-sm text-[#9CA3AF] flex-shrink-0">{c.time}</span>
                </div>
                <p className={`text-[0.76rem] truncate ${c.unread ? 'text-[#374151]' : 'text-[#9CA3AF]'}`}>
                  {c.lastMessage}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Active conversation */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-[#E5E7EB]">
          <Avatar initials={active.initials} size={32} />
          <span className="text-[0.88rem] font-medium text-[#111827]">{active.name}</span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {active.messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.from === 'me' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${
                  msg.from === 'me'
                    ? 'bg-[#2563EB] text-white rounded-br-md'
                    : 'bg-[#F3F4F6] text-[#111827] rounded-bl-md'
                }`}
              >
                <p className="text-[0.82rem] leading-relaxed">{msg.text}</p>
                <p className={`text-[0.66rem] mt-1 ${msg.from === 'me' ? 'text-[#BFDBFE]' : 'text-[#9CA3AF]'}`}>
                  {msg.time}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-[#E5E7EB]">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Type a message..."
              className="flex-1 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg px-4 py-2.5 text-[0.82rem] text-[#374151] placeholder-[#9CA3AF] outline-none focus:border-[#A5B4FC] focus:bg-white transition-colors"
            />
            <button className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white border-0 rounded-md p-2.5 cursor-pointer transition-colors flex items-center justify-center">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   MAIN COMMUNITY PAGE
   ═══════════════════════════════════════════════ */
export default function CommunityPage() {
  const [activeTab, setActiveTab] = useState<Tab>('feed')

  return (
    <div className="p-8 max-w-[1200px] bg-[var(--cream,#FAF9F6)] ">
      {/* Header */}
      <div className="mb-6">
        <h1 style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
          className="text-[1.5rem] font-normal text-[var(--navy-heading,#0B1224)] tracking-[-0.022em] mb-1"
        >
          Community
        </h1>
        <p className="text-[0.86rem] text-[var(--body-text,#4B5563)]">
          Connect with wholesalers, share strategies, and stay updated.
        </p>
      </div>

      {/* Sub-section tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-[#E5E7EB] pb-0">
        {tabs.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-[0.82rem] font-medium cursor-pointer bg-transparent border-0 border-b-2 -mb-[1px] transition-colors ${
                isActive
                  ? 'border-b-[#2563EB] text-[#2563EB]'
                  : 'border-transparent text-[#9CA3AF] hover:text-[#6B7280]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.key === 'inbox' && (
                <span className="bg-[#2563EB] text-white text-[0.62rem] font-semibold w-4.5 h-4.5 rounded-full flex items-center justify-center" style={{ width: 18, height: 18 }}>
                  2
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Content */}
      {activeTab === 'feed' && <FeedSection />}
      {activeTab === 'groups' && <GroupsSection />}
      {activeTab === 'news' && <NewsSection />}
      {activeTab === 'inbox' && <InboxSection />}

      <style>{`
        @media (max-width: 900px) {
          .community-groups { grid-template-columns: 1fr !important; }
          .community-inbox { flex-direction: column !important; height: auto !important; }
          .community-inbox-list { width: 100% !important; max-height: 250px; border-right: none !important; border-bottom: 1px solid #E5E7EB; }
        }
      `}</style>
    </div>
  )
}
