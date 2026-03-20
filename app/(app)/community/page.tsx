'use client'

import { useState } from 'react'
import { useToast } from '@/components/toast'
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

const FONT_FAMILY = "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"

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
    color: 'from-blue-500 to-cyan-600',
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
    text: 'Closed a $32k assignment fee on a duplex in Dallas. Found the buyer through Find Buyers in under 20 minutes. Shoutout to the DFW Wholesalers group for the comps help!',
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
  { id: 2, name: 'Land Deals Only', members: 389, desc: 'Vacant land flips, subdivisions, and rural acreage. Builders and developers welcome.', joined: false, color: 'from-blue-500 to-cyan-600' },
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
    title: 'New: Outreach now supports email campaigns',
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
    title: 'Ask AI now available in beta',
    date: 'Mar 6, 2026',
    source: 'DealFlow AI',
    preview: 'Our AI assistant can now access your Buyer List, deals, and campaign data to help with deal analysis, buyer recommendations, and strategy coaching. Available to Pro and Enterprise users.',
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
    color: 'from-blue-500 to-cyan-600',
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
function Avatar({ initials, size = 32 }: { initials: string; color?: string; size?: number }) {
  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size, backgroundColor: '#0B1224' }}
    >
      <span style={{ fontSize: size * 0.38, fontWeight: 600, color: '#FFFFFF', fontFamily: FONT_FAMILY }}>
        {initials}
      </span>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   FEED SECTION
   ═══════════════════════════════════════════════ */
function FeedSection() {
  const toast = useToast()
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
      <div
        className="bg-white px-5 py-4 mb-4"
        style={{ border: '1px solid rgba(5,14,36,0.08)', borderRadius: 12 }}
      >
        <div className="flex items-center gap-3">
          <div
            className="rounded-full flex items-center justify-center flex-shrink-0"
            style={{ width: 32, height: 32, backgroundColor: '#0B1224' }}
          >
            <span style={{ fontSize: 12, fontWeight: 600, color: '#FFFFFF', fontFamily: FONT_FAMILY }}>You</span>
          </div>
          <div className="flex-1">
            <input
              type="text"
              placeholder="Share something with the community..."
              className="w-full outline-none transition-colors"
              style={{
                backgroundColor: '#F9FAFB',
                border: '1px solid rgba(5,14,36,0.08)',
                borderRadius: 10,
                padding: '10px 16px',
                fontSize: 14,
                fontWeight: 400,
                color: 'rgba(5,14,36,0.65)',
                fontFamily: FONT_FAMILY,
              }}
            />
          </div>
          <button onClick={() => toast('Coming soon')} className="flex items-center gap-1.5 cursor-pointer bg-transparent border-0 transition-colors" style={{ color: 'rgba(5,14,36,0.4)' }}>
            <ImageIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => toast('Coming soon')}
            className="text-white border-0 cursor-pointer transition-colors flex items-center gap-1.5"
            style={{
              backgroundColor: '#2563EB',
              borderRadius: 10,
              padding: '8px 16px',
              fontSize: 14,
              fontWeight: 600,
              fontFamily: FONT_FAMILY,
            }}
          >
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
              className="bg-white transition-all"
              style={{
                border: '1px solid rgba(5,14,36,0.08)',
                borderRadius: 12,
                padding: '16px 20px',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(5,14,36,0.06)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
            >
              {/* Post header */}
              <div className="flex items-center gap-3 mb-3">
                <Avatar initials={post.initials} size={32} />
                <div className="flex-1 min-w-0">
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#0B1224', fontFamily: FONT_FAMILY }}>{post.name}</div>
                  <div style={{ fontSize: 12, fontWeight: 400, color: 'rgba(5,14,36,0.4)', fontFamily: FONT_FAMILY }}>{post.time}</div>
                </div>
              </div>

              {/* Post text */}
              <p className="leading-relaxed mb-3.5" style={{ fontSize: 14, fontWeight: 400, color: 'rgba(5,14,36,0.65)', fontFamily: FONT_FAMILY }}>{post.text}</p>

              {/* Post actions */}
              <div className="flex items-center gap-5 pt-2" style={{ borderTop: '1px solid rgba(5,14,36,0.08)' }}>
                <button
                  onClick={() => toggleLike(post.id)}
                  className={`flex items-center gap-1.5 cursor-pointer bg-transparent border-0 transition-colors ${
                    isLiked ? 'text-rose-500' : 'hover:text-rose-500'
                  }`}
                  style={{ fontSize: 12, fontWeight: 400, color: isLiked ? undefined : 'rgba(5,14,36,0.4)', fontFamily: FONT_FAMILY }}
                >
                  <Heart className="w-4 h-4" fill={isLiked ? 'currentColor' : 'none'} />
                  {likeCount}
                </button>
                <button
                  onClick={() => toast('Coming soon')}
                  className="flex items-center gap-1.5 cursor-pointer bg-transparent border-0 transition-colors"
                  style={{ fontSize: 12, fontWeight: 400, color: 'rgba(5,14,36,0.4)', fontFamily: FONT_FAMILY }}
                >
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(5,14,36,0.4)' }} />
          <input
            type="text"
            placeholder="Search groups..."
            className="w-full outline-none transition-colors"
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid rgba(5,14,36,0.08)',
              borderRadius: 10,
              paddingLeft: 40,
              paddingRight: 16,
              paddingTop: 10,
              paddingBottom: 10,
              fontSize: 14,
              fontWeight: 400,
              color: 'rgba(5,14,36,0.65)',
              fontFamily: FONT_FAMILY,
            }}
          />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-4 community-groups">
        {groups.map(g => {
          const isJoined = joinedGroups.has(g.id)
          return (
            <div
              key={g.id}
              className="bg-white flex flex-col transition-all"
              style={{
                border: '1px solid rgba(5,14,36,0.08)',
                borderRadius: 12,
                padding: '20px',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(5,14,36,0.06)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
            >
              <div className="flex items-start gap-3 mb-3">
                <div
                  className="flex items-center justify-center flex-shrink-0"
                  style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(37,99,235,0.08)' }}
                >
                  <Users style={{ width: 18, height: 18, color: '#2563EB' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#0B1224', fontFamily: FONT_FAMILY, marginBottom: 2 }}>{g.name}</div>
                  <div style={{ fontSize: 12, fontWeight: 400, color: 'rgba(5,14,36,0.4)', fontFamily: FONT_FAMILY }}>{g.members.toLocaleString()} members</div>
                </div>
              </div>
              <p className="leading-relaxed mb-4 flex-1" style={{ fontSize: 14, fontWeight: 400, color: 'rgba(5,14,36,0.65)', fontFamily: FONT_FAMILY }}>{g.desc}</p>
              <button
                onClick={() => toggleJoin(g.id)}
                className="w-full cursor-pointer transition-all"
                style={{
                  padding: '8px 0',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: FONT_FAMILY,
                  backgroundColor: isJoined ? '#FFFFFF' : '#2563EB',
                  border: isJoined ? '1px solid rgba(5,14,36,0.08)' : '1px solid #2563EB',
                  color: isJoined ? 'rgba(5,14,36,0.65)' : '#FFFFFF',
                }}
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
          className="bg-white cursor-pointer group transition-all"
          style={{
            border: '1px solid rgba(5,14,36,0.08)',
            borderRadius: 12,
            padding: '16px 20px',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(5,14,36,0.06)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
        >
          <div className="flex items-center gap-2.5 mb-2">
            <span
              className="uppercase tracking-wide px-2 py-0.5 rounded-full"
              style={{
                fontSize: 11,
                fontWeight: 600,
                fontFamily: FONT_FAMILY,
                color: item.source === 'DealFlow AI' ? '#2563EB' : '#92400E',
                backgroundColor: item.source === 'DealFlow AI' ? 'rgba(37,99,235,0.08)' : 'rgba(245,158,11,0.08)',
              }}
            >
              {item.source}
            </span>
            <span style={{ fontSize: 12, fontWeight: 400, color: 'rgba(5,14,36,0.4)', fontFamily: FONT_FAMILY }}>{item.date}</span>
          </div>
          <h3 className="mb-1.5 group-hover:text-[#2563EB] transition-colors flex items-center gap-1.5" style={{ fontSize: 15, fontWeight: 600, color: '#0B1224', fontFamily: FONT_FAMILY }}>
            {item.title}
            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </h3>
          <p className="leading-relaxed" style={{ fontSize: 14, fontWeight: 400, color: 'rgba(5,14,36,0.65)', fontFamily: FONT_FAMILY }}>{item.preview}</p>
        </div>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════
   INBOX SECTION
   ═══════════════════════════════════════════════ */
function InboxSection() {
  const toast = useToast()
  const [activeConvo, setActiveConvo] = useState(conversations[0].id)
  const active = conversations.find(c => c.id === activeConvo) ?? conversations[0]

  return (
    <div
      className="bg-white overflow-hidden flex community-inbox"
      style={{ height: 520, border: '1px solid rgba(5,14,36,0.08)', borderRadius: 12 }}
    >
      {/* Conversation list */}
      <div className="w-[320px] flex flex-col flex-shrink-0 community-inbox-list" style={{ borderRight: '1px solid rgba(5,14,36,0.08)' }}>
        <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(5,14,36,0.08)' }}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'rgba(5,14,36,0.4)' }} />
            <input
              type="text"
              placeholder="Search messages..."
              className="w-full outline-none transition-colors"
              style={{
                backgroundColor: '#F9FAFB',
                border: '1px solid rgba(5,14,36,0.08)',
                borderRadius: 10,
                paddingLeft: 36,
                paddingRight: 12,
                paddingTop: 8,
                paddingBottom: 8,
                fontSize: 14,
                fontWeight: 400,
                color: 'rgba(5,14,36,0.65)',
                fontFamily: FONT_FAMILY,
              }}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.map(c => (
            <button
              key={c.id}
              onClick={() => setActiveConvo(c.id)}
              className="w-full flex items-center gap-3 px-4 py-3.5 cursor-pointer border-0 text-left transition-colors"
              style={{
                backgroundColor: activeConvo === c.id ? 'rgba(37,99,235,0.08)' : '#FFFFFF',
              }}
              onMouseEnter={e => { if (activeConvo !== c.id) (e.currentTarget as HTMLElement).style.backgroundColor = '#F9FAFB' }}
              onMouseLeave={e => { if (activeConvo !== c.id) (e.currentTarget as HTMLElement).style.backgroundColor = '#FFFFFF' }}
            >
              <div className="relative flex-shrink-0">
                <Avatar initials={c.initials} size={32} />
                {c.unread && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white" style={{ backgroundColor: '#2563EB' }} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span style={{ fontSize: 14, fontWeight: c.unread ? 600 : 400, color: '#0B1224', fontFamily: FONT_FAMILY }}>
                    {c.name}
                  </span>
                  <span className="flex-shrink-0" style={{ fontSize: 12, fontWeight: 400, color: 'rgba(5,14,36,0.4)', fontFamily: FONT_FAMILY }}>{c.time}</span>
                </div>
                <p className="truncate" style={{ fontSize: 12, fontWeight: 400, color: c.unread ? 'rgba(5,14,36,0.65)' : 'rgba(5,14,36,0.4)', fontFamily: FONT_FAMILY }}>
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
        <div className="flex items-center gap-3 px-5 py-3" style={{ borderBottom: '1px solid rgba(5,14,36,0.08)' }}>
          <Avatar initials={active.initials} size={32} />
          <span style={{ fontSize: 15, fontWeight: 600, color: '#0B1224', fontFamily: FONT_FAMILY }}>{active.name}</span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {active.messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.from === 'me' ? 'justify-end' : 'justify-start'}`}>
              <div
                className="max-w-[75%] px-4 py-2.5"
                style={{
                  borderRadius: msg.from === 'me' ? '16px 16px 6px 16px' : '16px 16px 16px 6px',
                  backgroundColor: msg.from === 'me' ? '#2563EB' : '#F3F4F6',
                  color: msg.from === 'me' ? '#FFFFFF' : '#0B1224',
                }}
              >
                <p className="leading-relaxed" style={{ fontSize: 14, fontWeight: 400, fontFamily: FONT_FAMILY }}>{msg.text}</p>
                <p style={{ fontSize: 11, fontWeight: 400, marginTop: 4, color: msg.from === 'me' ? '#BFDBFE' : 'rgba(5,14,36,0.4)', fontFamily: FONT_FAMILY }}>
                  {msg.time}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="px-4 py-3" style={{ borderTop: '1px solid rgba(5,14,36,0.08)' }}>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Type a message..."
              className="flex-1 outline-none transition-colors"
              style={{
                backgroundColor: '#F9FAFB',
                border: '1px solid rgba(5,14,36,0.08)',
                borderRadius: 10,
                padding: '10px 16px',
                fontSize: 14,
                fontWeight: 400,
                color: 'rgba(5,14,36,0.65)',
                fontFamily: FONT_FAMILY,
              }}
            />
            <button
              onClick={() => toast('Coming soon')}
              className="text-white border-0 cursor-pointer transition-colors flex items-center justify-center"
              style={{ backgroundColor: '#2563EB', borderRadius: 10, padding: 10 }}
            >
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
    <div className="p-8 max-w-[1200px] bg-[#F9FAFB]">
      {/* Header */}
      <div className="mb-6">
        <h1
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: '#0B1224',
            letterSpacing: '-0.02em',
            marginBottom: 4,
          }}
        >
          Feed
        </h1>
        <p style={{ fontSize: 14, fontWeight: 400, color: 'rgba(5,14,36,0.5)' }}>
          Connect with wholesalers, share strategies, and stay updated.
        </p>
      </div>

      {/* Sub-section tabs */}
      <div className="flex items-center gap-1 mb-6 pb-0" style={{ borderBottom: '1px solid rgba(5,14,36,0.08)' }}>
        {tabs.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-2 cursor-pointer bg-transparent transition-colors"
              style={{
                padding: '10px 16px',
                fontSize: 14,
                fontWeight: isActive ? 600 : 400,
                fontFamily: FONT_FAMILY,
                color: isActive ? '#2563EB' : 'rgba(5,14,36,0.45)',
                border: 'none',
                borderBottom: isActive ? '2px solid #2563EB' : '2px solid transparent',
                marginBottom: -1,
              }}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.key === 'inbox' && (
                <span
                  className="text-white flex items-center justify-center rounded-full"
                  style={{
                    backgroundColor: '#2563EB',
                    fontSize: 10,
                    fontWeight: 600,
                    width: 18,
                    height: 18,
                    fontFamily: FONT_FAMILY,
                  }}
                >
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

      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 900px) {
          .community-groups { grid-template-columns: 1fr !important; }
          .community-inbox { flex-direction: column !important; height: auto !important; }
          .community-inbox-list { width: 100% !important; max-height: 250px; border-right: none !important; border-bottom: 1px solid rgba(5,14,36,0.08); }
        }
      ` }} />
    </div>
  )
}
