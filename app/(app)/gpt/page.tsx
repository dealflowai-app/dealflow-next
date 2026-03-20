'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { nanoid } from 'nanoid'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ChatErrorBoundary } from '@/components/chat/ChatErrorBoundary'
import { HistorySidebarSkeleton, ContextSidebarSkeleton, ChatLoadingSkeleton } from '@/components/chat/ChatSkeletons'
import { OfflineBanner } from '@/components/chat/OfflineBanner'
import { useOnlineStatus } from '@/lib/hooks/useOnlineStatus'
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
  Copy,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  Zap,
  Clock,
  CheckCircle2,
  ArrowRight,
  Square,
  RotateCcw,
  MessageSquare,
  Search,
  Pin,
  PinOff,
  Pencil,
  Trash2,
  MoreVertical,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  X,
  Calculator,
  Download,
  StickyNote,
  ArrowUpDown,
  Users,
  Loader2,
  ExternalLink,
  XCircle,
  UserPlus,
  Archive,
  Tag,
  TrendingUp,
  ClipboardList,
  Pause,
  Mail,
  Eye,
  AlertTriangle,
  Coins,
  Share2,
  Link,
  Check,
  ShieldOff,
} from 'lucide-react'

// ── Types ───────────────────────────────────────────────────────────────────

interface ToolCall {
  tool: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result?: any
}

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  toolCalls?: ToolCall[]
}

interface EntityLink {
  name: string
  href: string
}

interface ConversationItem {
  id: string
  title: string
  summary: string | null
  pinned: boolean
  updatedAt: string
  messageCount: number
  shared: boolean
}

interface ActionCard {
  actionType: string
  title: string
  description: string
  params: Record<string, unknown>
  estimatedImpact: string
}

interface ActionCardState {
  card: ActionCard
  status: 'pending' | 'executing' | 'success' | 'error'
  result?: { success: boolean; message: string; link?: string }
}

const actionIcons: Record<string, typeof Send> = {
  // Buyer List
  add_buyer: UserPlus,
  update_buyer: UserPlus,
  unarchive_buyer: UserPlus,
  archive_buyer: Archive,
  tag_buyer: Tag,
  bulk_tag_buyers: Tag,
  score_buyer: TrendingUp,
  rescore_all_buyers: TrendingUp,
  add_buyer_note: StickyNote,
  update_buyer_status: ArrowUpDown,
  merge_buyers: Users,
  export_buyers: Download,
  // Deals
  create_deal: ClipboardList,
  update_deal: ClipboardList,
  delete_deal: Trash2,
  change_deal_status: ArrowUpDown,
  analyze_property: Calculator,
  match_deal: Users,
  send_deal_blast: Send,
  // Marketplace
  list_on_marketplace: Store,
  reactivate_listing: Store,
  pause_listing: Pause,
  post_buyer_board: ClipboardList,
  // Contracts
  generate_contract: FileSignature,
  send_contract: FileSignature,
  void_contract: X,
  // Outreach
  create_campaign: Zap,
  resume_campaign: Zap,
  pause_campaign: Pause,
  send_sms: MessageSquare,
  send_email: Mail,
  // Discovery
  search_properties: Search,
  reveal_contact: Eye,
}

const destructiveActions = new Set([
  'delete_deal',
  'archive_buyer',
  'void_contract',
])

const creditActions = new Set(['reveal_contact'])

// Map link paths to friendly page names
function linkLabel(link: string): string {
  if (link.startsWith('/crm/')) return 'Buyer Profile'
  if (link.startsWith('/deals/')) return 'Deal Details'
  if (link.startsWith('/contracts')) return 'Contract'
  if (link.startsWith('/marketplace')) return 'Marketplace'
  if (link.startsWith('/outreach')) return 'Outreach'
  if (link.startsWith('/analyzer')) return 'Deal Analyzer'
  if (link.startsWith('/discovery')) return 'Discovery'
  return 'View'
}

// Follow-up suggestions after successful actions
const followUpSuggestions: Record<string, { label: string; prompt: string }> = {
  create_deal: { label: 'Run matching?', prompt: 'Match buyers to the deal I just created' },
  match_deal: { label: 'Blast to matched buyers?', prompt: 'Send this deal to the matched buyers' },
  generate_contract: { label: 'Send for signature?', prompt: 'Send the contract for signature' },
  add_buyer: { label: 'Tag this buyer?', prompt: 'Tag the buyer I just added as hot lead' },
  change_deal_status: { label: 'Generate contract?', prompt: 'Generate the assignment contract for this deal' },
  list_on_marketplace: { label: 'Share in chat?', prompt: 'Share a link to my new marketplace listing' },
}

// ── Tool-name-to-friendly-label map ─────────────────────────────────────────

const toolLabels: Record<string, string> = {
  search_buyers: 'Searching buyers…',
  get_buyer_detail: 'Loading buyer profile…',
  search_deals: 'Searching deals…',
  get_deal_detail: 'Analyzing deal…',
  get_campaign_detail: 'Checking campaign…',
  match_buyers_to_deal: 'Matching buyers to deal…',
  get_pipeline_summary: 'Building pipeline summary…',
  search_marketplace: 'Checking marketplace…',
  get_contract_status: 'Looking up contract…',
  get_market_intelligence: 'Analyzing market data…',
  propose_action: 'Preparing action…',
}

// ── Categorized suggested prompts ────────────────────────────────────────────

const promptCategories = [
  {
    label: 'Quick Info',
    prompts: [
      'Give me a full pipeline briefing',
      'Who are my hottest buyers right now?',
      "How's my Phoenix campaign doing?",
    ],
  },
  {
    label: 'Take Action',
    prompts: [
      'Add a new buyer: Marcus Johnson, (602) 555-0199, flips SFR in Phoenix, $150K-$250K range',
      'Submit a deal at 1423 Sunset Blvd, Phoenix AZ, asking $185K',
      'Blast my latest deal to all matched buyers',
    ],
  },
  {
    label: 'Workflow',
    prompts: [
      'Find properties in Tampa, match the best ones to my buyers, and set up a campaign',
      'Close the Elm St deal and generate the assignment contract',
      "Tag all dormant buyers who haven't been contacted in 30+ days as 'going cold'",
    ],
  },
]

// Flat list for backward compat
const suggestedPrompts = promptCategories.flatMap((c) => c.prompts)

// ── Entity link extraction ──────────────────────────────────────────────────

function extractEntityLinks(toolCalls?: ToolCall[]): EntityLink[] {
  if (!toolCalls) return []
  const links: EntityLink[] = []

  for (const tc of toolCalls) {
    const r = tc.result
    if (!r || typeof r !== 'object') continue

    const buyers =
      r.buyers ?? r.matches?.map((m: { buyerId?: string; buyerName?: string; entityName?: string }) => ({
        id: m.buyerId,
        firstName: m.buyerName?.split(' ')[0],
        lastName: m.buyerName?.split(' ').slice(1).join(' '),
        entityName: m.entityName,
      })) ?? []
    for (const b of buyers) {
      const name =
        [b.firstName, b.lastName].filter(Boolean).join(' ') || b.entityName
      if (name && b.id) links.push({ name, href: `/crm/${b.id}` })
      if (b.entityName && b.id && b.entityName !== name)
        links.push({ name: b.entityName, href: `/crm/${b.id}` })
    }

    const deals = r.deals ?? (r.id && r.address ? [r] : [])
    for (const d of deals) {
      if (d.address && d.id) links.push({ name: d.address, href: `/deals/${d.id}` })
    }

    if (r.name && r.id && tc.tool === 'get_campaign_detail') {
      links.push({ name: r.name, href: `/outreach?campaign=${r.id}` })
    }
  }

  return links
}

// ── Custom markdown components with entity linking ──────────────────────────

function buildMarkdownComponents(entityLinks: EntityLink[]): Components {
  const linkMap = new Map<string, string>()
  for (const el of entityLinks) {
    linkMap.set(el.name.toLowerCase(), el.href)
  }

  return {
    strong: ({ children }) => {
      const text = typeof children === 'string' ? children : ''
      const href = linkMap.get(text.toLowerCase())
      if (href) {
        return (
          <a href={href} className="font-semibold text-[#2563EB] hover:underline">
            {children}
          </a>
        )
      }
      return <strong>{children}</strong>
    },
    table: ({ children }) => (
      <div className="overflow-x-auto my-2">
        <table className="min-w-full text-xs border-collapse">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="border-b border-[rgba(5,14,36,0.08)] font-semibold text-[#0B1224]">
        {children}
      </thead>
    ),
    th: ({ children }) => <th className="px-2 py-1.5 text-left">{children}</th>,
    td: ({ children }) => <td className="px-2 py-1.5">{children}</td>,
    a: ({ href, children }) => (
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#2563EB] hover:underline">
        {children}
      </a>
    ),
    code: ({ children, className }) => {
      const isBlock = className?.includes('language-')
      if (isBlock) {
        return (
          <pre className="bg-[#F3F4F6] rounded-lg p-3 my-2 overflow-x-auto text-xs">
            <code>{children}</code>
          </pre>
        )
      }
      return <code className="bg-[#F3F4F6] px-1 py-0.5 rounded text-xs">{children}</code>
    },
  }
}

// ── Sidebar data source type ────────────────────────────────────────────────

interface DataSource {
  label: string
  icon: typeof Contact
  count: number | string
  connected: boolean
}

// ── Conversation grouping helper ────────────────────────────────────────────

function groupConversations(conversations: ConversationItem[]) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86_400_000)
  const weekAgo = new Date(today.getTime() - 7 * 86_400_000)

  const pinned: ConversationItem[] = []
  const todayItems: ConversationItem[] = []
  const yesterdayItems: ConversationItem[] = []
  const thisWeekItems: ConversationItem[] = []
  const olderItems: ConversationItem[] = []

  for (const c of conversations) {
    if (c.pinned) {
      pinned.push(c)
      continue
    }
    const d = new Date(c.updatedAt)
    if (d >= today) todayItems.push(c)
    else if (d >= yesterday) yesterdayItems.push(c)
    else if (d >= weekAgo) thisWeekItems.push(c)
    else olderItems.push(c)
  }

  const groups: { label: string; items: ConversationItem[] }[] = []
  if (pinned.length) groups.push({ label: 'Pinned', items: pinned })
  if (todayItems.length) groups.push({ label: 'Today', items: todayItems })
  if (yesterdayItems.length) groups.push({ label: 'Yesterday', items: yesterdayItems })
  if (thisWeekItems.length) groups.push({ label: 'This Week', items: thisWeekItems })
  if (olderItems.length) groups.push({ label: 'Older', items: olderItems })

  return groups
}

// ── Page component ──────────────────────────────────────────────────────────

export default function DealFlowGPTPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Chat state
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [activeToolCall, setActiveToolCall] = useState<string | null>(null)
  const [activeConversationId, _setActiveConversationId] = useState<string | null>(null)

  // Wrap setter so activeConversationId is always mirrored to sessionStorage
  const setActiveConversationId = useCallback((id: string | null) => {
    _setActiveConversationId(id)
    if (id) {
      try { sessionStorage.setItem('gpt_active_conversation', id) } catch {}
    } else {
      try { sessionStorage.removeItem('gpt_active_conversation') } catch {}
    }
  }, [])
  const [contextOpen, setContextOpen] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())
  const [dislikedIds, setDislikedIds] = useState<Set<string>>(new Set())

  // Action card state — keyed by a unique ID per proposed action
  const [actionCards, setActionCards] = useState<Map<string, ActionCardState>>(new Map())

  // History sidebar state
  const [historyOpen, setHistoryOpen] = useState(true)
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [historySearch, setHistorySearch] = useState('')
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  // Share modal state
  const [shareOpen, setShareOpen] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [shareLoading, setShareLoading] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  const shareRef = useRef<HTMLDivElement>(null)

  // Loading / error states
  const [historyLoading, setHistoryLoading] = useState(true)
  const [contextLoading, setContextLoading] = useState(true)
  const [conversationLoading, setConversationLoading] = useState(false)
  const [streamIncomplete, setStreamIncomplete] = useState<string | null>(null)
  const [lastSendTime, setLastSendTime] = useState(0)
  const isOnline = useOnlineStatus()

  // Sidebar real data
  const [dataSources, setDataSources] = useState<DataSource[]>([
    { label: 'Buyer List', icon: Contact, count: '—', connected: false },
    { label: 'Active Deals', icon: BarChart3, count: '—', connected: false },
    { label: 'Campaigns', icon: PhoneOutgoing, count: '—', connected: false },
    { label: 'Find Buyers Data', icon: Radar, count: '—', connected: false },
    { label: 'Marketplace', icon: Store, count: '—', connected: false },
    { label: 'Contracts', icon: FileSignature, count: '—', connected: false },
  ])
  const [recentActivity, setRecentActivity] = useState<
    Array<{ title: string; createdAt: string }>
  >([])

  // Refs
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // ── Fetch conversation history ────────────────────────────────────────────
  const fetchConversations = useCallback(() => {
    setHistoryLoading(true)
    fetch('/api/chat/conversations?limit=50')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.conversations) setConversations(data.conversations)
      })
      .catch(() => {})
      .finally(() => setHistoryLoading(false))
  }, [])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  // ── Load conversation from URL param or sessionStorage on mount ──────────
  useEffect(() => {
    const cId = searchParams.get('c')
    if (cId) {
      loadConversation(cId)
      return
    }
    // No URL param — try restoring from sessionStorage
    try {
      const stored = sessionStorage.getItem('gpt_active_conversation')
      if (stored) {
        loadConversation(stored)
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Fetch sidebar data on mount ───────────────────────────────────────────
  useEffect(() => {
    setContextLoading(true)
    fetch('/api/dashboard')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.kpis) return
        const k = data.kpis
        setDataSources([
          { label: 'Buyer List', icon: Contact, count: k.buyerCount ?? 0, connected: true },
          { label: 'Active Deals', icon: BarChart3, count: k.activeDeals ?? 0, connected: true },
          { label: 'Campaigns', icon: PhoneOutgoing, count: k.aiCalls ?? 0, connected: true },
          { label: 'Find Buyers Data', icon: Radar, count: '—', connected: true },
          { label: 'Marketplace', icon: Store, count: k.activeListings ?? 0, connected: true },
          { label: 'Contracts', icon: FileSignature, count: (k.contractsDraft ?? 0) + (k.contractsPending ?? 0) + (k.contractsExecuted ?? 0), connected: true },
        ])
        if (data.recentActivity) setRecentActivity(data.recentActivity)
      })
      .catch(() => {})
      .finally(() => setContextLoading(false))
  }, [])

  // ── Close menu on outside click ───────────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null)
      }
    }
    if (menuOpenId) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpenId])

  // ── Cmd/Ctrl+K to focus input ─────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
      if (e.key === 'Escape' && isStreaming) {
        abortRef.current?.abort()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isStreaming])

  // ── Debounced auto-scroll ─────────────────────────────────────────────────
  const scheduleScroll = useCallback(() => {
    if (scrollTimerRef.current) return
    scrollTimerRef.current = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      scrollTimerRef.current = null
    }, 100)
  }, [])

  // ── Save current messages to the DB ──────────────────────────────────────
  const saveMessages = useCallback(
    async (convId: string, msgs: Message[]) => {
      try {
        const payload = msgs
          .filter((m) => m.role !== 'system')
          .map((m) => ({
            role: m.role,
            content: m.content,
            timestamp: m.timestamp.toISOString(),
          }))
        await fetch(`/api/chat/conversations/${convId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: payload }),
        })
      } catch {
        // best-effort
      }
    },
    [],
  )

  // ── Load a conversation ───────────────────────────────────────────────────
  const loadConversation = useCallback(
    async (id: string) => {
      setConversationLoading(true)
      try {
        const res = await fetch(`/api/chat/conversations/${id}`)
        if (!res.ok) {
          // Conversation deleted or not found — clear stale reference
          try { sessionStorage.removeItem('gpt_active_conversation') } catch {}
          router.replace('/gpt', { scroll: false })
          setConversationLoading(false)
          return
        }
        const data = await res.json()

        setActiveConversationId(data.id)
        const msgs: Message[] = (data.messages as Array<{ role: string; content: string; timestamp?: string }>).map(
          (m) => ({
            id: nanoid(),
            role: m.role as 'user' | 'assistant',
            content: m.content,
            timestamp: m.timestamp ? new Date(m.timestamp) : new Date(data.updatedAt),
          }),
        )
        setMessages(msgs)
        router.replace(`/gpt?c=${data.id}`, { scroll: false })

        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'auto' })
        }, 50)
      } catch {
        // Failed to load
      }
    },
    [router],
  )

  // ── Stream a response from the API ────────────────────────────────────────
  const streamResponse = useCallback(
    async (allMessages: Message[]) => {
      setIsStreaming(true)
      setActiveToolCall(null)

      const assistantId = nanoid()
      let created = false
      const toolCalls: ToolCall[] = []

      const controller = new AbortController()
      abortRef.current = controller

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: allMessages
              .filter((m) => m.role !== 'system')
              .map((m) => ({
                role: m.role,
                content: m.content,
                timestamp: m.timestamp.toISOString(),
              })),
            conversationId: activeConversationId,
          }),
          signal: controller.signal,
        })

        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: 'Request failed' }))
          setMessages((prev) => [
            ...prev,
            {
              id: nanoid(),
              role: 'system',
              content: errData.error || `Error ${res.status}`,
              timestamp: new Date(),
            },
          ])
          setIsStreaming(false)
          return
        }

        const reader = res.body!.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        const processLine = (line: string) => {
          if (!line.startsWith('data: ')) return
          const payload = line.slice(6).trim()
          if (!payload) return

          if (payload === '[DONE]') {
            setActiveToolCall(null)
            return
          }

          try {
            const data = JSON.parse(payload)

            if (data.token) {
              if (!created) {
                created = true
                setMessages((prev) => [
                  ...prev,
                  {
                    id: assistantId,
                    role: 'assistant',
                    content: data.token,
                    timestamp: new Date(),
                    toolCalls,
                  },
                ])
              } else {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: m.content + data.token, toolCalls }
                      : m,
                  ),
                )
              }
              scheduleScroll()
            }

            if (data.status === 'calling_tool') {
              setActiveToolCall(data.tool)
              toolCalls.push({ tool: data.tool })
              scheduleScroll()
            }

            // Action card from propose_action tool
            if (data.actionCard) {
              const cardId = nanoid()
              const card: ActionCard = {
                actionType: data.actionCard.actionType,
                title: data.actionCard.title,
                description: data.actionCard.description,
                params: data.actionCard.params,
                estimatedImpact: data.actionCard.estimatedImpact,
              }
              setActionCards((prev) => {
                const next = new Map(prev)
                next.set(cardId, { card, status: 'pending' })
                return next
              })
            }

            // Server sends back the conversationId after auto-save
            if (data.conversationId) {
              setActiveConversationId(data.conversationId)
              router.replace(`/gpt?c=${data.conversationId}`, { scroll: false })
              fetchConversations()
            }

            if (data.error) {
              setMessages((prev) => [
                ...prev,
                {
                  id: nanoid(),
                  role: 'system',
                  content: data.error,
                  timestamp: new Date(),
                },
              ])
            }
          } catch {
            // skip unparseable
          }
        }

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            processLine(line)
          }
        }

        // Flush any remaining data in the buffer after stream ends
        if (buffer.trim()) {
          for (const line of buffer.split('\n')) {
            processLine(line)
          }
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          if (created) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: m.content + '\n\n*Response cancelled.*' }
                  : m,
              ),
            )
          }
        } else {
          if (created) setStreamIncomplete(assistantId)
          setMessages((prev) => [
            ...prev,
            {
              id: nanoid(),
              role: 'system',
              content: 'Response interrupted. Try again.',
              timestamp: new Date(),
            },
          ])
        }
      } finally {
        setIsStreaming(false)
        setActiveToolCall(null)
        abortRef.current = null
      }
    },
    [activeConversationId, scheduleScroll, router, fetchConversations],
  )

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = useCallback(() => {
    const text = input.trim()
    if (!text || isStreaming || !isOnline) return
    if (text.length > 4000) return
    if (Date.now() - lastSendTime < 500) return

    setLastSendTime(Date.now())
    setStreamIncomplete(null)

    const userMsg: Message = {
      id: nanoid(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setInput('')
    streamResponse(updated)
  }, [input, isStreaming, isOnline, lastSendTime, messages, streamResponse])

  // ── Regenerate last response ──────────────────────────────────────────────
  const handleRegenerate = useCallback(
    (assistantMsgId: string) => {
      if (isStreaming) return
      const idx = messages.findIndex((m) => m.id === assistantMsgId)
      if (idx < 1) return
      const truncated = messages.slice(0, idx)
      setMessages(truncated)
      streamResponse(truncated)
    },
    [messages, isStreaming, streamResponse],
  )

  // ── Action card handlers ────────────────────────────────────────────────
  const handleActionConfirm = useCallback(
    async (cardId: string) => {
      const entry = actionCards.get(cardId)
      if (!entry || entry.status !== 'pending') return

      setActionCards((prev) => {
        const next = new Map(prev)
        next.set(cardId, { ...entry, status: 'executing' })
        return next
      })

      try {
        const res = await fetch('/api/chat/actions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            actionType: entry.card.actionType,
            params: entry.card.params,
            conversationId: activeConversationId,
          }),
        })

        const data = await res.json()

        setActionCards((prev) => {
          const next = new Map(prev)
          next.set(cardId, {
            ...entry,
            status: data.success !== false ? 'success' : 'error',
            result: {
              success: data.success !== false,
              message: data.message || (data.error ? `Error: ${data.error}` : 'Action completed'),
              link: data.link,
            },
          })
          return next
        })

        // Add result as assistant message and persist to DB
        const resultMsg: Message = {
          id: nanoid(),
          role: 'assistant',
          content: data.message || data.error || 'Action completed.',
          timestamp: new Date(),
        }
        setMessages((prev) => {
          const updated = [...prev, resultMsg]
          // Persist updated messages to the conversation
          if (activeConversationId) {
            saveMessages(activeConversationId, updated)
            fetchConversations()
          }
          return updated
        })
        scheduleScroll()
      } catch {
        setActionCards((prev) => {
          const next = new Map(prev)
          next.set(cardId, {
            ...entry,
            status: 'error',
            result: { success: false, message: 'Network error. Please try again.' },
          })
          return next
        })
      }
    },
    [actionCards, activeConversationId, scheduleScroll, saveMessages, fetchConversations],
  )

  const handleActionDismiss = useCallback(
    (cardId: string) => {
      setActionCards((prev) => {
        const next = new Map(prev)
        next.delete(cardId)
        return next
      })
      setMessages((prev) => [
        ...prev,
        {
          id: nanoid(),
          role: 'system',
          content: 'Action dismissed.',
          timestamp: new Date(),
        },
      ])
    },
    [],
  )

  // ── New chat ──────────────────────────────────────────────────────────────
  const handleNewChat = () => {
    if (isStreaming) abortRef.current?.abort()
    setMessages([])
    setInput('')
    setActiveToolCall(null)
    setActiveConversationId(null)
    setActionCards(new Map())
    router.replace('/gpt', { scroll: false })
    inputRef.current?.focus()
  }

  // ── Prompt chips ──────────────────────────────────────────────────────────
  const handlePromptChip = (prompt: string) => {
    setInput(prompt)
    inputRef.current?.focus()
  }

  // ── Copy ──────────────────────────────────────────────────────────────────
  const handleCopy = (id: string, content: string) => {
    const plain = content
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/#{1,6}\s/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    navigator.clipboard.writeText(plain)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // ── Like / dislike ────────────────────────────────────────────────────────
  const toggleLike = (id: string) => {
    setLikedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else {
        next.add(id)
        setDislikedIds((p) => { const n = new Set(p); n.delete(id); return n })
      }
      return next
    })
  }
  const toggleDislike = (id: string) => {
    setDislikedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else {
        next.add(id)
        setLikedIds((p) => { const n = new Set(p); n.delete(id); return n })
      }
      return next
    })
  }

  // ── Conversation management ───────────────────────────────────────────────
  const handleRename = async (id: string, newTitle: string) => {
    const trimmed = newTitle.trim()
    if (!trimmed) return
    try {
      await fetch(`/api/chat/conversations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: trimmed }),
      })
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title: trimmed } : c)),
      )
    } catch {
      // silently fail
    }
    setRenamingId(null)
  }

  const handlePin = async (id: string, pinned: boolean) => {
    try {
      await fetch(`/api/chat/conversations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinned }),
      })
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, pinned } : c)),
      )
    } catch {
      // silently fail
    }
    setMenuOpenId(null)
  }

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/chat/conversations/${id}`, { method: 'DELETE' })
      setConversations((prev) => prev.filter((c) => c.id !== id))
      if (activeConversationId === id) {
        handleNewChat()
      }
    } catch {
      // silently fail
    }
    setDeleteConfirmId(null)
    setMenuOpenId(null)
  }

  // ── Sharing ──────────────────────────────────────────────────────────────
  const handleShare = async () => {
    if (!activeConversationId) return
    setShareOpen(true)
    setShareLoading(true)
    setShareCopied(false)
    try {
      const res = await fetch(`/api/chat/conversations/${activeConversationId}/share`, {
        method: 'POST',
      })
      const data = await res.json()
      if (data.shareUrl) {
        setShareUrl(data.shareUrl)
        // Mark conversation as shared in sidebar
        setConversations((prev) =>
          prev.map((c) => (c.id === activeConversationId ? { ...c, shared: true } : c)),
        )
      }
    } catch {
      // silently fail
    }
    setShareLoading(false)
  }

  const handleRevokeShare = async () => {
    if (!activeConversationId) return
    try {
      await fetch(`/api/chat/conversations/${activeConversationId}/share`, {
        method: 'DELETE',
      })
      setShareUrl(null)
      setShareOpen(false)
      setConversations((prev) =>
        prev.map((c) => (c.id === activeConversationId ? { ...c, shared: false } : c)),
      )
    } catch {
      // silently fail
    }
  }

  const handleCopyShareUrl = () => {
    if (!shareUrl) return
    navigator.clipboard.writeText(shareUrl)
    setShareCopied(true)
    setTimeout(() => setShareCopied(false), 2000)
  }

  // Close share popover on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) {
        setShareOpen(false)
      }
    }
    if (shareOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [shareOpen])

  // Reset share state when switching conversations
  useEffect(() => {
    setShareOpen(false)
    setShareUrl(null)
  }, [activeConversationId])

  // ── Keyboard handler ─────────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // ── Auto-resize textarea ─────────────────────────────────────────────────
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = '44px'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }, [input])

  // ── Filter and group conversations ────────────────────────────────────────
  const filteredConversations = historySearch
    ? conversations.filter(
        (c) =>
          c.title.toLowerCase().includes(historySearch.toLowerCase()) ||
          c.summary?.toLowerCase().includes(historySearch.toLowerCase()),
      )
    : conversations

  const grouped = groupConversations(filteredConversations)

  // ── Thinking state ────────────────────────────────────────────────────────
  const lastMsg = messages[messages.length - 1]
  const showThinking = isStreaming && lastMsg?.role === 'user'

  return (
    <ChatErrorBoundary>
    <div className="flex h-full overflow-hidden">
      {/* Skip to input for keyboard users */}
      <a href="#chat-input" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:text-[#2563EB] focus:rounded-md focus:shadow-lg focus:top-2 focus:left-2">
        Skip to chat input
      </a>
      {/* ── History Sidebar ── */}
      <div
        className={`${
          historyOpen ? 'w-[280px]' : 'w-0'
        } transition-all duration-300 overflow-hidden border-r border-[rgba(5,14,36,0.08)] bg-white flex flex-col flex-shrink-0 history-sidebar`}
        role="complementary"
        aria-label="Conversation history"
      >
        {/* History header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(5,14,36,0.08)]">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[#6B7280]" />
            <span className="text-sm font-medium" style={{ color: '#0B1224' }}>History</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleNewChat}
              className="p-1.5 rounded-md hover:bg-[#F3F4F6] transition-colors"
              title="New chat"
            >
              <Plus className="w-4 h-4 text-[#6B7280]" />
            </button>
            <button
              onClick={() => setHistoryOpen(false)}
              className="p-1.5 rounded-md hover:bg-[#F3F4F6] transition-colors"
              title="Close history"
            >
              <PanelLeftClose className="w-4 h-4 text-[#6B7280]" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#9CA3AF] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              placeholder="Search conversations…"
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-[rgba(5,14,36,0.08)] placeholder-[#9CA3AF] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
              style={{ color: 'rgba(5,14,36,0.65)' }}
            />
            {historySearch && (
              <button
                onClick={() => setHistorySearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2"
              >
                <X className="w-3 h-3 text-[#9CA3AF]" />
              </button>
            )}
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {historyLoading && conversations.length === 0 ? (
            <HistorySidebarSkeleton />
          ) : grouped.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <Sparkles className="w-8 h-8 text-[#D1D5DB] mx-auto mb-2" />
              <p className="text-sm text-[#6B7280] mb-1">
                {historySearch ? 'No matching conversations' : 'No conversations yet'}
              </p>
              {!historySearch && (
                <p className="text-xs text-[#9CA3AF]">Start a chat and it&apos;ll show up here</p>
              )}
            </div>
          ) : null}

          {grouped.map((group) => (
            <div key={group.label}>
              <div className="px-4 pt-3 pb-1">
                <span className="text-[10px] font-medium text-[#9CA3AF] uppercase tracking-wider">
                  {group.label}
                </span>
              </div>
              {group.items.map((conv) => (
                <div
                  key={conv.id}
                  className={`group relative mx-2 mb-0.5 rounded-md transition-colors ${
                    activeConversationId === conv.id
                      ? 'bg-[#EFF6FF] border border-[#BFDBFE]'
                      : 'hover:bg-[#F9FAFB] border border-transparent'
                  }`}
                >
                  {renamingId === conv.id ? (
                    <div className="px-3 py-2">
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={() => handleRename(conv.id, renameValue)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRename(conv.id, renameValue)
                          if (e.key === 'Escape') setRenamingId(null)
                        }}
                        className="w-full text-xs px-2 py-1 rounded border border-[#2563EB] focus:outline-none"
                      />
                    </div>
                  ) : (
                    <button
                      onClick={() => loadConversation(conv.id)}
                      className="w-full text-left px-3 py-2"
                    >
                      <div className="flex items-center gap-1.5">
                        {conv.pinned && <Pin className="w-3 h-3 text-[#2563EB] flex-shrink-0" />}
                        {conv.shared && (
                          <span title="This conversation has a share link">
                            <Share2 className="w-3 h-3 text-[#9CA3AF] flex-shrink-0" />
                          </span>
                        )}
                        <span className="text-xs font-medium truncate" style={{ color: '#0B1224' }}>
                          {conv.title}
                        </span>
                      </div>
                      {conv.summary && (
                        <p className="text-[10px] text-[#9CA3AF] truncate mt-0.5">{conv.summary}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-[#9CA3AF]">
                          {conv.messageCount} msgs
                        </span>
                        <span className="text-[10px] text-[#9CA3AF]">
                          {new Date(conv.updatedAt).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                    </button>
                  )}

                  {/* Three-dot menu */}
                  {renamingId !== conv.id && (
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setMenuOpenId(menuOpenId === conv.id ? null : conv.id)
                        }}
                        className="p-1 rounded hover:bg-[#E5E7EB] transition-colors"
                      >
                        <MoreVertical className="w-3.5 h-3.5 text-[#6B7280]" />
                      </button>

                      {menuOpenId === conv.id && (
                        <div
                          ref={menuRef}
                          className="absolute right-0 top-7 w-36 bg-white rounded-[12px] z-50 py-1"
                          style={{ border: '1px solid rgba(5,14,36,0.08)', boxShadow: '0 4px 16px rgba(5,14,36,0.08)' }}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setRenamingId(conv.id)
                              setRenameValue(conv.title)
                              setMenuOpenId(null)
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[#374151] hover:bg-[#F9FAFB]"
                          >
                            <Pencil className="w-3 h-3" /> Rename
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handlePin(conv.id, !conv.pinned)
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[#374151] hover:bg-[#F9FAFB]"
                          >
                            {conv.pinned ? (
                              <><PinOff className="w-3 h-3" /> Unpin</>
                            ) : (
                              <><Pin className="w-3 h-3" /> Pin</>
                            )}
                          </button>
                          <div className="border-t border-[rgba(5,14,36,0.08)] my-1" />
                          {deleteConfirmId === conv.id ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDelete(conv.id)
                              }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 font-medium"
                            >
                              <Trash2 className="w-3 h-3" /> Confirm delete
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setDeleteConfirmId(conv.id)
                              }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-3 h-3" /> Delete
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── Chat Area ── */}
      <div className="flex flex-col flex-1 min-w-0">
        <OfflineBanner />
        {/* Chat Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(5,14,36,0.08)] bg-white">
          <div className="flex items-center gap-3">
            {!historyOpen && (
              <button
                onClick={() => setHistoryOpen(true)}
                className="p-1.5 rounded-md hover:bg-[#F3F4F6] transition-colors mr-1"
                title="Show history"
              >
                <PanelLeftOpen className="w-5 h-5 text-[#6B7280]" />
              </button>
            )}
            <div className="w-9 h-9 rounded-lg bg-[#F3F4F6] flex items-center justify-center">
              <Bot className="w-5 h-5 text-[#6B7280]" />
            </div>
            <div>
              <h1
                style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 700, fontSize: '24px', letterSpacing: '-0.02em', color: '#0B1224' }}
                className="flex items-center gap-2.5"
              >
                Ask AI
              </h1>
              <p style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 400, fontSize: '14px', color: 'rgba(5,14,36,0.5)' }}>AI assistant with full account context</p>
            </div>
            <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1" style={{ background: 'rgba(37,99,235,0.08)', color: '#2563EB' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] animate-pulse" />
              Online
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleNewChat}
              className="text-xs text-[#374151] bg-white border border-[#D1D5DB] flex items-center gap-1 px-3 py-1.5 rounded-[10px] hover:bg-[#F9FAFB] transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              New Chat
            </button>
            {activeConversationId && messages.length > 0 && (
              <div className="relative" ref={shareRef}>
                <button
                  onClick={handleShare}
                  className="text-xs text-[#374151] bg-white border border-[#D1D5DB] flex items-center gap-1 px-3 py-1.5 rounded-[10px] hover:bg-[#F9FAFB] transition-colors"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Share
                </button>
                {shareOpen && (
                  <div className="absolute right-0 top-10 w-80 bg-white rounded-[12px] z-50 p-4" style={{ border: '1px solid rgba(5,14,36,0.08)', boxShadow: '0 4px 16px rgba(5,14,36,0.08)' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <Link className="w-4 h-4 text-[#6B7280]" />
                      <span className="text-sm font-medium" style={{ color: '#0B1224' }}>
                        Share Conversation
                      </span>
                    </div>
                    {shareLoading ? (
                      <div className="flex items-center gap-2 text-xs text-[#9CA3AF] py-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Generating link...
                      </div>
                    ) : shareUrl ? (
                      <>
                        <div className="flex gap-2 mb-3">
                          <input
                            readOnly
                            value={shareUrl}
                            className="flex-1 text-xs px-2.5 py-1.5 rounded-[10px] bg-[#F9FAFB] truncate focus:outline-none"
                            style={{ border: '1px solid rgba(5,14,36,0.08)', color: 'rgba(5,14,36,0.65)' }}
                          />
                          <button
                            onClick={handleCopyShareUrl}
                            className={`px-2.5 py-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition-colors ${
                              shareCopied
                                ? 'bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]'
                                : 'bg-[#2563EB] text-white hover:bg-[#1D4ED8]'
                            }`}
                          >
                            {shareCopied ? (
                              <><Check className="w-3 h-3" /> Copied</>
                            ) : (
                              <><Copy className="w-3 h-3" /> Copy</>
                            )}
                          </button>
                        </div>
                        <p className="text-[10px] text-[#9CA3AF] mb-3">
                          Anyone with this link can view this conversation (read-only).
                        </p>
                        <button
                          onClick={handleRevokeShare}
                          className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 transition-colors"
                        >
                          <ShieldOff className="w-3 h-3" />
                          Revoke Access
                        </button>
                      </>
                    ) : (
                      <p className="text-xs text-red-500">Failed to generate share link.</p>
                    )}
                  </div>
                )}
              </div>
            )}
            <button
              onClick={() => setContextOpen(!contextOpen)}
              className="text-xs text-[#374151] bg-white border border-[#D1D5DB] flex items-center gap-1 px-3 py-1.5 rounded-[10px] hover:bg-[#F9FAFB] transition-colors"
            >
              <Database className="w-3.5 h-3.5" />
              {contextOpen ? 'Hide' : 'Show'} Context
            </button>
          </div>
        </div>

        {/* Messages */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto px-6 py-6 space-y-6 bg-[#FAFBFC]"
          role="log"
          aria-live="polite"
          aria-label="Chat messages"
        >
          {/* Loading skeleton when opening a saved conversation */}
          {conversationLoading && messages.length === 0 && <ChatLoadingSkeleton />}

          {/* Welcome */}
          {messages.length === 0 && !isStreaming && !conversationLoading && (
            <div className="py-8">
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-2xl bg-[#F3F4F6] flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-[#6B7280]" />
                </div>
                <h2
                  style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 700, fontSize: '24px', letterSpacing: '-0.02em', color: '#0B1224' }}
                  className="mb-2"
                >
                  How can I help your deals today?
                </h2>
                <p style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 400, fontSize: '14px', color: 'rgba(5,14,36,0.5)' }} className="max-w-md mx-auto mb-8">
                  I can manage buyers, deals, campaigns, contracts, and more. Ask anything or take action.
                </p>
                <div className="max-w-2xl mx-auto space-y-4">
                  {promptCategories.map((cat) => (
                    <div key={cat.label}>
                      <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'rgba(5,14,36,0.4)' }}>
                        {cat.label}
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {cat.prompts.map((prompt, i) => (
                          <button
                            key={i}
                            onClick={() => handlePromptChip(prompt)}
                            className="text-xs px-3 py-1.5 rounded-full bg-white hover:bg-[#F9FAFB] transition-all text-left"
                            style={{ border: '1px solid rgba(5,14,36,0.08)', color: 'rgba(5,14,36,0.65)' }}
                          >
                            {prompt}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {messages.map((msg) => {
            if (msg.role === 'system') {
              return (
                <div key={msg.id} className="flex justify-center">
                  <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-700 max-w-lg text-center">
                    {msg.content}
                    {msg.content.includes('interrupted') && (
                      <button
                        onClick={() => {
                          const truncated = messages.slice(0, messages.indexOf(msg))
                          setMessages(truncated)
                          streamResponse(truncated)
                        }}
                        className="ml-2 underline hover:no-underline"
                      >
                        Retry
                      </button>
                    )}
                  </div>
                </div>
              )
            }

            const entityLinks = msg.role === 'assistant' ? extractEntityLinks(msg.toolCalls) : []
            const mdComponents = msg.role === 'assistant' ? buildMarkdownComponents(entityLinks) : {}
            const isLastAssistant = msg.role === 'assistant' && msg.id === messages[messages.length - 1]?.id

            return (
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
                        ? 'bg-[#2563EB] text-white rounded-br-md'
                        : 'text-[#0B1224] rounded-bl-md'
                    }`}
                    style={msg.role === 'assistant' ? { background: 'rgba(5,14,36,0.03)', border: '1px solid rgba(5,14,36,0.08)' } : undefined}
                  >
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm max-w-none prose-headings:text-[#0B1224] prose-strong:text-[#0B1224] prose-p:text-[#0B1224]">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                          {msg.content}
                        </ReactMarkdown>
                        {isStreaming && isLastAssistant && (
                          <span className="inline-block w-2 h-4 bg-[#374151] ml-0.5 animate-pulse rounded-sm" />
                        )}
                      </div>
                    ) : (
                      <span className="whitespace-pre-wrap">{msg.content}</span>
                    )}
                  </div>

                  {/* Stream incomplete indicator */}
                  {streamIncomplete === msg.id && (
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                        <AlertTriangle className="w-3 h-3" />
                        Response incomplete
                      </span>
                      <button
                        onClick={() => handleRegenerate(msg.id)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium text-[#2563EB] hover:bg-[#EFF6FF] transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Retry
                      </button>
                      <button
                        onClick={() => {
                          setStreamIncomplete(null)
                          const continueMsg: Message = {
                            id: nanoid(),
                            role: 'user',
                            content: 'Please continue your response from where you left off.',
                            timestamp: new Date(),
                          }
                          const updated = [...messages, continueMsg]
                          setMessages(updated)
                          streamResponse(updated)
                        }}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium text-[#2563EB] hover:bg-[#EFF6FF] transition-colors"
                      >
                        <ArrowRight className="w-3 h-3" />
                        Continue
                      </button>
                    </div>
                  )}

                  {/* Message actions */}
                  <div className={`flex items-center gap-1 mt-1.5 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                    <span className="text-[10px] text-[#9CA3AF] mr-2">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {msg.role === 'assistant' && !isStreaming && (
                      <>
                        <button
                          onClick={() => handleCopy(msg.id, msg.content)}
                          className="p-1 rounded hover:bg-[#F3F4F6] transition-colors"
                          title="Copy"
                        >
                          {copiedId === msg.id ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#2563EB]" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-[#9CA3AF] hover:text-[#374151]" />
                          )}
                        </button>
                        <button
                          onClick={() => toggleLike(msg.id)}
                          className="p-1 rounded hover:bg-[#F3F4F6] transition-colors"
                          title="Helpful"
                        >
                          <ThumbsUp
                            className={`w-3.5 h-3.5 ${
                              likedIds.has(msg.id)
                                ? 'text-[#2563EB] fill-[#2563EB]'
                                : 'text-[#9CA3AF] hover:text-[#374151]'
                            }`}
                          />
                        </button>
                        <button
                          onClick={() => toggleDislike(msg.id)}
                          className="p-1 rounded hover:bg-[#F3F4F6] transition-colors"
                          title="Not helpful"
                        >
                          <ThumbsDown
                            className={`w-3.5 h-3.5 ${
                              dislikedIds.has(msg.id)
                                ? 'text-red-500 fill-red-500'
                                : 'text-[#9CA3AF] hover:text-[#374151]'
                            }`}
                          />
                        </button>
                        <button
                          onClick={() => handleRegenerate(msg.id)}
                          className="p-1 rounded hover:bg-[#F3F4F6] transition-colors"
                          title="Regenerate"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-[#9CA3AF] hover:text-[#374151]" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-1" style={{ background: 'rgba(37,99,235,0.08)' }}>
                    <User className="w-4 h-4 text-[#2563EB]" />
                  </div>
                )}
              </div>
            )
          })}

          {/* Thinking indicator */}
          {showThinking && (
            <div className="flex gap-3" role="status" aria-live="assertive" aria-label="AI is thinking">
              <div className="w-8 h-8 rounded-lg bg-[#F3F4F6] flex items-center justify-center flex-shrink-0 mt-1">
                <Bot className="w-4 h-4 text-[#6B7280]" />
              </div>
              <div>
                <div className="rounded-2xl rounded-bl-md px-4 py-3" style={{ background: 'rgba(5,14,36,0.03)', border: '1px solid rgba(5,14,36,0.08)' }}>
                  <div className="flex items-center gap-2 text-sm text-[#6B7280]">
                    <span>DealFlow AI is thinking</span>
                    <span className="inline-flex gap-0.5">
                      <span className="w-1 h-1 rounded-full bg-[#9CA3AF] animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1 h-1 rounded-full bg-[#9CA3AF] animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1 h-1 rounded-full bg-[#9CA3AF] animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                  </div>
                </div>
                {activeToolCall && (
                  <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs text-blue-700">
                    <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                      <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                    </svg>
                    {toolLabels[activeToolCall] ?? `Running ${activeToolCall}…`}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tool call pill during streaming */}
          {isStreaming && activeToolCall && !showThinking && (
            <div className="pl-11">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs text-blue-700">
                <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                  <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                </svg>
                {toolLabels[activeToolCall] ?? `Running ${activeToolCall}…`}
              </div>
            </div>
          )}

          {/* Action Cards */}
          {Array.from(actionCards.entries()).map(([cardId, entry]) => {
            const Icon = actionIcons[entry.card.actionType] || Zap
            const isDestructive = destructiveActions.has(entry.card.actionType)
            const isCredit = creditActions.has(entry.card.actionType)
            const followUp = followUpSuggestions[entry.card.actionType]

            if (entry.status === 'success' && entry.result) {
              return (
                <div key={cardId} className="pl-11">
                  <div className="rounded-[12px] px-4 py-3 max-w-[75%]" style={{ border: '1px solid rgba(37,99,235,0.2)', background: 'rgba(37,99,235,0.08)' }}>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#2563EB] flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-[#0B1224]">{entry.result.message}</p>
                        {entry.result.link && (
                          <a
                            href={entry.result.link}
                            className="inline-flex items-center gap-1 text-xs text-[#2563EB] hover:text-[#1D4ED8] mt-1.5 font-medium"
                          >
                            View {linkLabel(entry.result.link)} <ArrowRight className="w-3 h-3" />
                          </a>
                        )}
                        {followUp && (
                          <button
                            onClick={() => handlePromptChip(followUp.prompt)}
                            className="mt-2 text-xs px-2.5 py-1 rounded-full bg-white text-[#2563EB] hover:bg-[#EFF6FF] transition-colors"
                            style={{ border: '1px solid rgba(37,99,235,0.2)' }}
                          >
                            {followUp.label}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            }

            if (entry.status === 'error' && entry.result) {
              return (
                <div key={cardId} className="pl-11">
                  <div className="rounded-[12px] border border-red-200 bg-red-50 px-4 py-3 max-w-[75%]">
                    <div className="flex items-start gap-2">
                      <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-red-700">{entry.result.message}</p>
                        <button
                          onClick={() => handleActionConfirm(cardId)}
                          className="text-xs text-red-600 hover:text-red-800 mt-1.5 underline"
                        >
                          Retry
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            }

            // Pending / Executing state
            const borderColor = isDestructive
              ? 'border-red-200'
              : isCredit
                ? 'border-amber-200'
                : 'border-blue-200'
            const bgColor = isDestructive
              ? 'bg-red-50/50'
              : isCredit
                ? 'bg-amber-50/50'
                : 'bg-blue-50/50'
            const iconBg = isDestructive
              ? 'bg-red-100'
              : isCredit
                ? 'bg-amber-100'
                : 'bg-blue-100'
            const iconColor = isDestructive
              ? 'text-red-600'
              : isCredit
                ? 'text-amber-600'
                : 'text-blue-600'

            return (
              <div key={cardId} className="pl-11">
                <div className={`rounded-[12px] border ${borderColor} ${bgColor} px-4 py-4 max-w-[75%]`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-4.5 h-4.5 ${iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-[#0B1224]">{entry.card.title}</h4>
                      <p className="text-xs text-[#4B5563] mt-1">{entry.card.description}</p>
                      {isDestructive && (
                        <div className="flex items-center gap-1 mt-1.5 text-[10px] text-red-600">
                          <AlertTriangle className="w-3 h-3" />
                          This action cannot be easily undone.
                        </div>
                      )}
                      {isCredit && (
                        <div className="flex items-center gap-1 mt-1.5 text-[10px] text-amber-600">
                          <Coins className="w-3 h-3" />
                          {entry.card.estimatedImpact}
                        </div>
                      )}
                      {!isCredit && (
                        <p className="text-[10px] text-[#6B7280] mt-1.5 italic">{entry.card.estimatedImpact}</p>
                      )}
                      <div className="flex items-center gap-2 mt-3">
                        <button
                          onClick={() => handleActionConfirm(cardId)}
                          disabled={entry.status === 'executing'}
                          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[10px] text-xs font-medium text-white disabled:opacity-60 transition-colors ${
                            isDestructive
                              ? 'bg-red-600 hover:bg-red-700'
                              : 'bg-[#2563EB] hover:bg-[#1D4ED8]'
                          }`}
                        >
                          {entry.status === 'executing' ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Executing…
                            </>
                          ) : isDestructive ? (
                            'Confirm Delete'
                          ) : (
                            'Confirm'
                          )}
                        </button>
                        <button
                          onClick={() => handleActionDismiss(cardId)}
                          disabled={entry.status === 'executing'}
                          className={`px-3.5 py-1.5 rounded-[10px] text-xs text-[#6B7280] hover:text-[#374151] disabled:opacity-60 transition-colors ${
                            isDestructive ? 'hover:bg-red-100' : 'hover:bg-blue-100'
                          }`}
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="px-6 py-4 border-t border-[rgba(5,14,36,0.08)] bg-white">
          <div className="flex items-end gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                id="chat-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask AI anything about your deals, buyers, campaigns..."
                aria-label="Message input"
                maxLength={4200}
                rows={1}
                className="w-full resize-none rounded-[10px] px-4 py-3 pr-12 text-sm placeholder-[#9CA3AF] focus:outline-none focus:border-[#2563EB]"
                style={{ background: '#fff', border: '1px solid rgba(5,14,36,0.15)', color: 'rgba(5,14,36,0.65)', fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", minHeight: '44px', maxHeight: '120px' }}
              />
              <div className="absolute right-2 bottom-2 flex items-center gap-1">
                <span className="text-[10px] text-[#9CA3AF] mr-1">
                  {isStreaming ? 'Esc to stop' : '⏎ Send'}
                </span>
              </div>
            </div>
            {isStreaming ? (
              <button
                onClick={() => abortRef.current?.abort()}
                className="w-10 h-10 rounded-[10px] flex items-center justify-center bg-red-500 hover:bg-red-600 text-white transition-all"
                title="Stop generating"
                aria-label="Stop generating"
              >
                <Square className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!input.trim() || !isOnline || input.trim().length > 4000}
                aria-label="Send message"
                className={`w-10 h-10 rounded-[10px] flex items-center justify-center transition-all ${
                  input.trim() && isOnline && input.trim().length <= 4000
                    ? 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white'
                    : 'bg-[#F3F4F6] text-[#9CA3AF] cursor-not-allowed'
                }`}
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
          {input.length > 3500 && (
            <div className={`text-right text-[10px] mt-1 pr-1 ${input.length > 4000 ? 'text-red-500 font-medium' : 'text-[#9CA3AF]'}`}>
              {input.length > 4000 ? 'Message too long — ' : ''}{input.length.toLocaleString()}/4,000
            </div>
          )}
          <p className="text-[10px] mt-2 text-center" style={{ color: 'rgba(5,14,36,0.4)' }}>
            AI responses may not be 100% accurate. Always verify critical deal numbers.
          </p>
        </div>
      </div>

      {/* ── Context Sidebar ── */}
      {contextOpen && (
        <div className="w-[320px] border-l border-[rgba(5,14,36,0.08)] bg-white flex flex-col overflow-y-auto flex-shrink-0 context-sidebar" role="complementary" aria-label="Context data">
          {contextLoading ? (
            <ContextSidebarSkeleton />
          ) : (
          <>
          {/* Connected Data */}
          <div className="px-5 py-4 border-b border-[rgba(5,14,36,0.08)]">
            <h3 className="text-xs font-medium uppercase tracking-[0.05em] mb-3 flex items-center gap-1.5" style={{ color: 'rgba(5,14,36,0.4)' }}>
              <Database className="w-3.5 h-3.5" style={{ color: 'rgba(5,14,36,0.4)' }} />
              Connected Data
            </h3>
            <div className="space-y-2">
              {dataSources.map((src, i) => (
                <div key={i} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2">
                    <src.icon className="w-4 h-4" style={{ color: 'rgba(5,14,36,0.4)' }} />
                    <span className="text-sm" style={{ color: 'rgba(5,14,36,0.65)' }}>{src.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium" style={{ color: 'rgba(5,14,36,0.4)' }}>{src.count}</span>
                    <span className={`w-2 h-2 rounded-full ${src.connected ? 'bg-[#2563EB]' : 'bg-[#D1D5DB]'}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="px-5 py-4 border-b border-[rgba(5,14,36,0.08)]">
            <h3 className="text-xs font-medium uppercase tracking-[0.05em] mb-3 flex items-center gap-1.5" style={{ color: 'rgba(5,14,36,0.4)' }}>
              <Clock className="w-3.5 h-3.5" style={{ color: 'rgba(5,14,36,0.4)' }} />
              Recent Activity
            </h3>
            <div className="space-y-3">
              {recentActivity.length > 0
                ? recentActivity.map((item, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#9CA3AF] mt-1.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs leading-snug" style={{ color: 'rgba(5,14,36,0.65)' }}>{item.title}</p>
                        <p className="text-[10px] mt-0.5" style={{ color: 'rgba(5,14,36,0.4)' }}>
                          {new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  ))
                : Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-start gap-2 animate-pulse">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#E5E7EB] mt-1.5" />
                      <div className="h-3 w-40 bg-[#E5E7EB] rounded" />
                    </div>
                  ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="px-5 py-4 border-b border-[rgba(5,14,36,0.08)]">
            <h3 className="text-xs font-medium uppercase tracking-[0.05em] mb-3 flex items-center gap-1.5" style={{ color: 'rgba(5,14,36,0.4)' }}>
              <Zap className="w-3.5 h-3.5" style={{ color: 'rgba(5,14,36,0.4)' }} />
              Quick Actions
            </h3>
            <div className="space-y-2">
              {promptCategories[0].prompts.slice(0, 2).concat(promptCategories[1].prompts.slice(0, 2)).map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handlePromptChip(prompt)}
                  className="w-full text-left flex items-center justify-between px-3 py-2 rounded-[12px] bg-white hover:bg-[#F9FAFB] transition-all group"
                  style={{ border: '1px solid rgba(5,14,36,0.08)' }}
                >
                  <span className="text-xs truncate" style={{ color: 'rgba(5,14,36,0.65)' }}>{prompt}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#9CA3AF] group-hover:text-[#374151] flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* GPT Info */}
          <div className="px-5 py-4">
            <div className="bg-white rounded-[12px] p-4" style={{ border: '1px solid rgba(5,14,36,0.08)' }}>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-[#9CA3AF]" />
                <span className="text-xs font-medium text-[#9CA3AF]">Powered by AI</span>
              </div>
              <p className="text-[11px] text-[#9CA3AF] leading-relaxed">
                Ask AI analyzes your Buyer List, deals, campaigns, and market data in real-time to provide personalized recommendations and automate your workflow.
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
          </>
          )}
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 1280px) {
          .context-sidebar { display: none; }
        }
        @media (max-width: 768px) {
          .history-sidebar {
            position: fixed;
            left: 0;
            top: 0;
            bottom: 0;
            z-index: 50;
            box-shadow: 4px 0 24px rgba(0,0,0,0.1);
          }
        }
      ` }} />
    </div>
    </ChatErrorBoundary>
  )
}
